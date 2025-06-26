import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'; // Import Supabase client
import type { Message, UserProfile } from '@/lib/types'
import { TUFTI_SYSTEM_PROMPT } from "@/lib/tufti";
import { useAuth } from '@/contexts/AuthContext';

// Define the backend endpoint URL - now relative for SWA
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || '/api/chat';

// Speed for revealing text (milliseconds per word)
const REVEAL_SPEED_MS = 50;

// REMOVE Placeholder user ID
// const TEST_USER_ID = '00000000-0000-0000-0000-000000000001'; 

export function useChat(userProfile: UserProfile) { // Receive UserProfile directly
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(true); // Add loading state
  const [isTyping, setIsTyping] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [chatError, setChatError] = useState<string | null>(null); // <-- Add error state
  const abortControllerRef = useRef<AbortController | null>(null);
  const [isSending, setIsSending] = useState(false); // Add isSending state

  const { session } = useAuth(); // Get the session from AuthContext
  const userId = userProfile.id;

  // Ref to store the ID of the current Supabase conversation
  const conversationIdRef = useRef<string | null>(null);

  // Ref to store the full target text for the current streaming message
  const targetTextRef = useRef<string>("");
  // Ref to store the interval ID for clearing
  const revealIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // Ref to track the index of the currently displayed word
  const currentWordIndexRef = useRef<number>(0);
  // Ref to store the ID of the message being actively streamed
  const streamingMessageIdRef = useRef<string | null>(null);

  const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

  // Helper function to stop the reveal interval
  const stopTextReveal = useCallback(() => {
    if (revealIntervalRef.current) {
      clearInterval(revealIntervalRef.current);
      revealIntervalRef.current = null;
    }
    // Reset refs related to the active stream
    streamingMessageIdRef.current = null;
    currentWordIndexRef.current = 0;
    targetTextRef.current = "";
  }, []); // No dependencies needed as it only uses refs and clearInterval

  // Load chat history on mount or profile change
  useEffect(() => {
    console.log("DEV_LOG: useChat loadHistory effect triggered for user:", userId);
    let isMounted = true; 
    setIsLoadingHistory(true);
    conversationIdRef.current = null; 
    stopTextReveal(); 

    if (!userId) { // Guard against missing userId
        console.error("Attempted to load history without a user ID.");
        setMessages([{ 
            id: generateUniqueId(), // <-- FIX: Use createLocalId()
            text: "Error: Cannot load chat history without user identification.", 
            sender: "system", 
            timestamp: new Date() 
        }]);
        setIsLoadingHistory(false);
        return;
    }

    const loadHistory = async () => {
      console.log('Attempting to load chat history for user:', userId);
      setChatError(null); // Clear previous errors
      setIsLoadingHistory(true); // Ensure loading is true at start
      try {
        // 1. Find the most recent conversation for the user
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('user_id', userId) // Use dynamic userId
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(); 

        if (convError) {
          // Throw an error to be caught by the outer catch block
          throw new Error(`Supabase error fetching conversation: ${convError.message}`);
        }

        if (conversation && isMounted) {
          console.log('Found existing conversation:', conversation.id);
          conversationIdRef.current = conversation.id;

          // 2. Fetch messages for that conversation
          const { data: historyMessages, error: msgError } = await supabase
            .from('messages')
            .select('id, content, sender, created_at') // Select necessary fields
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            // Throw an error to be caught by the outer catch block
            throw new Error(`Supabase error fetching messages: ${msgError.message}`);
          }

          if (historyMessages && historyMessages.length > 0 && isMounted) {
            console.log(`Loaded ${historyMessages.length} messages from history.`);
            
            // Define type for Supabase message structure
            interface SupabaseMessage {
              id: string; 
              content: string;
              sender: 'user' | 'ai';
              created_at: string;
            }

            // Map Supabase messages using the defined type
            const formattedMessages: Message[] = historyMessages.map((msg: SupabaseMessage) => ({
              id: msg.id, // Use the typed string ID
              text: msg.content,
              sender: msg.sender === 'ai' ? 'tufti' : 'user', 
              timestamp: new Date(msg.created_at),
            }));
            setMessages(formattedMessages);
          } else if (isMounted) {
             // Conversation exists but has no messages? Start with welcome.
             console.log('Conversation found but no messages, starting fresh.');
             throw new Error('No messages in conversation'); // Trigger catch block
          }

        } else if (isMounted) {
           // No conversation found for the user
           console.log('No previous conversation found for user.');
           throw new Error('No conversation found'); // Trigger catch block
        }

      } catch (error: any) {
        // Catch errors from Supabase calls or thrown explicitly
        if (isMounted) {
          console.error('Error loading history:', error.message);
          // Set specific error message or fallback welcome message
          if (error.message.includes('No conversation found') || error.message.includes('No messages')) {
          const welcomeMessage: Message = {
                id: generateUniqueId(), // Use local string ID generator
                text: `Ah, welcome ${userProfile.name}! I see you've come seeking guidance about ${userProfile.transformationIntent || 'your journey'}. Let's explore this scene in your reality film together.`,
            sender: "tufti",
            timestamp: new Date()
          };
          setMessages([welcomeMessage]);
              conversationIdRef.current = null;
          } else {
              // Set a generic error message for other failures
              setMessages([]); // Clear messages on error
              setChatError("Failed to load chat history. Please try refreshing.");
          }
        }
      } finally {
        // Always ensure loading is set to false in the finally block
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    // Cleanup function
    return () => {
      isMounted = false;
      // Optional: Abort any Supabase fetch if possible/needed, though usually quick.
    };
  // Rerun when user profile (and thus userId) changes
  }, [userProfile, stopTextReveal, userId]); // Add userId dependency

  // Clean up fetch and interval on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      stopTextReveal();
    };
  }, [stopTextReveal]); // Dependency is correct

  const sendMessage = useCallback(async (text: string) => {
    console.log(`
--- DEV_LOG: sendMessage START ---
Text: "${text}"
User ID: ${userId}
Timestamp: ${new Date().toISOString()}
---
`);
    console.log("DEV_LOG: Current message count inside sendMessage (might be stale):", messages.length);

    if (isSending) { // Prevent duplicate sends
      console.log("DEV_LOG: sendMessage called while already sending. Aborting.");
      return;
    }

    setChatError(null);
    setIsSending(true); // Set sending state
    
    if (!userId) { 
        console.error("Attempted to send message without a user ID.");
        setChatError("Cannot send message: User not identified.");
        return; 
    }

    // Stop any ongoing text reveal from previous message
    stopTextReveal();

    // Abort previous fetch request if any
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Prepare User Message with local string ID
    const userMessageId = generateUniqueId(); 
    const userMessage: Message = { id: userMessageId, text, sender: "user", timestamp: new Date() };

    // Prepare Assistant Placeholder with local string ID
    const assistantMessageId = generateUniqueId();
    const assistantMessagePlaceholder: Message = { id: assistantMessageId, text: '', sender: "tufti", timestamp: new Date() };

    // Update state with both user message and assistant placeholder in a single call
    setMessages(prev => [...prev, userMessage, assistantMessagePlaceholder]);

    // Construct payload for the backend API call with the updated state
    // messagesForBackend will now correctly include the user message and placeholder
    const finalMessagesForBackend = [...messages, userMessage];
    const token = session?.access_token; // Get the access token

    if (!token) {
      throw new Error("No authentication token available.");
    }

    setIsTyping(true);
    setIsGenerating(true);
    streamingMessageIdRef.current = assistantMessageId;
    let currentConversationId = conversationIdRef.current;
    let fullAssistantResponse = "";

    try {
      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          messages: finalMessagesForBackend, 
          conversationId: currentConversationId, // Pass the conversation ID
          userId: userId // Pass the user ID
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.message || response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Failed to get stream reader.");
      }

      let streamHasStarted = false;
      let botReplyMessageId = assistantMessageId; // Use the same ID for chunks
      
      // Corrected SSE parsing loop
      let buffer = '';
      const decoder = new TextDecoder();
      while (true) {
          const { done, value } = await reader.read();
          if (done) {
              setIsTyping(false); // Use local state update
              break;
          }

          if (!streamHasStarted) {
              // Assuming setLoading(false) is not needed here based on useChat structure
              setIsTyping(true); // Use local state update
              streamHasStarted = true;
          }

          // Add the new data to our buffer
          buffer += decoder.decode(value, { stream: true });

          // Process all complete events in the buffer
          let boundary;
          while ((boundary = buffer.indexOf('\n\n')) >= 0) {
              const eventString = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2); // Move past the processed event

              if (eventString.startsWith('data: ')) {
                  try {
                      const jsonData = eventString.slice(6); // Remove 'data: '
                      const parsedData = JSON.parse(jsonData);
                      if (parsedData.content) {
                          setMessages(prevMessages => prevMessages.map(msg =>
                            msg.id === assistantMessageId ? { ...msg, text: msg.text + parsedData.content } : msg
                          ));
                          fullAssistantResponse += parsedData.content; // Accumulate full response for final save
                      }
                  } catch (e) {
                      console.error("Error parsing stream JSON:", e);
                  }
              }
          }
      }

      // 1. Create conversation if it doesn't exist (moved here to ensure currentConversationId is set before saving messages)
      if (!currentConversationId) {
        console.log('No active conversation, creating new one for user:', userId);
        const { data: newConversation, error: createConvError } = await supabase
          .from('conversations')
          .insert({ user_id: userId, title: text.substring(0, 50) })
          .select()
          .single();

        if (createConvError) throw new Error(`Supabase error creating conversation: ${createConvError.message}`);
        if (!newConversation) throw new Error('Failed to create or retrieve new conversation ID.');
        
        console.log('Created new conversation:', newConversation.id);
        conversationIdRef.current = newConversation.id;
        currentConversationId = conversationIdRef.current; // Update local var
      }

      // 2. Save User Message to Supabase
      console.log(`Saving user message to conversation ${currentConversationId}...`);
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({ conversation_id: currentConversationId, content: text, sender: 'user', user_id: userId });

      if (userMsgError) throw new Error(`Supabase error saving user message: ${userMsgError.message}`);
      console.log('User message saved successfully.');

      // 3. Save Assistant Message to Supabase (only once, after stream completes)
      console.log(`Saving assistant message to conversation ${currentConversationId}...`);
      const { error: assistantMsgError } = await supabase
          .from('messages')
          .insert({ conversation_id: currentConversationId, content: fullAssistantResponse, sender: 'ai', user_id: userId });

      if (assistantMsgError) throw new Error(`Supabase error saving assistant message: ${assistantMsgError.message}`);
      console.log('Assistant message saved successfully.');

    } catch (error: any) {
      console.error("DEV_LOG: Error occurred within sendMessage try block:", error);
      // Catch errors from Supabase, fetch, or stream processing
      if (error.name === 'AbortError') {
        console.log('Fetch aborted.');
        setChatError("Message generation cancelled.");
        // Optionally remove the placeholder if desired
        // setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId)); 
       } else {
        console.error('Error during sendMessage process:', error);
        setChatError(`Error: ${error.message || "An unknown error occurred."}`);
        // Ensure the potentially incomplete response is shown with error context
        fullAssistantResponse += `\n[Error: ${error.message || "Failed to complete generation."}]`; 
      }
      // Ensure typing/generating indicators are off even if stream was aborted/ered early
      setIsTyping(false); 
    } finally {
      // This block runs whether try succeeded or failed
      stopTextReveal(); 
      // Final UI update to ensure text is fully displayed, even if error occurred mid-stream
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessageId ? { ...msg, text: fullAssistantResponse } : msg
      ));
      setIsGenerating(false); // Clear generating flag
      streamingMessageIdRef.current = null; 
      abortControllerRef.current = null;
      setIsSending(false); // Clear sending state
      console.log(`
--- DEV_LOG: sendMessage FINALLY block completed ---
Timestamp: ${new Date().toISOString()}
---
`);
      // Note: Supabase saves happen *within* the try block upon success now.
    }

  }, [messages, stopTextReveal, userProfile, userId, isSending, session]); // Added session to dependencies

  const updateMessageFeedback = useCallback((messageId: string, feedback: Message['feedback']) => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ))
    // TODO: Optionally save feedback to Supabase? (Needs schema change)
  }, []); // No dependencies needed

  // --- Retry Message --- 
  const retryLastMessage = useCallback(async () => {
     console.log(`
--- DEV_LOG: retryLastMessage START ---
Timestamp: ${new Date().toISOString()}
---
`);
    // --- Re-enabled --- 
    stopTextReveal(); // Stop any active reveal
    abortControllerRef.current?.abort(); // Abort any ongoing fetch

    // Use functional update to get latest messages for slicing
    let lastUserMessageText = '';
    setMessages(prev => {
      const lastUserMessageIndex = prev.findLastIndex((msg: Message) => msg.sender === 'user');
      if (lastUserMessageIndex !== -1) {
        const messagesToRetry = prev.slice(0, lastUserMessageIndex + 1);
        lastUserMessageText = messagesToRetry[lastUserMessageIndex].text;
        return messagesToRetry; // Set state back to before the failed attempt
      } else {
        console.log("--- DEV_LOG: No last user message found to retry ---");
        return prev; // No change
      }
    });
    
    // Only call sendMessage if we found a message to retry
    if (lastUserMessageText) {
      console.log("--- DEV_LOG: Calling sendMessage from retryLastMessage ---");
      await sendMessage(lastUserMessageText);
    }
  }, [sendMessage, stopTextReveal]);

  // Renamed original clearChat to reflect it only resets frontend state
  const resetFrontendChatState = useCallback(() => {
    setMessages([]);
    setChatError(null);
    setIsTyping(false);
    setIsGenerating(false);
    setIsSending(false);
    conversationIdRef.current = null;
  }, [stopTextReveal]);

  const clearChat = useCallback(async () => {
    setChatError(null); // Clear any existing chat errors
    setIsTyping(false);
    setIsGenerating(false);
    setIsSending(false);
    stopTextReveal();

    if (!userId) {
      console.error("Cannot clear chat: User not identified.");
      setChatError("Failed to clear chat: User not identified.");
      return;
    }

    // If there's an active conversation, mark it as inactive (soft delete)
    if (conversationIdRef.current) {
      console.log('Attempting to mark conversation as inactive:', conversationIdRef.current);
      try {
        const { error: updateError } = await supabase
          .from('conversations')
          .update({ is_active: false })
          .eq('id', conversationIdRef.current);

        if (updateError) {
          throw new Error(`Supabase error marking conversation inactive: ${updateError.message}`);
        }
        console.log('Conversation marked inactive successfully.');
      } catch (error: any) {
        console.error('Error marking conversation inactive:', error.message);
        setChatError(`Failed to clear chat: ${error.message}`);
        return; // Stop if there's an error
      }
    }

    // After successful soft delete (or if no conversation), clear frontend state
    setMessages([]);
    conversationIdRef.current = null; // Ensure conversation ID is reset for new chat
    // Re-add initial welcome message
    const welcomeMessage: Message = {
      id: generateUniqueId(),
      text: `Welcome back, ${userProfile.name}! Ready for another journey into your reality film?`,
      sender: "tufti",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]);

  }, [userId, userProfile.name, stopTextReveal]);

  return {
    messages,
    isLoadingHistory,
    isTyping,
    isGenerating,
    isSending,
    chatError,
    sendMessage,
    updateMessageFeedback,
    retryLastMessage,
    clearChat,
  }
}