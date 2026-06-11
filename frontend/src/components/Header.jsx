import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * Application header displaying the tool name, model tags, and logout button.
 */
export default function Header() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="mb-7 fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          {/* Shield icon */}
          <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center">
            <svg className="w-5 h-5 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            LLM Security Evaluation Harness
          </h1>
        </div>
        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
            text-text-muted border border-border bg-surface-alt
            hover:text-red hover:border-red/40 hover:bg-badge-red-bg
            transition-all duration-150 cursor-pointer"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          Logout
        </button>
      </div>
      <p className="text-[13px] text-text-muted ml-[52px]">
        Target: <span className="bg-surface-alt border border-border rounded px-1.5 py-0.5 font-mono text-accent text-xs">gemini-2.5-flash</span>
        &nbsp;|&nbsp;
        Classifier + Judge: <span className="bg-surface-alt border border-border rounded px-1.5 py-0.5 font-mono text-accent text-xs">gemini-3.1-pro-preview</span>
      </p>
    </header>
  );
}

