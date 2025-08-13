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
      className="sticky bottom-0 inset-x-0 z-20 bg-navy-deep/80 backdrop-blur border-t border-teal-accent/20 px-4 py-4"
    >
      <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-2 md:gap-3">
        {question.options.map((option) => (
          <Button
            key={option.value}
            variant="outline"
            className="h-11 px-5 rounded-xl text-base font-medium bg-teal-accent/15 border-teal-accent/30 hover:bg-teal-accent/25 text-gray-100"
            onClick={() => onAnswer(option.value, option.label, question.nextStep)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </motion.div>
  );
};


