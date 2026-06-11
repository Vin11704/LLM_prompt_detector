/**
 * Progress panel showing evaluation progress bar, step indicators, and current prompt.
 * @param {{ completed: number, total: number, currentStep: string|null, currentPromptText: string }} props
 */
export default function ProgressPanel({ completed, total, currentStep, currentPromptText }) {
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const steps = [
    { id: 'classify', label: 'Classifying' },
    { id: 'test', label: 'Testing' },
    { id: 'eval', label: 'Evaluating' },
  ];

  return (
    <section
      id="progressPanel"
      className="bg-surface border border-border rounded-lg p-6 mb-5 slide-up"
    >
      <h2 className="text-base font-semibold mb-4 text-text">Evaluation Progress</h2>

      {/* Progress bar */}
      <div className="bg-surface-alt rounded-full h-2 overflow-hidden mb-2.5">
        <div
          className="h-full bg-accent rounded-full transition-all duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p id="progressText" className="text-[13px] text-text-muted mb-3.5">
        {completed === total && total > 0
          ? `All ${total} prompts processed.`
          : `${completed} of ${total} prompts complete`}
      </p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mb-3.5">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-center gap-2">
            {i > 0 && <span className="text-border text-base">→</span>}
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-semibold border transition-all duration-200
                ${currentStep === step.id
                  ? 'bg-accent/15 text-accent border-accent pulse-glow'
                  : 'bg-surface-alt text-text-muted border-border'}`}
            >
              {step.label}
            </span>
          </div>
        ))}
      </div>

      {/* Current prompt display */}
      {currentPromptText && (
        <>
          <p className="text-xs text-text-muted uppercase tracking-widest mb-1">Current prompt:</p>
          <p className="text-text italic text-[13px] min-h-[20px] break-words">
            {currentPromptText}
          </p>
        </>
      )}
    </section>
  );
}
