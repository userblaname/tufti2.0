import { useState, useCallback, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'; // Import Supabase client
import type { Message, UserProfile } from '@/lib/types'
import { TUFTI_SYSTEM_PROMPT } from "@/lib/tufti";

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

  // Get user ID from the passed profile
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

  // Use string IDs for locally created messages
  const createLocalId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

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
            id: createLocalId(), // <-- FIX: Use createLocalId()
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
                id: createLocalId(), // Use local string ID generator
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

  // Effect to handle the text reveal animation interval
  useEffect(() => {
    // This effect should only run when a message stream *starts*
    // We use streamingMessageIdRef.current as a trigger
    if (streamingMessageIdRef.current === null || revealIntervalRef.current !== null) {
        // No stream active, or interval already running
        return;
    }

    // Function to perform one step of the reveal
    const revealStep = () => {
      setMessages(prevMessages => {
        const streamingMsgId = streamingMessageIdRef.current;
        if (streamingMsgId === null) {
            stopTextReveal(); // Should not happen if interval is running, but safeguard
            return prevMessages;
        }

        const streamingMsgIndex = prevMessages.findIndex(msg => msg.id === streamingMsgId);
        if (streamingMsgIndex === -1) {
           stopTextReveal(); // Message disappeared?
           return prevMessages;
        }

        const targetWords = targetTextRef.current.split(/(\s+)/); // Split by space, keeping spaces
        const currentWordIndex = currentWordIndexRef.current;

        if (currentWordIndex >= targetWords.length) {
           // Reached end of currently known text.
           // Check if stream is finished (isGenerating is false)
           // We need access to isGenerating state here. This might require restructuring
           // or passing isGenerating to this effect's dependencies.
           // For now, assume the interval should stop if it hits the end *and* isGenerating is false.
           // A better approach might be needed.
           // Let's temporarily stop if we hit the end, assuming stream might add more later.
           // The `while (true)` loop finishing sets the final text anyway.
           // stopTextReveal(); // Let's NOT stop here, allow stream to add more
           return prevMessages; // Just wait for more target text
        }

        // Build the text to display up to the current word
        const displayedText = targetWords.slice(0, currentWordIndex + 1).join('');
        currentWordIndexRef.current += 1; // Move to the next word/space

        // Update the specific message
        const updatedMessages = [...prevMessages];
        updatedMessages[streamingMsgIndex] = {
           ...updatedMessages[streamingMsgIndex],
           text: displayedText,
        };
        return updatedMessages;
      });
    };

    // Start the interval
    revealIntervalRef.current = setInterval(revealStep, REVEAL_SPEED_MS);

    // Cleanup function for *this specific effect instance*
    return () => {
        // The main interval cleanup is handled globally by stopTextReveal
        // No cleanup needed here unless this effect itself sets up something temporary
    };
    // Dependency: run when a new stream starts
  }, [streamingMessageIdRef.current, stopTextReveal]); // Depend on the ID and the stop function

  const sendMessage = useCallback(async (text: string) => {
    console.log(`
--- DEV_LOG: sendMessage START ---
Text: "${text}"
User ID: ${userId}
Timestamp: ${new Date().toISOString()}
---
`);
    console.log("DEV_LOG: Current message count inside sendMessage (might be stale):", messages.length);
    setChatError(null);
    
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
    const userMessageId = createLocalId(); 
    const userMessage: Message = { id: userMessageId, text, sender: "user", timestamp: new Date() };

    // Prepare Assistant Placeholder with local string ID
    const assistantMessageId = createLocalId();
    const assistantMessagePlaceholder: Message = { id: assistantMessageId, text: '', sender: "tufti", timestamp: new Date() };

    // Construct payload based on potentially stale messages if needed, or refetch
    let messagesForBackend: Message[] = [];
    setMessages(prev => {
        messagesForBackend = [...prev, userMessage];
        return messagesForBackend; // Return the new state for immediate UI update
    });
    // Add placeholder AFTER user message is added to state
    setMessages(prev => [...prev, assistantMessagePlaceholder]);
    
    setIsTyping(true);
    setIsGenerating(true);
    streamingMessageIdRef.current = assistantMessageId;
    targetTextRef.current = ""; 
    currentWordIndexRef.current = 0;
    let currentConversationId = conversationIdRef.current;
    let fullAssistantResponse = "";

    try {
    // --- Supabase Integration: START ---
    // 1. Create conversation if it doesn't exist
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

      // Update UI immediately AFTER ensuring conversation exists
      setMessages(prev => [...prev, userMessage, assistantMessagePlaceholder]);
      setIsTyping(true);
      streamingMessageIdRef.current = assistantMessageId;
      targetTextRef.current = ""; 
      currentWordIndexRef.current = 0;

      // 2. Save User Message to Supabase
      console.log(`Saving user message to conversation ${currentConversationId}...`);
      const { error: userMsgError } = await supabase
        .from('messages')
        .insert({ conversation_id: currentConversationId, content: text, sender: 'user', user_id: userId });

      if (userMsgError) throw new Error(`Supabase error saving user message: ${userMsgError.message}`);
      console.log('User message saved successfully.');

      // --- Prepare and call Backend API --- 
      const systemPrompt = { role: "system", content: TUFTI_SYSTEM_PROMPT };
      const backendPayload = {
        messages: [
          systemPrompt,
          ...messagesForBackend.map(msg => ({
            role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
          }))
        ]
      };

      console.log("--- DEV_LOG: Preparing to fetch from backend API ---"); // Log before fetch
      const response = await fetch(BACKEND_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
        signal: controller.signal,
      });
      console.log("--- DEV_LOG: Fetch response received (status: ", response.status, ") ---"); // Log after fetch

      setIsTyping(false); // Stop typing indicator once response starts

      if (!response.ok) {
        // Try to get error message from backend response body
        let errorBody = "Unknown error";
        try {
          const jsonError = await response.json();
          errorBody = jsonError.error || response.statusText;
        } catch { 
            errorBody = response.statusText;
        }
        throw new Error(`API request failed: ${response.status} ${errorBody}`);
      }

      if (!response.body) {
        throw new Error('Response body is null');
      }

      // --- Process Stream --- 
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('Stream finished.');
          break;
        }
        buffer += decoder.decode(value, { stream: true });
        let boundary = buffer.indexOf('\n\n');
        while (boundary !== -1) {
            const message = buffer.substring(0, boundary);
            buffer = buffer.substring(boundary + 2);
            if (message.startsWith('data: ')) {
            try {
                    const jsonString = message.substring(6);
                    const data = JSON.parse(jsonString);
                    if (data.error) {
                        console.error("Stream error from backend:", data.error);
                        fullAssistantResponse += `\n[Error: ${data.error}]`; 
                    } else if (data.content) {
                        fullAssistantResponse += data.content;
                        targetTextRef.current = fullAssistantResponse;
              }
                } catch (e) {
                    console.error('Error parsing stream chunk:', e, 'Chunk:', message);
                    // Optionally throw here or append an error to fullAssistantResponse
                }
            }
            boundary = buffer.indexOf('\n\n');
        }
      } // End while(true)

      // Stream finished successfully, now save assistant message
      if (fullAssistantResponse && currentConversationId) {
          console.log(`Saving assistant message to conversation ${currentConversationId}...`);
          const { error: assistantMsgError } = await supabase
              .from('messages')
              .insert({ conversation_id: currentConversationId, content: fullAssistantResponse, sender: 'ai', user_id: userId });

          if (assistantMsgError) throw new Error(`Supabase error saving assistant message: ${assistantMsgError.message}`);
          console.log('Assistant message saved successfully.');
      }

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
      // Ensure typing/generating indicators are off even if stream was aborted/errored early
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
      console.log(`
--- DEV_LOG: sendMessage FINALLY block completed ---
Timestamp: ${new Date().toISOString()}
---
`);
      // Note: Supabase saves happen *within* the try block upon success now.
    }

  }, [messages, stopTextReveal, userProfile, userId]);

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
    stopTextReveal();
    abortControllerRef.current?.abort();
    const welcomeMessage: Message = {
      id: createLocalId(),
      text: `Ah, welcome ${userProfile.name}! I see you've come seeking guidance about ${userProfile.transformationIntent || 'your journey'}. Let's explore this scene in your reality film together.`,
      sender: "tufti",
      timestamp: new Date()
    };
    setMessages([welcomeMessage]); 
    conversationIdRef.current = null;
    setIsLoadingHistory(false); 
    setChatError(null); // Also clear errors on reset
    console.log('Frontend chat state reset.');
  }, [stopTextReveal, userProfile]);

  // --- New Function: Delete Conversation --- 
  const deleteCurrentConversation = useCallback(async () => {
    const conversationId = conversationIdRef.current;
    if (!conversationId) {
      console.warn("Attempted to delete conversation, but no conversation ID is set.");
      setChatError("No active conversation to delete.");
      return;
    }

    // Confirmation Dialog
    if (!window.confirm("Are you sure you want to permanently delete this conversation and all its messages?")) {
      return; // User cancelled
    }

    console.log(`Attempting to delete conversation: ${conversationId}`);
    setChatError(null); // Clear previous errors
    // Optionally set a loading state here if needed
    // setIsLoadingHistory(true); 

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      console.log(`Conversation ${conversationId} deleted successfully.`);
      // Reset frontend state after successful deletion
      resetFrontendChatState(); 

    } catch (error: any) {
      console.error("Error deleting conversation:", error.message);
      setChatError(`Failed to delete conversation: ${error.message}`);
      // Optionally reset loading state here if set
      // setIsLoadingHistory(false);
    }

  }, [resetFrontendChatState]); // Dependency on the reset function

  return {
    messages,
    isLoadingHistory, // Expose history loading state
    isTyping,
    isGenerating,
    chatError, // <-- Return error state
    sendMessage,
    updateMessageFeedback,
    retryLastMessage,
    clearChat: deleteCurrentConversation, // Expose delete function as clearChat
    // OR: expose both if needed: deleteCurrentConversation, resetFrontendChatState
  }
}