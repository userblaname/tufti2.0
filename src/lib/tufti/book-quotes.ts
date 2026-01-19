/**
 * Curated quotes from Vadim Zeland's Transurfing books
 * Used for the Daily Wisdom feature in the sidebar
 */

export interface BookQuote {
    text: string
    book: string
}

export const BOOK_QUOTES: BookQuote[] = [
    // REALITY TRANSURFING STEPS I-V
    { text: "The world is a mirror reflecting your inner state.", book: "Reality Transurfing" },
    { text: "Reduce importance, and it shall come to you.", book: "Reality Transurfing" },
    { text: "The alternatives space contains infinite variations of reality.", book: "Reality Transurfing" },
    { text: "Pendulums feed on the energy of your attention.", book: "Reality Transurfing" },
    { text: "Don't fight pendulums. Simply don't give them your energy.", book: "Reality Transurfing" },
    { text: "Importance creates excess potential that attracts problems.", book: "Reality Transurfing" },
    { text: "Outer intention opens the door to infinite possibilities.", book: "Reality Transurfing" },
    { text: "The goal is not to want, but to intend.", book: "Reality Transurfing" },
    { text: "Energy follows attention. Guard your attention carefully.", book: "Reality Transurfing" },
    { text: "Let go of control and allow the flow of alternatives.", book: "Reality Transurfing" },
    { text: "Your thoughts form the layer of your world.", book: "Reality Transurfing" },
    { text: "The soul knows the path. The mind creates obstacles.", book: "Reality Transurfing" },
    { text: "Balance between soul and mind creates harmony.", book: "Reality Transurfing" },
    { text: "Excess potential is restored by balanced forces.", book: "Reality Transurfing" },
    { text: "Move through life like a blade cutting through the matrix.", book: "Reality Transurfing" },
    { text: "Unity of soul and mind activates outer intention.", book: "Reality Transurfing" },
    { text: "The mirror takes time to reflect your image back.", book: "Reality Transurfing" },
    { text: "Slide to a life line where your goal is already realized.", book: "Reality Transurfing" },
    { text: "Inner intention uses your own energy. Outer intention uses the energy of the flow.", book: "Reality Transurfing" },
    { text: "The key is not to squeeze, but to allow.", book: "Reality Transurfing" },

    // TUFTI THE PRIESTESS
    { text: "You are the director of your own reality film.", book: "Tufti the Priestess" },
    { text: "Stop being an actor. Become the director.", book: "Tufti the Priestess" },
    { text: "Wake up in the dream while still dreaming.", book: "Tufti the Priestess" },
    { text: "The plait behind your spine is dormant. Wake it up.", book: "Tufti the Priestess" },
    { text: "Reality is a film roll. Each frame already exists.", book: "Tufti the Priestess" },
    { text: "Compose your next frame with intention.", book: "Tufti the Priestess" },
    { text: "The inner screen traps you in thoughts. The outer screen traps you in events.", book: "Tufti the Priestess" },
    { text: "Stand at the center between two screens. This is awareness.", book: "Tufti the Priestess" },
    { text: "See yourself and see reality at the same time.", book: "Tufti the Priestess" },
    { text: "Your film roll contains all possible frames. Choose wisely.", book: "Tufti the Priestess" },
    { text: "The sleeping masses walk through their own films like automatons.", book: "Tufti the Priestess" },
    { text: "Illuminate your frame with intention, not desire.", book: "Tufti the Priestess" },
    { text: "Every frame is already there. You select which to manifest.", book: "Tufti the Priestess" },
    { text: "Stop fighting the current frame. It has already happened.", book: "Tufti the Priestess" },
    { text: "Be the firefly in the land of shadows.", book: "Tufti the Priestess" },
    { text: "Your Overseer knows. Your little mind forgot to ask.", book: "Tufti the Priestess" },
    { text: "The awareness center is where lucidity begins.", book: "Tufti the Priestess" },
    { text: "Caterpillars can become butterflies. Most choose not to.", book: "Tufti the Priestess" },
    { text: "The stroll through a movie becomes lucid when you wake up in it.", book: "Tufti the Priestess" },
    { text: "I came from Time itself to wake you up.", book: "Tufti the Priestess" },

    // MASTER OF REALITY
    { text: "Your reality is your creation. Take responsibility for it.", book: "Master of Reality" },
    { text: "The structure controls the sleeping. The awakened control the structure.", book: "Master of Reality" },
    { text: "Gifts are more powerful than compliments.", book: "Master of Reality" },
    { text: "Live for yourself first, then you can truly help others.", book: "Master of Reality" },
    { text: "Paradoxical situations dissolve when importance drops.", book: "Master of Reality" },

    // WHAT TUFTI DIDN'T SAY
    { text: "Advanced teachings require advanced readiness.", book: "What Tufti Didn't Say" },
    { text: "The plait activates when soul and mind unite.", book: "What Tufti Didn't Say" },
    { text: "Some truths are too powerful for the sleeping to hear.", book: "What Tufti Didn't Say" },
    { text: "Practice creates mastery. Theory creates confusion.", book: "What Tufti Didn't Say" },
    { text: "Real wisdom comes from experience, not explanation.", book: "What Tufti Didn't Say" },

    // ADDITIONAL WISDOM
    { text: "Don't desire. Intend.", book: "Reality Transurfing" },
    { text: "The goal already exists. You simply move toward it.", book: "Reality Transurfing" },
    { text: "Fear creates what you fear. Release it.", book: "Reality Transurfing" },
    { text: "Gratitude raises your frequency and attracts abundance.", book: "Reality Transurfing" },
    { text: "Your coordinates determine which life line you walk.", book: "Reality Transurfing" },
    { text: "Thoughts radiate energy. Choose them carefully.", book: "Reality Transurfing" },
    { text: "The mirror works slowly. Patience is essential.", book: "Reality Transurfing" },
    { text: "Desire pushes away. Intention draws near.", book: "Reality Transurfing" },
    { text: "The frame you fight persists. The frame you accept transforms.", book: "Tufti the Priestess" },
    { text: "Awareness is the first step. Action is the second.", book: "Tufti the Priestess" }
]

/**
 * Get the day of year (1-365/366)
 */
const getDayOfYear = (): number => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 0)
    const diff = now.getTime() - start.getTime()
    const oneDay = 1000 * 60 * 60 * 24
    return Math.floor(diff / oneDay)
}

/**
 * Get today's wisdom quote (same for everyone, changes daily)
 */
export const getDailyQuote = (): BookQuote => {
    const dayOfYear = getDayOfYear()
    const index = dayOfYear % BOOK_QUOTES.length
    return BOOK_QUOTES[index]
}
