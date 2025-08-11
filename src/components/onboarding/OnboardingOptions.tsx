// src/components/onboarding/OnboardingOptions.tsx

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import type { OnboardingQuestion } from '@/lib/onboardingQuestions';

interface OnboardingOptionsProps {
  question: OnboardingQuestion;
  onAnswer: (answerValue: string, answerLabel: string, nextStep: number) => void;
}

export const OnboardingOptions = ({ question, onAnswer }: OnboardingOptionsProps) => {
  if (!question.options) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-center gap-3 px-4 py-4 border-t border-teal-accent/20"
    >
      {question.options.map((option) => (
        <Button
          key={option.value}
          variant="outline"
          className="bg-navy-deep/60 border-teal-accent/30 hover:bg-teal-accent/20 text-gray-200"
          onClick={() => onAnswer(option.value, option.label, question.nextStep)}
        >
          {option.label}
        </Button>
      ))}
    </motion.div>
  );
};


