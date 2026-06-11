/**
 * Dismissible global error banner.
 * @param {{ message: string, onDismiss: () => void }} props
 */
export default function ErrorBanner({ message, onDismiss }) {
  if (!message) return null;

  return (
    <div
      id="errorBanner"
      className="flex items-center justify-between bg-error-bg border border-red rounded-lg px-4 py-2.5 mb-5 text-error-text text-[13px] fade-in"
    >
      <div className="flex items-center gap-2">
        {/* Warning icon */}
        <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span>{message}</span>
      </div>
      <button
        onClick={onDismiss}
        className="bg-transparent border-none text-error-text cursor-pointer text-base px-1 hover:opacity-70 transition-opacity"
        aria-label="Dismiss error"
      >
        &#x2715;
      </button>
    </div>
  );
}
