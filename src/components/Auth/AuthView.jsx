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
  ShieldCheck,
} from 'lucide-react';
import { getAuthRedirectUrl, supabase } from '../../lib/supabaseClient';

const modeContent = {
  login: {
    eyebrow: 'Secure access',
    title: 'Welcome back',
    subtitle: 'Log in with your verified email to continue.',
    action: 'Login',
  },
  signup: {
    eyebrow: 'Create account',
    title: 'Start securely',
    subtitle: 'Create your account and verify your email before signing in.',
    action: 'Sign up',
  },
  forgot: {
    eyebrow: 'Password recovery',
    title: 'Reset password',
    subtitle: 'Enter your email and we will send a secure reset link.',
    action: 'Send reset link',
  },
  updatePassword: {
    eyebrow: 'New password',
    title: 'Update password',
    subtitle: 'Choose a strong new password for this account.',
    action: 'Update password',
  },
};

const getInitialMode = () => {
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const type = searchParams.get('type') || hashParams.get('type');

  return type === 'recovery' ? 'updatePassword' : 'login';
};

function AuthView() {
  const [mode, setMode] = useState(getInitialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const content = modeContent[mode];
  const needsPassword = mode !== 'forgot';
  const needsConfirmation = mode === 'signup' || mode === 'updatePassword';

  const passwordHelper = useMemo(() => {
    if (!password || mode === 'login' || mode === 'forgot') return '';
    return password.length >= 8 ? 'Password length looks good.' : 'Use at least 8 characters.';
  }, [mode, password]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    setMessage('');
    setError('');
  };

  const validateForm = (normalizedEmail) => {
    if (mode !== 'updatePassword' && !normalizedEmail) return 'Enter your email address.';
    if (needsPassword && password.length < 8) return 'Password must be at least 8 characters.';
    if (needsConfirmation && password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');

    const normalizedEmail = email.trim().toLowerCase();
    const validationError = validateForm(normalizedEmail);

    if (validationError) {
      setError(validationError);
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
          setMessage('Verification email sent. Confirm your email, then return to login.');
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
        setMessage('Password updated successfully. Your session is secure.');
      }
    } catch (authError) {
      setError(authError.message || 'Authentication failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={24} />
          </div>
          <div>
            <strong>AuthFlow</strong>
            <span>Supabase Authentication</span>
          </div>
        </div>

        <header className="auth-header">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 id="auth-title">{content.title}</h1>
          <p>{content.subtitle}</p>
        </header>

        {mode !== 'updatePassword' && (
          <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => switchMode('signup')}
            >
              Sign Up
            </button>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode !== 'updatePassword' && (
            <label className="form-field">
              <span>Email address</span>
              <div className="input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </label>
          )}

          {needsPassword && (
            <label className="form-field">
              <span>{mode === 'updatePassword' ? 'New password' : 'Password'}</span>
              <div className="input-wrap">
                <Lock size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {passwordHelper && <small>{passwordHelper}</small>}
            </label>
          )}

          {needsConfirmation && (
            <label className="form-field">
              <span>Confirm password</span>
              <div className="input-wrap">
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
            <button type="button" className="text-button" onClick={() => switchMode('forgot')}>
              Forgot password?
            </button>
          )}

          {error && <p className="form-message form-message--error">{error}</p>}
          {message && (
            <p className="form-message form-message--success">
              <CheckCircle2 size={18} />
              {message}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="spin" size={18} /> : <ArrowRight size={18} />}
            {isSubmitting ? 'Please wait...' : content.action}
          </button>
        </form>

        {mode === 'forgot' && (
          <button type="button" className="secondary-button" onClick={() => switchMode('login')}>
            Back to login
          </button>
        )}
      </section>
    </main>
  );
}

export default AuthView;
