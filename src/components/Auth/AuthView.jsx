import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Music2,
  ShieldCheck,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { getAuthRedirectUrl, supabase } from '../../lib/supabaseClient';
import Logo from '../Logo';

const modes = {
  login: {
    title: 'Welcome back',
    subtitle: 'Sign in to continue to your PianoFlow workspace.',
    action: 'Log in',
  },
  signup: {
    title: 'Create your account',
    subtitle: 'Verify your email after sign up to activate your account.',
    action: 'Sign up',
  },
  forgot: {
    title: 'Reset your password',
    subtitle: 'We will send a secure recovery link to your email.',
    action: 'Send reset link',
  },
  updatePassword: {
    title: 'Set a new password',
    subtitle: 'Choose a strong password for this account.',
    action: 'Update password',
  },
};

const passwordFromUrl = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  return searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery';
};

function AuthView() {
  const [mode, setMode] = useState(passwordFromUrl() ? 'updatePassword' : 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const content = modes[mode];
  const needsPassword = mode !== 'forgot';
  const isSignUp = mode === 'signup';
  const isPasswordUpdate = mode === 'updatePassword';

  const passwordHint = useMemo(() => {
    if (!password || mode === 'login' || mode === 'forgot') return '';
    if (password.length < 8) return 'Use at least 8 characters.';
    return 'Password length looks good.';
  }, [mode, password]);

  const resetFormState = (nextMode) => {
    setMode(nextMode);
    setError('');
    setMessage('');
    setPassword('');
    setConfirmPassword('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();

    if (mode !== 'updatePassword' && !normalizedEmail) {
      setError('Enter your email address.');
      return;
    }

    if (needsPassword && password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if ((isSignUp || isPasswordUpdate) && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (signInError) throw signInError;
      }

      if (mode === 'signup') {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            emailRedirectTo: getAuthRedirectUrl(),
          },
        });

        if (signUpError) throw signUpError;

        if (!data.session) {
          setMessage('Check your inbox to verify your email, then return here to log in.');
        }
      }

      if (mode === 'forgot') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: getAuthRedirectUrl(),
        });

        if (resetError) throw resetError;
        setMessage('Password reset link sent. Check your inbox to continue.');
      }

      if (mode === 'updatePassword') {
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) throw updateError;
        window.history.replaceState({}, document.title, window.location.pathname);
        setMessage('Your password was updated. You can continue securely.');
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-visual" aria-hidden="true">
        <div className="auth-visual__panel">
          <Logo theme="dark" />
          <div className="auth-note-grid">
            {Array.from({ length: 20 }).map((_, index) => (
              <span key={index} style={{ animationDelay: `${index * 0.08}s` }} />
            ))}
          </div>
          <div>
            <p className="auth-eyebrow">Secure access</p>
            <h1>Practice, record, and return to your piano anywhere.</h1>
          </div>
          <div className="auth-trust-row">
            <span><ShieldCheck size={18} /> Supabase Auth</span>
            <span><Music2 size={18} /> PianoFlow</span>
          </div>
        </div>
      </section>

      <section className="auth-panel">
        <motion.div
          initial={{ y: 18, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.35 }}
          className="auth-card"
        >
          <div className="auth-mobile-brand">
            <Logo theme="light" />
          </div>

          <div className="auth-header">
            <p className="auth-eyebrow">Account</p>
            <h2>{content.title}</h2>
            <p>{content.subtitle}</p>
          </div>

          {mode !== 'updatePassword' && (
            <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
              <button
                type="button"
                className={mode === 'login' ? 'active' : ''}
                onClick={() => resetFormState('login')}
              >
                Login
              </button>
              <button
                type="button"
                className={mode === 'signup' ? 'active' : ''}
                onClick={() => resetFormState('signup')}
              >
                Sign Up
              </button>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>
            {mode !== 'updatePassword' && (
              <label className="auth-field">
                <span>Email address</span>
                <div>
                  <Mail size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </label>
            )}

            {needsPassword && (
              <label className="auth-field">
                <span>{isPasswordUpdate ? 'New password' : 'Password'}</span>
                <div>
                  <Lock size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={isPasswordUpdate ? 'new-password' : mode === 'login' ? 'current-password' : 'new-password'}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    className="auth-icon-button"
                    onClick={() => setShowPassword((value) => !value)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {passwordHint && <small>{passwordHint}</small>}
              </label>
            )}

            {(isSignUp || isPasswordUpdate) && (
              <label className="auth-field">
                <span>Confirm password</span>
                <div>
                  <KeyRound size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    placeholder="Repeat password"
                    required
                    minLength={8}
                  />
                </div>
              </label>
            )}

            {mode === 'login' && (
              <button type="button" className="auth-link" onClick={() => resetFormState('forgot')}>
                Forgot password?
              </button>
            )}

            {error && <div className="auth-alert auth-alert--error">{error}</div>}
            {message && (
              <div className="auth-alert auth-alert--success">
                <CheckCircle2 size={18} />
                {message}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
              {isSubmitting ? 'Working...' : content.action}
            </button>
          </form>

          {mode === 'forgot' && (
            <button type="button" className="auth-secondary-action" onClick={() => resetFormState('login')}>
              Back to login
            </button>
          )}
        </motion.div>
      </section>
    </main>
  );
}

export default AuthView;
