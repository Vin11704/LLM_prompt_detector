import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Login page with username/password form.
 * Redirects to / if already authenticated.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading, authError, login, dismissAuthError } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  if (isAuthenticated && !isLoading) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsSubmitting(true);
    await login(username, password);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-bg">
      <div className="w-full max-w-md fade-in">
        {/* Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-accent/15 mb-4">
            <svg className="w-8 h-8 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-text tracking-tight">
            LLM Security Harness
          </h1>
          <p className="text-sm text-text-muted mt-1">Sign in to access the evaluation console</p>
        </div>

        {/* Login card */}
        <div className="bg-surface border border-border rounded-xl p-8 shadow-2xl shadow-black/30">
          {/* Error message */}
          {authError && (
            <div className="flex items-center justify-between bg-error-bg border border-red rounded-lg px-4 py-2.5 mb-6 text-error-text text-sm fade-in">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                <span>{authError}</span>
              </div>
              <button
                onClick={dismissAuthError}
                className="text-error-text hover:opacity-70 transition-opacity bg-transparent border-none cursor-pointer"
                aria-label="Dismiss error"
              >
                &#x2715;
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-text-muted mb-1.5">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                autoComplete="username"
                autoFocus
                className="w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-text text-sm
                  placeholder-text-muted/50 outline-none
                  focus:border-accent focus:ring-1 focus:ring-accent/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150"
                placeholder="Enter your username"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-text-muted mb-1.5">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                autoComplete="current-password"
                className="w-full px-4 py-2.5 bg-surface-alt border border-border rounded-lg text-text text-sm
                  placeholder-text-muted/50 outline-none
                  focus:border-accent focus:ring-1 focus:ring-accent/30
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-150"
                placeholder="Enter your password"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || !username.trim() || !password.trim()}
              className="w-full flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg
                bg-accent text-bg text-sm font-semibold border-none cursor-pointer
                hover:bg-accent-hover shadow-lg shadow-accent/20
                disabled:opacity-40 disabled:cursor-not-allowed
                transition-all duration-150"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-text-muted mt-6">
          Secured access · Session expires after 1 hour
        </p>
      </div>
    </div>
  );
}
