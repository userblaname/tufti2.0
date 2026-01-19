// src/components/onboarding/OnboardingFlow.tsx
// Full-screen immersive onboarding experience

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import type { OnboardingQuestion } from '@/lib/onboardingQuestions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';


interface OnboardingFlowProps {
    question: OnboardingQuestion;
    currentStep: number;
    totalSteps: number;
    onAnswer: (answerValue: string, answerLabel: string, nextStep: number) => void;
    userName?: string;
    isCompleting?: boolean;
    onTextSubmit?: (text: string) => void;
}

// Animated background orbs
const BackgroundOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Teal orb */}
        <motion.div
            className="absolute w-[600px] h-[600px] rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(56, 178, 172, 0.15) 0%, transparent 70%)',
                top: '-20%',
                right: '-10%',
            }}
            animate={{
                y: [0, 30, 0],
                x: [0, -20, 0],
                scale: [1, 1.1, 1],
            }}
            transition={{
                duration: 15,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
        {/* Purple orb */}
        <motion.div
            className="absolute w-[500px] h-[500px] rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, transparent 70%)',
                bottom: '-15%',
                left: '-5%',
            }}
            animate={{
                y: [0, -40, 0],
                x: [0, 30, 0],
                scale: [1, 1.15, 1],
            }}
            transition={{
                duration: 18,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
        {/* Cyan accent */}
        <motion.div
            className="absolute w-[300px] h-[300px] rounded-full"
            style={{
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.08) 0%, transparent 70%)',
                top: '40%',
                left: '30%',
            }}
            animate={{
                y: [0, 20, 0],
                scale: [1, 1.2, 1],
            }}
            transition={{
                duration: 12,
                repeat: Infinity,
                ease: 'easeInOut',
            }}
        />
    </div>
);

// Progress indicator component
const ProgressIndicator = ({ current, total, isComplete }: { current: number; total: number; isComplete?: boolean }) => (
    <div className="flex items-center justify-center gap-2 mb-8">
        {Array.from({ length: total }, (_, i) => {
            const stepNum = i + 1;
            const isActive = !isComplete && stepNum === current;
            const isCompleted = isComplete || stepNum < current;

            return (
                <motion.div
                    key={i}
                    className={`progress-dot ${isActive ? 'active' : isCompleted ? 'completed' : 'pending'}`}
                    initial={false}
                    animate={{
                        width: isActive ? 32 : 8,
                        opacity: isActive || isCompleted ? 1 : 0.4,
                    }}
                    transition={{ duration: 0.3 }}
                />
            );
        })}
    </div>
);

// Typewriter text effect
const TypewriterText = ({ text, delay = 0 }: { text: string; delay?: number }) => {
    const [displayedText, setDisplayedText] = useState('');
    const [isComplete, setIsComplete] = useState(false);

    useEffect(() => {
        setDisplayedText('');
        setIsComplete(false);

        const timeout = setTimeout(() => {
            let index = 0;
            const interval = setInterval(() => {
                if (index < text.length) {
                    setDisplayedText(text.slice(0, index + 1));
                    index++;
                } else {
                    setIsComplete(true);
                    clearInterval(interval);
                }
            }, 30);
            return () => clearInterval(interval);
        }, delay);

        return () => clearTimeout(timeout);
    }, [text, delay]);

    return (
        <span className={!isComplete ? 'typing-cursor' : ''}>
            {displayedText}
        </span>
    );
};

// Completion screen component
const CompletionScreen = ({ userName }: { userName: string }) => (
    <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 1.05 }}
        transition={{ duration: 0.5 }}
        className="onboarding-card border-gradient text-center"
    >
        {/* Spinning loader */}
        <div className="flex justify-center mb-6">
            <motion.div
                className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-accent/30 to-cyber-purple/30 
                           flex items-center justify-center border border-teal-accent/30"
                animate={{
                    rotate: 360,
                    boxShadow: [
                        '0 0 20px rgba(56, 178, 172, 0.3)',
                        '0 0 50px rgba(139, 92, 246, 0.5)',
                        '0 0 20px rgba(56, 178, 172, 0.3)',
                    ]
                }}
                transition={{
                    rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                    boxShadow: { duration: 2, repeat: Infinity }
                }}
            >
                <motion.span
                    className="text-3xl"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                >
                    ✨
                </motion.span>
            </motion.div>
        </div>

        <h2 className="text-2xl md:text-3xl text-gray-100 font-light mb-4">
            Calibrating your reality, {userName}...
        </h2>

        <p className="text-gray-400 text-lg">
            <motion.span
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
            >
                The scene is being set...
            </motion.span>
        </p>

        {/* Progress bar */}
        <div className="mt-8 h-1 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
                className="h-full bg-gradient-to-r from-teal-accent via-cyber-purple to-neon-cyan"
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 3, ease: 'easeInOut' }}
            />
        </div>
    </motion.div>
);

export const OnboardingFlow = ({
    question,
    currentStep,
    totalSteps,
    onAnswer,
    userName = 'Director',
    isCompleting = false,
    onTextSubmit,
}: OnboardingFlowProps) => {
    const [textInputValue, setTextInputValue] = useState('');

    const handleTextSubmit = () => {
        if (textInputValue.trim()) {
            onTextSubmit?.(textInputValue.trim());
            setTextInputValue(''); // Clear input after submit
        }
    };

    const promptText = typeof question?.prompt === 'function'
        ? question.prompt(userName)
        : question?.prompt || '';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-navy-deep via-slate-950 to-tufti-black overflow-hidden">
            {/* Animated background */}
            <BackgroundOrbs />

            {/* Subtle grid overlay */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                    backgroundSize: '50px 50px',
                }}
            />

            {/* Main content */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative z-10 w-full max-w-2xl mx-4"
            >
                {/* Show completion screen when finishing */}
                {isCompleting ? (
                    <>
                        <motion.div
                            className="text-center mb-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <span className="text-sm text-teal-accent tracking-widest uppercase">
                                Complete ✓
                            </span>
                        </motion.div>
                        <ProgressIndicator current={totalSteps} total={totalSteps} isComplete={true} />
                        <CompletionScreen userName={userName} />
                    </>
                ) : (
                    <>
                        {/* Step counter */}
                        <motion.div
                            className="text-center mb-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.2 }}
                        >
                            <span className="text-sm text-gray-400 tracking-widest uppercase">
                                Step {currentStep} of {totalSteps}
                            </span>
                        </motion.div>

                        {/* Progress dots */}
                        <ProgressIndicator current={currentStep} total={totalSteps} />

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStep}
                                initial={{ opacity: 0, x: 50, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -50, scale: 0.98 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            >
                                <Card className="bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl">
                                    <CardContent className="p-8">
                                        {/* Tufti avatar/icon */}
                                        <div className="flex justify-center mb-6">
                                            <motion.div
                                                className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 
                                                           flex items-center justify-center border border-primary/30"
                                                animate={{
                                                    boxShadow: [
                                                        '0 0 20px hsl(var(--primary) / 0.3)',
                                                        '0 0 40px hsl(var(--primary) / 0.5)',
                                                        '0 0 20px hsl(var(--primary) / 0.3)',
                                                    ]
                                                }}
                                                transition={{ duration: 3, repeat: Infinity }}
                                            >
                                                {/* Use a simple star or sleek icon instead of film roll */}
                                                <span className="text-2xl">✨</span>
                                            </motion.div>
                                        </div>

                                        {/* Question text */}
                                        <h2 className="text-xl md:text-2xl text-center text-foreground font-light leading-relaxed mb-8">
                                            <TypewriterText text={promptText} delay={200} />
                                        </h2>

                                        {/* Options */}
                                        {question.type === 'choice' && question.options && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex flex-wrap justify-center gap-3"
                                            >
                                                {question.options.map((option, index) => (
                                                    <motion.div
                                                        key={option.value}
                                                        initial={{ opacity: 0, y: 20 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        transition={{ delay: 0.6 + index * 0.1 }}
                                                        whileHover={{ scale: 1.05, y: -2 }}
                                                        whileTap={{ scale: 0.98 }}
                                                    >
                                                        <Button
                                                            variant="outline"
                                                            size="lg"
                                                            onClick={() => onAnswer(option.value, option.label, question.nextStep)}
                                                            className="min-w-[140px] border-primary/50 hover:bg-primary/20 hover:border-primary"
                                                        >
                                                            {option.label}
                                                        </Button>
                                                    </motion.div>
                                                ))}
                                            </motion.div>
                                        )}

                                        {/* Text input for 'text' type questions */}
                                        {question.type === 'text' && (
                                            <motion.div
                                                initial={{ opacity: 0, y: 20 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: 0.5 }}
                                                className="flex flex-col gap-4 max-w-md mx-auto"
                                            >
                                                <div className="flex gap-2">
                                                    <Input
                                                        autoFocus
                                                        placeholder="Type your answer..."
                                                        className="bg-background/50 border-primary/20 focus-visible:ring-primary h-12 text-lg"
                                                        value={textInputValue}
                                                        onChange={(e) => setTextInputValue(e.target.value)}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Enter' && textInputValue.trim()) {
                                                                handleTextSubmit();
                                                            }
                                                        }}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-12 w-12 shrink-0"
                                                        onClick={handleTextSubmit}
                                                        disabled={!textInputValue.trim()}
                                                    >
                                                        Run
                                                    </Button>
                                                </div>
                                                <p className="text-xs text-muted-foreground text-center">
                                                    Press Enter to continue
                                                </p>
                                            </motion.div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </AnimatePresence>

                        {/* Decorative elements */}
                        <motion.div
                            className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[400px] h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent"
                            animate={{ opacity: [0.3, 0.6, 0.3] }}
                            transition={{ duration: 3, repeat: Infinity }}
                        />
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default OnboardingFlow;
