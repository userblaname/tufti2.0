// src/hooks/useChat.ts

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getAiResponse } from '@/lib/chat-service';
import type { Message, UserProfile } from '@/lib/types';
import { onboardingScript, OnboardingQuestion } from '@/lib/onboardingQuestions';
import { TUFTI_SYSTEM_PROMPT } from '@/lib/tufti';

// A simple local ID generator for messages created on the client
const generateUniqueId = () => `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

export function useChat(userProfile: UserProfile) {
  const { isOnboardingComplete, updateProfileAndCompleteOnboarding, session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingHistory] = useState(!isOnboardingComplete);

  // --- Onboarding State ---
  const [isOnboarding, setIsOnboarding] = useState(!isOnboardingComplete);
  const [onboardingStep, setOnboardingStep] = useState(isOnboardingComplete ? -1 : 1);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState<OnboardingQuestion | null>(null);

  // --- Regular Chat State ---
  const [isTyping, setIsTyping] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Effect to drive the onboarding conversation
  useEffect(() => {
    if (!isOnboarding) return;

    const question = onboardingScript.find(q => q.step === onboardingStep);

    if (question) {
      setCurrentQuestion(question);
      // Use a timeout to make Tufti's question appear more naturally after the user's answer
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
      // Onboarding is finished, save data and transition to normal chat
      setIsGenerating(true); // Show a final loading indicator
      const finalBriefingMessage: Message = {
        id: generateUniqueId(),
        text: "Thank you. I am calibrating the film... Please give me a moment.",
        sender: 'tufti',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, finalBriefingMessage]);

      // Call the function to generate dossier and save profile
      ;(updateProfileAndCompleteOnboarding as any)({ name: onboardingAnswers.name }, onboardingAnswers)
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

  const sendMessage = useCallback(async (text: string) => {
    if (isSending) return;

    // During onboarding, always route input to onboarding flow.
    if (isOnboarding) {
      if (currentQuestion) {
        // For text questions, save the raw text; for choice steps, treat typed text as the label
        const label = text;
        handleOnboardingAnswer(text, label, currentQuestion.nextStep);
      }
      return;
    }

    setIsSending(true);
    setChatError(null);
    setIsTyping(true);
    setIsGenerating(true);

    const userMessage: Message = { id: generateUniqueId(), text, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);

    // Construct history for the AI
    const conversationHistory = [...messages, userMessage];

    try {
      // Your existing `getAiResponse` logic
      const systemPrompt = (userProfile as any).persona_briefing
        ? `${(userProfile as any).persona_briefing}\n\n---\n\n${TUFTI_SYSTEM_PROMPT}`
        : TUFTI_SYSTEM_PROMPT;

      const messagesForApi = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.map(msg => ({
          content: msg.text,
          role: msg.sender === 'user' ? 'user' : 'assistant'
        }))
      ];
      
      const aiReply = await getAiResponse(messagesForApi as any);

      const tuftiResponse: Message = { id: generateUniqueId(), text: aiReply, sender: 'tufti', timestamp: new Date() };
      setMessages(prev => [...prev, tuftiResponse]);

    } catch (error: any) {
      setChatError(error.message || "An error occurred.");
      console.error(error);
    } finally {
      setIsTyping(false);
      setIsGenerating(false);
      setIsSending(false);
    }
  }, [isSending, isOnboarding, currentQuestion, handleOnboardingAnswer, messages, userProfile, session]);

  // Dummy functions for retry and feedback to avoid errors
  const retryLastMessage = () => console.log("Retry requested.");
  const updateMessageFeedback = () => console.log("Feedback updated.");
  const clearChat = () => setMessages([]); // Simple clear for now

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
    // Onboarding specific exports for the UI
    isOnboarding,
    currentOnboardingQuestion: currentQuestion,
    handleOnboardingAnswer,
  };
}