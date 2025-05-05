import { cn } from '@/lib/utils'

interface StepGuideProps {
  intro?: string
  steps: {
    heading: string
    content: string | React.ReactNode
  }[]
  className?: string
}

export default function StepGuide({ intro, steps, className }: StepGuideProps) {
  return (
    <article className={cn(
      "tufti-message max-w-[800px] p-8 space-y-8",
      "bg-tufti-surface/20 rounded-lg backdrop-blur-sm",
      className
    )}>
      {intro && (
        <header className="message-intro">
          <p className="text-tufti-silver/90 text-lg font-baroque leading-relaxed italic">
            {intro}
          </p>
        </header>
      )}

      <div className="steps-container space-y-10">
        {steps.map((step, index) => (
          <section key={index} className="step-section">
            <h2 className="step-heading text-2xl font-baroque text-tufti-white mb-6">
              {index + 1}. {step.heading}
            </h2>
            <div className="step-content text-lg text-tufti-silver/90 leading-relaxed pl-8 border-l-2 border-tufti-red/20">
              {step.content}
            </div>
            {index < steps.length - 1 && (
              <div className="step-divider mt-10 border-t border-tufti-red/10" 
                   aria-hidden="true" 
              />
            )}
          </section>
        ))}
      </div>
    </article>
  )
}