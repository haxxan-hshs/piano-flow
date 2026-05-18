import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bluetooth,
  Download,
  Gauge,
  Loader2,
  LogOut,
  Menu,
  Mic,
  Music2,
  Pause,
  Play,
  Rainbow,
  ShieldCheck,
  SlidersHorizontal,
  Square,
  Volume2,
  X,
} from 'lucide-react';
import AuthView from './components/Auth/AuthView';
import { useAuth } from './context/useAuth';
import { supabase } from './lib/supabaseClient';

const NOTES = [
  { label: 'C', key: 'A', type: 'white', frequency: 261.63 },
  { label: 'C#', key: 'W', type: 'black', frequency: 277.18 },
  { label: 'D', key: 'S', type: 'white', frequency: 293.66 },
  { label: 'D#', key: 'E', type: 'black', frequency: 311.13 },
  { label: 'E', key: 'D', type: 'white', frequency: 329.63 },
  { label: 'F', key: 'F', type: 'white', frequency: 349.23 },
  { label: 'F#', key: 'T', type: 'black', frequency: 369.99 },
  { label: 'G', key: 'G', type: 'white', frequency: 392 },
  { label: 'G#', key: 'Y', type: 'black', frequency: 415.3 },
  { label: 'A', key: 'H', type: 'white', frequency: 440 },
  { label: 'A#', key: 'U', type: 'black', frequency: 466.16 },
  { label: 'B', key: 'J', type: 'white', frequency: 493.88 },
  { label: 'C2', key: 'K', type: 'white', frequency: 523.25 },
];

function PianoApp({ user }) {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const destinationRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const metronomeRef = useRef(null);
  const deferredPromptRef = useRef(null);
  const [activeNote, setActiveNote] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [sustain, setSustain] = useState(false);
  const [rainbowKeys, setRainbowKeys] = useState(false);
  const [midiStatus, setMidiStatus] = useState('Not connected');
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const whiteNotes = useMemo(() => NOTES.filter((note) => note.type === 'white'), []);

  const ensureAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      masterGainRef.current = audioContextRef.current.createGain();
      destinationRef.current = audioContextRef.current.createMediaStreamDestination();
      masterGainRef.current.gain.setValueAtTime(0.75, audioContextRef.current.currentTime);
      masterGainRef.current.connect(audioContextRef.current.destination);
      masterGainRef.current.connect(destinationRef.current);
    }

    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    return audioContextRef.current;
  }, []);

  const playNote = useCallback(
    (note) => {
      const context = ensureAudio();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const now = context.currentTime;
      const releaseTime = sustain ? 2.4 : 0.9;

      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(note.frequency, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.42, now + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      oscillator.connect(gain);
      gain.connect(masterGainRef.current);
      oscillator.start(now);
      oscillator.stop(now + releaseTime + 0.05);

      setActiveNote(note.label);
      window.setTimeout(() => setActiveNote((current) => (current === note.label ? '' : current)), 180);
    },
    [ensureAudio, sustain],
  );

  const playMetronomeClick = useCallback(() => {
    const context = ensureAudio();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const now = context.currentTime;

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(980, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    oscillator.connect(gain);
    gain.connect(masterGainRef.current);
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }, [ensureAudio]);

  useEffect(() => {
    if (!isMetronomeOn) {
      window.clearInterval(metronomeRef.current);
      metronomeRef.current = null;
      return undefined;
    }

    playMetronomeClick();
    metronomeRef.current = window.setInterval(playMetronomeClick, (60 / bpm) * 1000);

    return () => {
      window.clearInterval(metronomeRef.current);
      metronomeRef.current = null;
    };
  }, [bpm, isMetronomeOn, playMetronomeClick]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const note = NOTES.find((item) => item.key.toLowerCase() === event.key.toLowerCase());
      if (!note || event.repeat) return;
      playNote(note);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playNote]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setIsMenuOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      deferredPromptRef.current = event;
      setCanInstall(true);
    };

    const handleInstalled = () => {
      deferredPromptRef.current = null;
      setCanInstall(false);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const startRecording = () => {
    if (!window.MediaRecorder) {
      setSignOutError('Recording is not supported in this browser.');
      return;
    }

    ensureAudio();
    chunksRef.current = [];

    const recorder = new MediaRecorder(destinationRef.current.stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pianoflow-recording-${Date.now()}.webm`;
      link.click();
      URL.revokeObjectURL(url);
      chunksRef.current = [];
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const connectMidi = async () => {
    if (!navigator.requestMIDIAccess) {
      setMidiStatus('MIDI not supported');
      return;
    }

    try {
      const midi = await navigator.requestMIDIAccess();
      let inputCount = 0;

      midi.inputs.forEach((input) => {
        inputCount += 1;
        input.onmidimessage = (message) => {
          const [command, midiNote, velocity] = message.data;
          if (command === 144 && velocity > 0) {
            const frequency = 440 * Math.pow(2, (midiNote - 69) / 12);
            playNote({ label: `MIDI ${midiNote}`, frequency });
          }
        };
      });

      setMidiStatus(inputCount ? 'MIDI Keyboard Connected' : 'No MIDI input found');
    } catch {
      setMidiStatus('MIDI permission denied');
    }
  };

  const installApp = async () => {
    if (isInstalled) return;

    if (!deferredPromptRef.current) {
      alert('Install option will appear when your browser marks the app installable. On mobile, use browser menu > Add to Home screen.');
      return;
    }

    deferredPromptRef.current.prompt();
    const { outcome } = await deferredPromptRef.current.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
      setIsInstalled(true);
    }
    deferredPromptRef.current = null;
  };

  const handleSignOut = async () => {
    setIsSigningOut(true);
    setSignOutError('');

    const { error } = await supabase.auth.signOut();

    if (error) {
      setSignOutError(error.message);
    }

    setIsSigningOut(false);
  };

  return (
    <main className="piano-shell">
      <header className="piano-topbar">
        <div className="brand-row piano-brand">
          <div className="brand-mark" aria-hidden="true">
            <Music2 size={24} />
          </div>
          <div>
            <strong>PianoFlow</strong>
            <span>{user?.email}</span>
          </div>
        </div>

        <div className="topbar-actions">
          {!isInstalled && (
            <button className="install-button" type="button" onClick={installApp}>
              <Download size={18} />
              {canInstall ? 'Install' : 'App'}
            </button>
          )}

          <button
            className="menu-button"
            type="button"
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open tools menu"
            aria-expanded={isMenuOpen}
          >
            <Menu size={20} />
          </button>

          <button className="logout-button" type="button" onClick={handleSignOut} disabled={isSigningOut}>
            {isSigningOut ? <Loader2 className="spin" size={18} /> : <LogOut size={18} />}
            Logout
          </button>
        </div>
      </header>

      <section className="piano-hero">
        <p className="eyebrow">Premium Glass Piano</p>
        <h1>Play your piano anywhere.</h1>
        <p>Tap the keys on mobile or click on desktop. Your Supabase login keeps the app secure.</p>
      </section>

      <section className={`piano-panel ${rainbowKeys ? 'rainbow-mode' : ''}`} aria-label="Interactive piano">
        <div className="sound-card">
          <Volume2 size={20} />
          <div>
            <span>Now playing</span>
            <strong>{activeNote || 'Tap a key'}</strong>
          </div>
        </div>

        <div className="piano-scroll">
          <div className="piano-keyboard" role="group" aria-label="Piano keys">
            {whiteNotes.map((whiteNote) => {
              const blackNote = NOTES.find(
                (note) => note.type === 'black' && NOTES.indexOf(note) === NOTES.indexOf(whiteNote) + 1,
              );

              return (
                <div className="key-group" key={whiteNote.label}>
                  <button
                    className={`piano-key white-key ${activeNote === whiteNote.label ? 'is-active' : ''}`}
                    type="button"
                    onPointerDown={() => playNote(whiteNote)}
                  >
                    <span>{whiteNote.label}</span>
                    <small>{whiteNote.key}</small>
                  </button>

                  {blackNote && (
                    <button
                      className={`piano-key black-key ${activeNote === blackNote.label ? 'is-active' : ''}`}
                      type="button"
                      onPointerDown={() => playNote(blackNote)}
                    >
                      <span>{blackNote.label}</span>
                      <small>{blackNote.key}</small>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {isMenuOpen && (
        <div className="menu-overlay" role="presentation" onClick={() => setIsMenuOpen(false)}>
          <aside className="tools-menu" aria-label="Piano tools" onClick={(event) => event.stopPropagation()}>
            <div className="tools-head">
              <div>
                <p className="eyebrow">Studio Menu</p>
                <h2>Music Tools</h2>
              </div>
              <button className="icon-button menu-close" type="button" onClick={() => setIsMenuOpen(false)} aria-label="Close menu">
                <X size={20} />
              </button>
            </div>

            <div className="tool-group">
              <button
                className={`tool-action ${isRecording ? 'danger' : ''}`}
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
              >
                {isRecording ? <Square size={19} /> : <Mic size={19} />}
                {isRecording ? 'Stop & Download Recording' : 'Record Music'}
              </button>
            </div>

            <div className="tool-card">
              <div className="tool-title">
                <Gauge size={18} />
                <span>Tempo</span>
                <strong>{bpm} BPM</strong>
              </div>
              <input
                type="range"
                min="50"
                max="220"
                value={bpm}
                onChange={(event) => setBpm(Number(event.target.value))}
              />
              <button className="tool-action secondary" type="button" onClick={() => setIsMetronomeOn((value) => !value)}>
                {isMetronomeOn ? <Pause size={18} /> : <Play size={18} />}
                {isMetronomeOn ? 'Stop Metronome' : 'Start Metronome'}
              </button>
            </div>

            <div className="tool-card compact">
              <button className={`toggle-row ${sustain ? 'is-on' : ''}`} type="button" onClick={() => setSustain((value) => !value)}>
                <SlidersHorizontal size={18} />
                <span>Sustain Pedal</span>
                <strong>{sustain ? 'ON' : 'OFF'}</strong>
              </button>
              <button className={`toggle-row ${rainbowKeys ? 'is-on' : ''}`} type="button" onClick={() => setRainbowKeys((value) => !value)}>
                <Rainbow size={18} />
                <span>Rainbow Neon Keys</span>
                <strong>{rainbowKeys ? 'ON' : 'OFF'}</strong>
              </button>
            </div>

            <div className="tool-card compact">
              <button className="tool-action secondary" type="button" onClick={connectMidi}>
                <Bluetooth size={18} />
                Connect MIDI Keyboard
              </button>
              <p className="menu-status">{midiStatus}</p>
            </div>

            {!isInstalled && (
              <button className="tool-action install-wide" type="button" onClick={installApp}>
                <Download size={18} />
                Install App
              </button>
            )}
          </aside>
        </div>
      )}

      {signOutError && <p className="form-message form-message--error">{signOutError}</p>}
    </main>
  );
}

function App() {
  const { user, isAuthenticated, isLoadingSession, isSupabaseConfigured } = useAuth();

  if (isLoadingSession) {
    return (
      <main className="app-loader" aria-live="polite">
        <Loader2 className="spin" size={24} />
        <span>Loading PianoFlow</span>
      </main>
    );
  }

  if (!isSupabaseConfigured) {
    return (
      <main className="account-shell">
        <section className="account-card">
          <div className="brand-mark" aria-hidden="true">
            <ShieldCheck size={26} />
          </div>
          <div className="account-copy">
            <p className="eyebrow">Setup required</p>
            <h1>Supabase env vars missing.</h1>
            <p>
              Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your deployment environment,
              then redeploy the app.
            </p>
          </div>
        </section>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <AuthView />;
  }

  return <PianoApp user={user} />;
}

export default App;
