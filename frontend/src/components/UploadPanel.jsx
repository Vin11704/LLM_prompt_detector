import { useRef, useState } from 'react';

/**
 * Upload panel for selecting a .txt file and triggering evaluation.
 * @param {{ onFileSelected: (file: File) => Promise<any>, onRun: () => void, total: number, isRunning: boolean, hasPrompts: boolean }} props
 */
export default function UploadPanel({ onFileSelected, onRun, total, isRunning, hasPrompts }) {
  const fileInputRef = useRef(null);
  const [fileStatus, setFileStatus] = useState('No file selected');
  const [isParsing, setIsParsing] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFileStatus(`${file.name} — parsing…`);
    setIsParsing(true);

    const result = await onFileSelected(file);

    if (result) {
      const count = result.total;
      if (count === 0) {
        setFileStatus(`${file.name} — no prompts found`);
      } else {
        setFileStatus(`${file.name} — ${count} prompt${count !== 1 ? 's' : ''} loaded`);
      }
    } else {
      setFileStatus('Failed to parse file');
    }
    setIsParsing(false);
  };

  const canRun = hasPrompts && !isRunning && !isParsing;

  return (
    <section
      id="uploadPanel"
      className="bg-surface border border-border rounded-lg p-6 mb-5 fade-in"
    >
      <h2 className="text-base font-semibold mb-4 text-text">Upload Prompts</h2>

      <div className="flex items-center gap-3.5 flex-wrap mb-4">
        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          accept=".txt"
          className="hidden"
          onChange={handleFileChange}
          disabled={isRunning}
        />
        <label
          htmlFor="fileInput"
          className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-md border border-border text-[13px] font-semibold transition-all duration-150
            ${isRunning ? 'opacity-40 cursor-not-allowed bg-surface-alt text-text' : 'bg-surface-alt text-text cursor-pointer hover:bg-border'}`}
        >
          {/* Upload icon */}
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
          </svg>
          Choose .txt File
        </label>
        <span className="text-text-muted text-[13px]">{fileStatus}</span>
      </div>

      <button
        id="runBtn"
        onClick={onRun}
        disabled={!canRun}
        className={`inline-flex items-center gap-1.5 px-5 py-2 rounded-md text-[13px] font-semibold transition-all duration-150 border-none
          ${canRun
            ? 'bg-accent text-bg cursor-pointer hover:bg-accent-hover shadow-lg shadow-accent/20'
            : 'bg-accent text-bg opacity-40 cursor-not-allowed'}`}
      >
        {isRunning ? (
          <>
            {/* Spinner */}
            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            Running…
          </>
        ) : (
          <>
            {/* Play icon */}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            Run Evaluation
          </>
        )}
      </button>
    </section>
  );
}
