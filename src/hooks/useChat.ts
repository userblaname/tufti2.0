// src/hooks/useChat.ts

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAiResponse, AgentEvent } from '@/lib/chat-service';
import type { Message, UserProfile } from '@/lib/types';
import { onboardingScript, OnboardingQuestion } from '@/lib/onboardingQuestions';
import { TUFTI_SYSTEM_PROMPT } from '@/lib/tufti';
import {
  getOrCreateConversation,
  saveMessage,
  fetchMessages,
  fetchMessagesPaginated,
  archiveConversation
} from '@/lib/supabase/conversations'
import { backupMessagesToLocal, getBackupMessages } from '@/lib/messageBackup'

// A simple local ID generator for messages created on the client
const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

const CONV_CACHE_PREFIX = 'tufti_conversation_';

// Image data type for uploads
type ImageData = {
  data: string
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
}

export function useChat(userProfile: UserProfile) {
  const { updateProfileAndCompleteOnboarding, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);

  // Use userProfile.onboarding_complete directly - more reliable than context
  const userIsOnboarded = userProfile.onboarding_complete === true;
  const [isLoadingHistory, setIsLoadingHistory] = useState(userIsOnboarded);
  const [hideSuggestions, setHideSuggestions] = useState<boolean>(() => {
    try { return localStorage.getItem('hide_suggestions') === '1' } catch { return false }
  })

  // --- Onboarding State ---
  const [isOnboarding, setIsOnboarding] = useState(!userIsOnboarded);
  const [onboardingStep, setOnboardingStep] = useState(userIsOnboarded ? -1 : 1);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState<OnboardingQuestion | null>(null);

  // --- Regular Chat State ---
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // --- Thinking Mode State --- (persisted to localStorage)
  const [isThinkingEnabled, setIsThinkingEnabled] = useState(() => {
    try { return localStorage.getItem('tufti_thinking_mode') === '1' } catch { return false }
  });
  const [isThinking, setIsThinking] = useState(false);
  const [isDeepResearchEnabled, setIsDeepResearchEnabled] = useState(() => {
    try { return localStorage.getItem('tufti_deep_research') === '1' } catch { return true }
  });

  // --- Deep Experiment Mode State --- (persisted to localStorage)
  const [isDeepExperimentEnabled, setIsDeepExperimentEnabled] = useState(() => {
    try { return localStorage.getItem('tufti_deep_experiment') === '1' } catch { return false }
  });

  // --- Abort Controller for Cancel Generation ---
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track if we've already hydrated messages to prevent re-fetching on tab switch
  // This works now because AuthContext fix prevents Chat from unmounting
  const hasHydratedRef = useRef(false);

  // --- Pagination State ---
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const oldestLoadedTimestamp = useRef<string | null>(null);

  // ⚠️ CRITICAL: Backup messages to localStorage on every change
  // This prevents data loss if Supabase fails or connection drops
  useEffect(() => {
    if (messages.length > 0) {
      backupMessagesToLocal(messages);
    }
  }, [messages]);

  // Save to Supabase helper
  const saveToSupabase = useCallback(async (role: 'user' | 'tufti', content: string) => {
    console.log('🔴🔴🔴 saveToSupabase CALLED 🔴🔴🔴', { role, contentLen: content?.length });

    const userId = userProfile.id;
    if (!userId) {
      console.warn('[useChat] Cannot save message - no user ID');
      return;
    }

    try {
      const cacheKey = `${CONV_CACHE_PREFIX}${userId}`;
      let conversationId = localStorage.getItem(cacheKey);

      if (!conversationId) {
        console.log('[useChat] No cached conversation ID, fetching from Supabase...');
        conversationId = await getOrCreateConversation(userId);
        if (conversationId) {
          localStorage.setItem(cacheKey, conversationId);
          console.log('[useChat] Saved new conversation ID to cache:', conversationId.substring(0, 8));
        }
      }

      if (conversationId) {
        console.log('[useChat] Saving message to Supabase:', { role, convId: conversationId.substring(0, 8), contentLen: content.length });
        const result = await saveMessage({ conversationId, userId, role, text: content });

        if (!result.ok) {
          console.error('[useChat] ❌ Failed to save message:', result.error);

          if ((result.error as any)?.code === '42501') {
            console.log('[useChat] RLS error detected, retrying with fresh conversation ID...');
            const freshConvId = await getOrCreateConversation(userId);
            if (freshConvId) {
              localStorage.setItem(cacheKey, freshConvId);
              const retryResult = await saveMessage({ conversationId: freshConvId, userId, role, text: content });
              if (retryResult.ok) {
                console.log('[useChat] ✅ Retry successful - message saved');
              } else {
                console.error('[useChat] ❌ Retry also failed:', retryResult.error);
              }
            }
          }
        } else {
          console.log('[useChat] ✅ Message saved successfully');
        }
      } else {
        console.error('[useChat] ❌ No conversation ID available - message NOT saved!');
      }
    } catch (e) {
      console.error(`[useChat] ❌ Exception saving ${role} message:`, e);
    }
  }, [userProfile.id]);

  // Effect to hydrate messages from the CURRENT conversation only
  // Only runs once per session - prevents re-fetching on tab switch (TOKEN_REFRESHED)
  useEffect(() => {
    (async () => {
      const userId = session?.user?.id;
      console.log('[useChat] Hydrating conversation history...', { userId, userIsOnboarded, alreadyHydrated: hasHydratedRef.current });

      // Skip if already hydrated to prevent refresh on tab switch
      if (hasHydratedRef.current) {
        console.log('[useChat] Skipping hydration - already loaded');
        return;
      }

      if (!userId || !userIsOnboarded) {
        setIsLoadingHistory(false);
        return;
      }

      setIsLoadingHistory(true);
      const cacheKey = `${CONV_CACHE_PREFIX}${userId}`;

      try {
        // ALWAYS get the latest active conversation from Supabase (don't trust cache alone)
        // This ensures we load today's messages even if cache points to old conversation
        let conversationId = await getOrCreateConversation(userId);
        const cachedId = localStorage.getItem(cacheKey);

        // Update cache if it's different
        if (conversationId && conversationId !== cachedId) {
          console.log('[useChat] Updating cached conversation from', cachedId?.substring(0, 8), 'to', conversationId?.substring(0, 8));
          localStorage.setItem(cacheKey, conversationId);
        } else if (!conversationId && cachedId) {
          // Fallback to cache if Supabase fails
          conversationId = cachedId;
        }

        if (conversationId) {
          // Fetch only the LAST 50 messages for fast initial load (pagination)
          const { messages: rows, hasMore } = await fetchMessagesPaginated(conversationId, 50);
          console.log('[useChat] Fetched messages (paginated):', conversationId.substring(0, 8), 'count:', rows?.length || 0, 'hasMore:', hasMore);

          if (rows && rows.length > 0) {
            const mappedMessages = rows.map(r => ({
              id: r.id,
              text: r.text,
              sender: r.role === 'user' ? 'user' : 'tufti',
              timestamp: new Date(r.created_at)
            } as Message));

            setMessages(mappedMessages);
            setHasMoreMessages(hasMore);
            // Track oldest loaded message for cursor pagination
            oldestLoadedTimestamp.current = rows[0].created_at;
          } else {
            // No messages from Supabase - try localStorage backup
            console.log('[useChat] No Supabase messages, checking localStorage backup...');
            const backupMessages = getBackupMessages();
            if (backupMessages.length > 0) {
              console.log('[useChat] ✅ Restored', backupMessages.length, 'messages from localStorage backup');
              setMessages(backupMessages);
              setHasMoreMessages(false); // Backup messages are local, no more to load
            }
          }
        } else {
          // No conversation ID - try localStorage backup
          const backupMessages = getBackupMessages();
          if (backupMessages.length > 0) {
            console.log('[useChat] ✅ Restored', backupMessages.length, 'messages from localStorage backup (no conv ID)');
            setMessages(backupMessages);
            setHasMoreMessages(false);
          }
        }

        // Mark as hydrated to prevent re-fetching on tab switch
        hasHydratedRef.current = true;
      } catch (err) {
        console.error('[useChat] Error hydrating messages:', err);
        // Try localStorage backup on error
        const backupMessages = getBackupMessages();
        if (backupMessages.length > 0) {
          console.log('[useChat] ✅ Restored', backupMessages.length, 'messages from localStorage backup (error fallback)');
          setMessages(backupMessages);
        }
      } finally {
        setIsLoadingHistory(false);
      }
    })()
  }, [session?.user?.id, userIsOnboarded])

  // Effect to drive the onboarding conversation
  useEffect(() => {
    if (!isOnboarding) return;

    const question = onboardingScript.find(q => q.step === onboardingStep);

    if (question) {
      setCurrentQuestion(question);
      setTimeout(() => {
        const tuftiPrompt = typeof question.prompt === 'function'
          ? question.prompt(onboardingAnswers.name || userProfile.name || 'Director')
          : question.prompt;

        const tuftiMessage: Message = {
          id: generateUniqueId(),
          text: tuftiPrompt,
          sender: 'tufti',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, tuftiMessage]);
      }, 700);
    } else if (onboardingStep === -1) {
      setIsGenerating(true);
      const finalBriefingMessage: Message = {
        id: generateUniqueId(),
        text: "Thank you. I am calibrating the film... Please give me a moment.",
        sender: 'tufti',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, finalBriefingMessage]);

      ; (updateProfileAndCompleteOnboarding as any)({ name: onboardingAnswers.name }, onboardingAnswers)
        .then(() => {
          setIsOnboarding(false);
          setIsGenerating(false);
          const welcomeMessage: Message = {
            id: generateUniqueId(),
            text: `Perfect. The scene is set, ${onboardingAnswers.name}. The camera is rolling. What shall we focus on first?`,
            sender: 'tufti',
            timestamp: new Date()
          };
          setMessages(prev => [...prev, welcomeMessage]);
        })
        .catch((err: unknown) => {
          setChatError("There was an issue setting up your profile. Please try refreshing the page.");
          console.error(err);
        });
    }
  }, [isOnboarding, onboardingStep, onboardingAnswers.name, userProfile.name]);

  const handleOnboardingAnswer = useCallback((answerValue: string, answerLabel: string, nextStep: number) => {
    if (!currentQuestion) return;

    const userAnswerMessage: Message = {
      id: generateUniqueId(),
      text: answerLabel,
      sender: 'user',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userAnswerMessage]);

    setOnboardingAnswers(prev => ({ ...prev, [currentQuestion.key]: answerValue }));
    setOnboardingStep(nextStep);
  }, [currentQuestion]);

  const sendMessage = useCallback(async (text: string, images?: ImageData[]) => {
    if (isSending) return;

    // During onboarding, route to onboarding flow
    if (isOnboarding) {
      if (currentQuestion) {
        handleOnboardingAnswer(text, text, currentQuestion.nextStep);
      }
      return;
    }

    // Capture thinking mode state
    const shouldUseThinking = isThinkingEnabled;
    console.log('[useChat] sendMessage called with thinking mode:', shouldUseThinking);

    setIsSending(true);
    setChatError(null);
    setIsGenerating(true);
    setIsThinking(shouldUseThinking);

    const userMessage: Message = {
      id: generateUniqueId(),
      text,
      sender: 'user',
      timestamp: new Date(),
      images: images
    };
    setMessages(prev => [...prev, userMessage]);

    // Save user message
    saveToSupabase('user', text);

    // Unlock input immediately after user message is added
    // User can now type while AI generates (isGenerating blocks sending, not typing)
    setIsSending(false);

    // Fetch FULL conversation history from Supabase for AI context
    // This ensures AI has complete memory, even though UI shows only 50 messages
    let conversationHistory: Message[] = [userMessage];
    try {
      const cacheKey = `${CONV_CACHE_PREFIX}${userProfile.id}`;
      const conversationId = localStorage.getItem(cacheKey);
      if (conversationId) {
        const fullHistory = await fetchMessages(conversationId);
        const mappedHistory = fullHistory.map(r => ({
          id: r.id,
          text: r.text,
          sender: r.role === 'user' ? 'user' : 'tufti',
          timestamp: new Date(r.created_at)
        } as Message));
        conversationHistory = [...mappedHistory, userMessage];
        console.log('[useChat] Loaded full history for AI context:', fullHistory.length, 'messages');
      }
    } catch (err) {
      console.warn('[useChat] Could not fetch full history, using current messages:', err);
      conversationHistory = [...messages, userMessage];
    }

    // Optimistic Tufti Message for streaming
    const tempId = generateUniqueId();
    const optimisticAiMessage: Message = {
      id: tempId,
      text: '',
      sender: 'tufti',
      timestamp: new Date(),
      thoughts: ''
    };
    setMessages(prev => [...prev, optimisticAiMessage]);

    try {
      const profileName = userProfile?.name || userProfile?.onboarding_answers?.name
      const profileLine = profileName ? `User name: ${profileName}. Address the user by this name when appropriate.\n` : ''
      const systemPrompt = (userProfile.persona_briefing
        ? `${userProfile.persona_briefing}\n\n---\n\n${TUFTI_SYSTEM_PROMPT}`
        : TUFTI_SYSTEM_PROMPT)

      const now = new Date()
      const timeString = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short'
      })
      const timeContext = `\n[TEMPORAL CONTEXT]\nCurrent User Time: ${timeString}\n`

      const finalSystemPrompt = `${profileLine}${timeContext}${systemPrompt}`

      const messagesForApi = [
        { role: 'system', content: finalSystemPrompt },
        ...conversationHistory.map(msg => ({
          content: msg.text,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp // Include timestamp for temporal awareness
        }))
      ];

      console.log('[useChat] Calling getAiResponse with thinking enabled:', shouldUseThinking);
      console.log('[useChat] Deep Experiment enabled:', isDeepExperimentEnabled);

      // Create fresh AbortController for this request
      abortControllerRef.current = new AbortController();

      const aiReply = await getAiResponse(
        messagesForApi as any,
        (textChunk) => {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, text: m.text + textChunk } : m
          ));
        },
        (thinkingChunk) => {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, thoughts: (m.thoughts || '') + thinkingChunk } : m
          ));
        },
        shouldUseThinking,
        isDeepResearchEnabled,
        userProfile.id,
        images,
        abortControllerRef.current.signal,
        // Multi-agent event handler
        (event: AgentEvent) => {
          if (event.type === 'agent_start') {
            // Add new agent thinking section
            setMessages(prev => prev.map(m => {
              if (m.id === tempId) {
                const existingAgents = m.agentThoughts || [];
                return {
                  ...m,
                  agentThoughts: [...existingAgents, {
                    agentName: event.agent?.name || 'Unknown',
                    agentEmoji: event.agent?.emoji || '🤖',
                    phase: event.agent?.phase || 0,
                    thinking: '',
                    isComplete: false
                  }]
                };
              }
              return m;
            }));
          }

          if (event.type === 'agent_thinking' && event.thinking) {
            // Append thinking to current agent
            setMessages(prev => prev.map(m => {
              if (m.id === tempId && m.agentThoughts?.length) {
                const updatedAgents = [...m.agentThoughts];
                const lastAgent = updatedAgents[updatedAgents.length - 1];
                lastAgent.thinking += event.thinking;
                return { ...m, agentThoughts: updatedAgents };
              }
              return m;
            }));
          }

          if (event.type === 'agent_complete') {
            // Mark current agent as complete
            setMessages(prev => prev.map(m => {
              if (m.id === tempId && m.agentThoughts?.length) {
                const updatedAgents = [...m.agentThoughts];
                const lastAgent = updatedAgents[updatedAgents.length - 1];
                lastAgent.isComplete = true;
                if (event.summary) {
                  lastAgent.summary = event.summary;
                }
                return { ...m, agentThoughts: updatedAgents };
              }
              return m;
            }));
          }

          // --- Experiment Mode Event Handlers ---
          if (event.type === 'experiment_pass_start') {
            setMessages(prev => prev.map(m => {
              if (m.id === tempId) {
                const existingAgents = m.agentThoughts || [];
                return {
                  ...m,
                  agentThoughts: [...existingAgents, {
                    agentName: event.pass?.name || `Pass ${event.pass?.phase}`,
                    agentEmoji: event.pass?.emoji || '🔬',
                    phase: event.pass?.phase || 0,
                    thinking: '',
                    isComplete: false
                  }]
                };
              }
              return m;
            }));
          }

          if (event.type === 'experiment_thinking' && event.thinking) {
            setMessages(prev => prev.map(m => {
              if (m.id === tempId && m.agentThoughts?.length) {
                const updatedAgents = [...m.agentThoughts];
                const lastAgent = updatedAgents[updatedAgents.length - 1];
                lastAgent.thinking += event.thinking;
                return { ...m, agentThoughts: updatedAgents };
              }
              return m;
            }));
          }

          if (event.type === 'experiment_pass_complete') {
            setMessages(prev => prev.map(m => {
              if (m.id === tempId && m.agentThoughts?.length) {
                const updatedAgents = [...m.agentThoughts];
                const lastAgent = updatedAgents[updatedAgents.length - 1];
                lastAgent.isComplete = true;
                return { ...m, agentThoughts: updatedAgents };
              }
              return m;
            }));
          }

          if (event.type === 'experiment_error') {
            setMessages(prev => prev.map(m => {
              if (m.id === tempId && m.agentThoughts?.length) {
                const updatedAgents = [...m.agentThoughts];
                const lastAgent = updatedAgents[updatedAgents.length - 1];
                lastAgent.isComplete = true;
                lastAgent.thinking += `\n\n❌ Error: ${event.error || 'Unknown error occurred'}`;
                return { ...m, agentThoughts: updatedAgents };
              }
              return m;
            }));
          }
        },
        isDeepExperimentEnabled
      );

      // Save AI response to Supabase
      if (aiReply) {
        await saveToSupabase('tufti', aiReply);
      }

    } catch (error: any) {
      // Ignore abort errors - they are expected when user cancels
      if (error.name === 'AbortError') {
        console.log('[useChat] Generation was cancelled by user');
        return;
      }
      setChatError(error.message || "An error occurred.");
      setMessages(prev => prev.filter(m => m.id !== tempId || m.text.length > 0));
    } finally {
      abortControllerRef.current = null;
      setIsTyping(false);
      setIsGenerating(false);
      setIsThinking(false);
      setIsSending(false);
    }
  }, [isSending, messages, userProfile, session, saveToSupabase, isThinkingEnabled, isOnboarding, currentQuestion, handleOnboardingAnswer]);

  // Cancel ongoing generation
  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      console.log('[useChat] Cancelling generation...');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;

      // Handle the optimistic AI message
      setMessages(prev => {
        const lastMessage = prev[prev.length - 1];

        // If the last message is from Tufti and has no content, remove it
        if (lastMessage && lastMessage.sender === 'tufti' && !lastMessage.text?.trim()) {
          console.log('[useChat] Removing empty AI message after cancellation');
          return prev.slice(0, -1);
        }

        // If it has partial content, mark it as stopped
        if (lastMessage && lastMessage.sender === 'tufti' && lastMessage.text) {
          console.log('[useChat] Marking partial AI message as stopped');
          return prev.map((m, i) =>
            i === prev.length - 1
              ? { ...m, text: m.text + '\n\n*[Generation stopped]*' }
              : m
          );
        }

        return prev;
      });

      setIsTyping(false);
      setIsGenerating(false);
      setIsThinking(false);
      setIsSending(false);
    }
  }, []);

  // Toggle thinking mode (persisted to localStorage)
  const toggleThinkingMode = useCallback(() => {
    setIsThinkingEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        setIsDeepResearchEnabled(false);
        setIsDeepExperimentEnabled(false); // Disable Experiment
      }
      try { localStorage.setItem('tufti_thinking_mode', newValue ? '1' : '0') } catch { }
      return newValue;
    });
  }, []);

  const toggleDeepResearch = useCallback(() => {
    setIsDeepResearchEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        setIsThinkingEnabled(false);
        setIsDeepExperimentEnabled(false); // Disable Experiment
      }
      try { localStorage.setItem('tufti_deep_research', newValue ? '1' : '0') } catch { }
      return newValue;
    });
  }, []);

  // Toggle Deep Experiment mode (persisted to localStorage)
  const toggleDeepExperiment = useCallback(() => {
    setIsDeepExperimentEnabled(prev => {
      const newValue = !prev;
      if (newValue) {
        setIsThinkingEnabled(false); // Disable Presence
        setIsDeepResearchEnabled(false); // Disable Oracle
      }
      try { localStorage.setItem('tufti_deep_experiment', newValue ? '1' : '0') } catch { }
      return newValue;
    });
  }, []);

  // Edit a message and regenerate AI response
  const editMessage = useCallback(async (messageId: string, newText: string) => {
    // Find the message index
    const messageIndex = messages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return;

    const editedMessage = messages[messageIndex];

    // Only user messages should trigger regeneration
    if (editedMessage.sender !== 'user') {
      // For AI messages, just update the text without regeneration
      setMessages(prev => prev.map(m =>
        m.id === messageId ? { ...m, text: newText } : m
      ));
      return;
    }

    console.log('[useChat] Edit and regenerate triggered for message:', messageId);

    // Truncate messages: keep only messages up to and including the edited one (with new text)
    const truncatedMessages = messages.slice(0, messageIndex).concat({
      ...editedMessage,
      text: newText
    });

    setMessages(truncatedMessages);

    // ⚠️ CRITICAL: Save the edited user message to Supabase
    // Without this, the edited message is only in React state and lost on refresh
    console.log('[useChat] Saving edited message to Supabase:', newText.substring(0, 50));
    await saveToSupabase('user', newText);

    // Now trigger AI response for the edited message
    setIsSending(true);
    setChatError(null);
    setIsGenerating(true);
    setIsThinking(isThinkingEnabled);

    // Optimistic Tufti Message for streaming
    const tempId = generateUniqueId();
    const optimisticAiMessage: Message = {
      id: tempId,
      text: '',
      sender: 'tufti',
      timestamp: new Date(),
      thoughts: ''
    };
    setMessages(prev => [...prev, optimisticAiMessage]);

    try {
      const profileName = userProfile?.name || userProfile?.onboarding_answers?.name;
      const profileLine = profileName ? `User name: ${profileName}. Address the user by this name when appropriate.\n` : '';
      const systemPrompt = userProfile.persona_briefing
        ? `${userProfile.persona_briefing}\n\n---\n\n${TUFTI_SYSTEM_PROMPT}`
        : TUFTI_SYSTEM_PROMPT;

      const now = new Date();
      const timeString = now.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        timeZoneName: 'short'
      });
      const timeContext = `\n[TEMPORAL CONTEXT]\nCurrent User Time: ${timeString}\n`;
      const finalSystemPrompt = `${profileLine}${timeContext}${systemPrompt}`;

      // Build conversation history from truncated messages (including the edited one)
      const conversationHistory = truncatedMessages;
      const messagesForApi = [
        { role: 'system', content: finalSystemPrompt },
        ...conversationHistory.map(msg => ({
          content: msg.text,
          role: msg.sender === 'user' ? 'user' : 'assistant',
          timestamp: msg.timestamp
        }))
      ];

      console.log('[useChat] Regenerating response for edited message');

      // Create fresh AbortController for this request
      abortControllerRef.current = new AbortController();

      const aiReply = await getAiResponse(
        messagesForApi as any,
        (textChunk) => {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, text: m.text + textChunk } : m
          ));
        },
        (thinkingChunk) => {
          setMessages(prev => prev.map(m =>
            m.id === tempId ? { ...m, thoughts: (m.thoughts || '') + thinkingChunk } : m
          ));
        },
        isThinkingEnabled,
        isDeepResearchEnabled,
        userProfile.id,
        undefined, // No images for edit regeneration
        abortControllerRef.current.signal
      );

      // Save AI response to Supabase
      if (aiReply) {
        await saveToSupabase('tufti', aiReply);
      }

    } catch (error: any) {
      // Ignore abort errors
      if (error.name === 'AbortError') {
        console.log('[useChat] Edit regeneration was cancelled');
        return;
      }
      setChatError(error.message || "An error occurred.");
      setMessages(prev => prev.filter(m => m.id !== tempId || m.text.length > 0));
    } finally {
      abortControllerRef.current = null;
      setIsTyping(false);
      setIsGenerating(false);
      setIsThinking(false);
      setIsSending(false);
    }
  }, [messages, userProfile, saveToSupabase, isThinkingEnabled]);

  // Retry and feedback
  const retryLastMessage = () => console.log("Retry requested.");
  const updateMessageFeedback = () => console.log("Feedback updated.");

  const clearChat = async () => {
    try {
      const uid = session?.user?.id as string
      if (!uid) return setMessages([])
      const convId = await getOrCreateConversation(uid)
      if (convId) await archiveConversation(convId, uid)
      setMessages([])
      // Clear hydration flag so new conversation can load fresh
      hasHydratedRef.current = false;
      // Reset pagination state
      setHasMoreMessages(true);
      oldestLoadedTimestamp.current = null;
      await getOrCreateConversation(uid)
    } catch (e) {
      console.warn('archive failed; falling back to local clear', e)
      setMessages([])
      hasHydratedRef.current = false;
      setHasMoreMessages(true);
      oldestLoadedTimestamp.current = null;
    }
  }

  // --- Load More Messages (Infinite Scroll) ---
  const loadMoreMessages = useCallback(async () => {
    if (!hasMoreMessages || isLoadingMore) {
      console.log('[useChat] loadMoreMessages skipped:', { hasMoreMessages, isLoadingMore });
      return;
    }

    const userId = userProfile.id;
    if (!userId) return;

    const cacheKey = `${CONV_CACHE_PREFIX}${userId}`;
    const conversationId = localStorage.getItem(cacheKey);

    if (!conversationId || !oldestLoadedTimestamp.current) {
      console.log('[useChat] loadMoreMessages: no conversationId or cursor');
      return;
    }

    setIsLoadingMore(true);
    console.log('[useChat] Loading more messages before:', oldestLoadedTimestamp.current);

    try {
      const { messages: olderMessages, hasMore } = await fetchMessagesPaginated(
        conversationId,
        50,
        oldestLoadedTimestamp.current
      );

      if (olderMessages.length > 0) {
        const mappedMessages = olderMessages.map(r => ({
          id: r.id,
          text: r.text,
          sender: r.role === 'user' ? 'user' : 'tufti',
          timestamp: new Date(r.created_at)
        } as Message));

        // Update cursor to oldest message in new batch
        oldestLoadedTimestamp.current = olderMessages[0].created_at;

        // Prepend older messages to maintain chronological order
        setMessages(prev => [...mappedMessages, ...prev]);
        console.log('[useChat] ✅ Loaded', olderMessages.length, 'more messages, hasMore:', hasMore);
      }

      setHasMoreMessages(hasMore);
    } catch (err) {
      console.error('[useChat] Error loading more messages:', err);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMoreMessages, isLoadingMore, userProfile.id]);

  return {
    messages,
    isLoadingHistory,
    isTyping,
    isGenerating,
    isSending,
    chatError,
    sendMessage,
    editMessage,
    updateMessageFeedback,
    retryLastMessage,
    clearChat,
    // Onboarding specific exports
    isOnboarding,
    currentOnboardingQuestion: currentQuestion,
    handleOnboardingAnswer,
    hideSuggestions,
    setHideSuggestions,
    // Thinking mode exports
    isThinkingEnabled,
    toggleThinkingMode,
    isDeepResearchEnabled,
    toggleDeepResearch,
    isThinking,
    // Deep Experiment mode exports
    isDeepExperimentEnabled,
    toggleDeepExperiment,
    // Cancel generation export
    cancelGeneration,
    // Pagination exports for infinite scroll
    loadMoreMessages,
    hasMoreMessages,
    isLoadingMore,
  };
}