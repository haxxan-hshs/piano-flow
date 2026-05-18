import { useState } from 'react';
import { CheckCircle2, Loader2, LogOut, Mail, ShieldCheck, UserRound } from 'lucide-react';
import AuthView from './components/Auth/AuthView';
import { useAuth } from './context/useAuth';
import { supabase } from './lib/supabaseClient';

function App() {
  const { user, isAuthenticated, isLoadingSession } = useAuth();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignOutError(error.message);
    }

    setIsSigningOut(false);
  };

  if (isLoadingSession) {
    return (
      <main className="app-loader" aria-live="polite">
        <Loader2 className="spin" size={24} />
        <span>Loading your secure session</span>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return (
    <main className="account-shell">
      <section className="account-card">
        <div className="brand-mark" aria-hidden="true">
          <ShieldCheck size={26} />
        </div>

        <div className="account-copy">
          <p className="eyebrow">Authenticated</p>
          <h1>Your account is ready.</h1>
          <p>
            Supabase has verified your active session. This application is now connected only to
            Supabase Authentication.
          </p>
        </div>

        <div className="account-details" aria-label="Current account">
          <div>
            <UserRound size={18} />
            <span>User ID</span>
            <strong>{user?.id}</strong>
          </div>
          <div>
            <Mail size={18} />
            <span>Email</span>
            <strong>{user?.email}</strong>
          </div>
          <div>
            <CheckCircle2 size={18} />
            <span>Email status</span>
            <strong>{user?.email_confirmed_at ? 'Verified' : 'Pending verification'}</strong>
          </div>
        </div>

        {signOutError && <p className="form-message form-message--error">{signOutError}</p>}

        <button className="primary-button" type="button" onClick={handleSignOut} disabled={isSigningOut}>
          {isSigningOut ? <Loader2 className="spin" size={18} /> : <LogOut size={18} />}
          {isSigningOut ? 'Logging out...' : 'Logout'}
        </button>
      </section>
    </main>
  );
}

export default App;
