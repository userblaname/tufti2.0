import { getAiResponse } from './chat-service';
import { OnboardingQuestion } from './onboardingQuestions';

/**
 * Generates a "Transurfing Profile" based on user's onboarding answers.
 * This function calls the AI to analyze the archetype and generate a system prompt briefing.
 */
export async function generatePersonaBriefing(
    name: string,
    answers: Record<string, string>,
    questions: OnboardingQuestion[]
): Promise<string> {
    const formattedAnswers = questions
        .filter(q => q.key !== 'name') // Name is passed separately
        .map(q => {
            const answer = answers[q.key] || 'Unknown';
            return `- ${q.prompt instanceof Function ? 'Question' : q.prompt}: "${answer}"`;
        })
        .join('\n');

    const analysisPrompt = `
You are Tufti the Priestess. A new soul (Director Name: ${name}) has just completed the onboarding assessment.
Based on their answers, I need you to create a "Transurfing Profile" (Persona Briefing) that will be used to guide our future conversations.

Here are their answers:
${formattedAnswers}

Task:
Analyze these answers to determine their "Transurfing Archetype".
Are they too controlling (Mind)? Too passive (Sleeping)? Do they rely on logic or intuition?
Create a concise, internal briefing for yourself (Tufti) on how to handle this specific user.

Format the output strictly as a system instruction block:
"USER ARCHETYPE: [Name of Archetype, e.g. 'The Logical Controller' or 'The Dreaming Drifter']
KEY TRAITS: [Comma separated traits]
GUIDANCE STRATEGY: [How Tufti should speak to them - e.g. 'Challenge their logic', 'Encourage more action', 'Wake them up gently']
CURRENT BLOCKAGE: [What is stopping them from controlling reality?]
"

Keep it to 4-5 lines max. This text will be injected into your system prompt forever.
`;

    try {
        // We reuse the existing chat service to call the AI
        const briefing = await getAiResponse([
            { role: 'system', content: 'You are an expert Reality Transurfing analyst.' },
            { role: 'user', content: analysisPrompt }
        ]);

        return briefing.trim();
    } catch (error) {
        console.error("Failed to generate persona briefing:", error);
        // Fallback briefing if AI fails
        return `USER ARCHETYPE: Unknown Director\nGUIDANCE STRATEGY: Treat with standard Tufti wisdom.\n`;
    }
}
