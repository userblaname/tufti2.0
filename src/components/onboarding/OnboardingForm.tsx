// src/components/onboarding/OnboardingForm.tsx
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { onboardingScript } from '@/lib/onboardingQuestions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserProfile } from '@/lib/types';

// Animated background orbs (from OnboardingFlow)
const BackgroundOrbs = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
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
            transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
        />
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
            transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
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

export const OnboardingForm = ({ userProfile }: { userProfile: UserProfile | null }) => {
    const { updateProfileAndCompleteOnboarding } = useAuth();
    const [step, setStep] = useState(1);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [textInput, setTextInput] = useState('');

    const currentQuestion = onboardingScript.find(q => q.step === step);
    const totalSteps = onboardingScript.length;

    const handleAnswer = async (value: string, _label: string, nextStep: number) => {
        const newAnswers = { ...answers, [currentQuestion?.key || 'unknown']: value };
        setAnswers(newAnswers);

        if (nextStep === -1) {
            setIsSubmitting(true);
            const userName = newAnswers.name || userProfile?.name || 'Director';

            // First save basic profile
            await updateProfileAndCompleteOnboarding({
                name: userName,
                persona_briefing: undefined
            }, newAnswers);

            // Now handle background generation (similar to useChat logic)
            import('@/lib/onboardingAnalysis').then(({ generatePersonaBriefing }) => {
                generatePersonaBriefing(userName, newAnswers, onboardingScript)
                    .then((personaBriefing) => {
                        updateProfileAndCompleteOnboarding({
                            name: userName,
                            persona_briefing: personaBriefing,
                        }, newAnswers).catch(console.error);
                    })
                    .catch(console.error);
            });

            // Note: AuthContext handles setting isOnboardingComplete = true,
            // which will trigger rerender in App.tsx
        } else {
            setStep(nextStep);
            setTextInput('');
        }
    };

    if (!currentQuestion) return null;

    const userName = answers.name || userProfile?.name || 'Director';
    const promptText = typeof currentQuestion.prompt === 'function'
        ? currentQuestion.prompt(userName)
        : currentQuestion.prompt;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-navy-deep via-slate-950 to-tufti-black overflow-hidden">
            <BackgroundOrbs />
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '50px 50px' }} />

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 w-full max-w-2xl mx-4">
                {isSubmitting ? (
                    <>
                        <ProgressIndicator current={totalSteps} total={totalSteps} isComplete={true} />
                        <CompletionScreen userName={userName} />
                    </>
                ) : (
                    <>
                        <div className="text-center mb-4">
                            <span className="text-sm text-gray-400 tracking-widest uppercase">
                                Step {step} of {totalSteps}
                            </span>
                        </div>
                        <ProgressIndicator current={step} total={totalSteps} />
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={step}
                                initial={{ opacity: 0, x: 50, scale: 0.98 }}
                                animate={{ opacity: 1, x: 0, scale: 1 }}
                                exit={{ opacity: 0, x: -50, scale: 0.98 }}
                                transition={{ duration: 0.4, ease: 'easeOut' }}
                            >
                                <Card className="bg-card/80 backdrop-blur-xl border-primary/20 shadow-2xl">
                                    <CardContent className="p-8">
                                        <div className="flex justify-center mb-6">
                                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center border border-primary/30">
                                                <span className="text-2xl">✨</span>
                                            </div>
                                        </div>
                                        <h2 className="text-xl md:text-2xl text-center text-foreground font-light leading-relaxed mb-8">
                                            <TypewriterText text={promptText} delay={200} />
                                        </h2>

                                        {currentQuestion.type === 'choice' && currentQuestion.options && (
                                            <div className="flex flex-wrap justify-center gap-3">
                                                {currentQuestion.options.map((option) => (
                                                    <Button
                                                        key={option.value}
                                                        variant="outline"
                                                        size="lg"
                                                        onClick={() => handleAnswer(option.value, option.label, currentQuestion.nextStep)}
                                                        className="min-w-[140px] border-primary/50 hover:bg-primary/20 hover:border-primary"
                                                    >
                                                        {option.label}
                                                    </Button>
                                                ))}
                                            </div>
                                        )}

                                        {currentQuestion.type === 'text' && (
                                            <div className="flex flex-col gap-4 max-w-md mx-auto">
                                                <div className="flex gap-2">
                                                    <Input
                                                        autoFocus
                                                        placeholder="Type your answer..."
                                                        className="bg-background/50 border-primary/20 focus-visible:ring-primary h-12 text-lg"
                                                        value={textInput}
                                                        onChange={(e) => setTextInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && textInput.trim() && handleAnswer(textInput, textInput, currentQuestion.nextStep)}
                                                    />
                                                    <Button
                                                        size="icon"
                                                        className="h-12 w-12 shrink-0"
                                                        onClick={() => textInput.trim() && handleAnswer(textInput, textInput, currentQuestion.nextStep)}
                                                        disabled={!textInput.trim()}
                                                    >
                                                        Run
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </AnimatePresence>
                    </>
                )}
            </motion.div>
        </div>
    );
};

export default OnboardingForm;
