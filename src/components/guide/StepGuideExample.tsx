import StepGuide from './StepGuide'

export default function StepGuideExample() {
  const steps = [
    {
      heading: "Understanding Your Reality Film",
      content: "Your life is like a film production where you are both the director and the main character. Every scene matters, and every choice shapes the story. As you begin to understand this perspective, you'll see how each moment contributes to your greater narrative."
    },
    {
      heading: "Reducing Importance",
      content: "When we give too much importance to any scene, we create excess potential that disturbs the natural flow of our reality film. Learn to observe without attachment, like a skilled director reviewing footage. This detachment allows for clearer vision and more effective direction."
    },
    {
      heading: "Composing Your Reality",
      content: "Using the plait of intention, you can illuminate future frames of your reality film. Focus on what you want to create, not what you want to avoid. This positive direction allows the universe to align with your intentions naturally, without forcing specific outcomes."
    }
  ]

  return (
    <div className="p-4 md:p-8">
      <StepGuide
        intro="Welcome to your journey of conscious reality creation. Let's explore the key principles that will help you direct your reality film with awareness and intention."
        steps={steps}
        className="mx-auto"
      />
    </div>
  )
}