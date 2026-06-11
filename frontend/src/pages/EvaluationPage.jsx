import { useRef } from 'react';
import { useEvaluation } from '../hooks/useEvaluation';
import Header from '../components/Header';
import ErrorBanner from '../components/ErrorBanner';
import UploadPanel from '../components/UploadPanel';
import ProgressPanel from '../components/ProgressPanel';
import ResultsTable from '../components/ResultsTable';
import SummaryPanel from '../components/SummaryPanel';

/**
 * Main evaluation page — assembles all panels for the single-page evaluation flow.
 */
export default function EvaluationPage() {
  const {
    parsedPrompts,
    total,
    completed,
    currentStep,
    currentPromptText,
    results,
    summary,
    error,
    isRunning,
    finalReport,
    parseFile,
    runEvaluation,
    dismissError,
  } = useEvaluation();

  const summaryRef = useRef(null);

  const handleRun = async () => {
    await runEvaluation();
    // Auto-scroll to summary when done
    setTimeout(() => {
      summaryRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  return (
    <div className="max-w-[1300px] mx-auto px-6 pt-8 pb-16">
      <Header />
      <ErrorBanner message={error} onDismiss={dismissError} />
      <UploadPanel
        onFileSelected={parseFile}
        onRun={handleRun}
        total={total}
        isRunning={isRunning}
        hasPrompts={parsedPrompts.length > 0}
      />
      {(isRunning || results.length > 0) && (
        <ProgressPanel
          completed={completed}
          total={total}
          currentStep={currentStep}
          currentPromptText={currentPromptText}
        />
      )}
      <ResultsTable results={results} />
      <div ref={summaryRef}>
        <SummaryPanel summary={summary} finalReport={finalReport} />
      </div>
    </div>
  );
}
