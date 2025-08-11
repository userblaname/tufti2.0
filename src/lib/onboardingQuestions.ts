// src/lib/onboardingQuestions.ts

export interface OnboardingQuestion {
  step: number;
  key: string;
  // The prompt can be a string or a function that takes the user's name
  prompt: string | ((name: string) => string);
  type: 'text' | 'choice';
  options?: { value: string; label: string }[];
  // The `nextStep` determines which question comes next. A value of -1 signifies the end.
  nextStep: number;
}

// This is the full script for our 10-question conversational onboarding.
export const onboardingScript: OnboardingQuestion[] = [
  { step: 1, key: 'name', prompt: "Welcome, Director. I am Tufti. It is a pleasure to meet you. Before we begin composing your reality, may I know the name that will appear in the credits?", type: 'text', nextStep: 2 },
  { step: 2, key: 'outlook', prompt: (name) => `A fine name for a director, ${name}. Now, when you look ahead, is the future a detailed script or an unwritten story?`, type: 'choice', options: [{value: 'A Detailed Script', label: 'A Detailed Script'}, {value: 'An Unwritten Story', label: 'An Unwritten Story'}], nextStep: 3 },
  { step: 3, key: 'conflict', prompt: "When a challenge appears in your 'script', is it an obstacle to overcome or a plot twist to explore?", type: 'choice', options: [{value: 'An Obstacle', label: 'An Obstacle'}, {value: 'A Plot Twist', label: 'A Plot Twist'}], nextStep: 4 },
  { step: 4, key: 'motivation', prompt: "Is the satisfaction in completing the film, or in the art of making it?", type: 'choice', options: [{value: 'Completing the film', label: 'Completing the film'}, {value: 'The art of making it', label: 'The art of making it'}], nextStep: 5 },
  { step: 5, key: 'innerVoice', prompt: "Is your inner monologue more of a critical film reviewer or a supportive producer?", type: 'choice', options: [{value: 'A Critical Reviewer', label: 'A Critical Reviewer'}, {value: 'A Supportive Producer', label: 'A Supportive Producer'}], nextStep: 6 },
  { step: 6, key: 'locusOfControl', prompt: "Do you feel you are holding the camera, or are you in the scene being filmed?", type: 'choice', options: [{value: 'Holding the camera', label: 'Holding the camera'}, {value: 'In the scene', label: 'In the scene'}], nextStep: 7 },
  { step: 7, key: 'pacing', prompt: "Do you prefer a fast-paced action sequence or a slow, character-driven drama?", type: 'choice', options: [{value: 'Fast-paced action', label: 'Fast-paced action'}, {value: 'Slow drama', label: 'Slow drama'}], nextStep: 8 },
  { step: 8, key: 'universe', prompt: "Do you see the world as a predictable set or a magical, ever-changing green screen?", type: 'choice', options: [{value: 'A predictable set', label: 'A predictable set'}, {value: 'A magical green screen', label: 'A magical green screen'}], nextStep: 9 },
  { step: 9, key: 'guide', prompt: "Do you make decisions based on the written script (logic) or the director's intuition (feeling)?", type: 'choice', options: [{value: 'Logic', label: 'Logic'}, {value: 'Intuition', label: 'Intuition'}], nextStep: 10 },
  { step: 10, key: 'surrender', prompt: "Does 'letting go' feel like losing the script or trusting the story to unfold?", type: 'choice', options: [{value: 'Losing the script', label: 'Losing the script'}, {value: 'Trusting the story', label: 'Trusting the story'}], nextStep: -1 }, // -1 signifies the end
];


