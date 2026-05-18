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

const SOUND_PRESETS = {
  glass: {
    label: 'Glass Piano',
    engine: 'webAudio',
    oscillator: 'triangle',
    attack: 0.018,
    decay: 0.18,
    sustain: 0.2,
    release: 1.05,
    brightness: 1,
  },
  warm: {
    label: 'Warm Classic',
    engine: 'webAudio',
    oscillator: 'sine',
    attack: 0.024,
    decay: 0.26,
    sustain: 0.28,
    release: 1.3,
    brightness: 0.72,
  },
  electric: {
    label: 'Electric Keys',
    engine: 'tone',
    oscillator: 'fmsine',
    attack: 0.01,
    decay: 0.22,
    sustain: 0.22,
    release: 1,
  },
  bell: {
    label: 'Crystal Bell',
    engine: 'tone',
    oscillator: 'amsine',
    attack: 0.006,
    decay: 0.36,
    sustain: 0.05,
    release: 1.5,
  },
  soft: {
    label: 'Soft Pad',
    engine: 'webAudio',
    oscillator: 'sine',
    attack: 0.08,
    decay: 0.34,
    sustain: 0.42,
    release: 2,
    brightness: 0.55,
  },
};

function SplashIntro({ onFinish }) {
  useEffect(() => {
    const timer = window.setTimeout(onFinish, 1800);
    return () => window.clearTimeout(timer);
  }, [onFinish]);

  return (
    <section className="splash-intro" aria-label="Opening PianoFlow">
      <div className="splash-card">
        <div className="splash-logo" aria-hidden="true">
          <Music2 size={34} />
          <div className="splash-keys">
            <span />
            <span />
            <span />
          </div>
        </div>
        <p className="eyebrow">Welcome to</p>
        <h1>PianoFlow</h1>
        <p>Secure piano studio with recording, neon keys, MIDI, and app install.</p>
        <button className="splash-skip" type="button" onClick={onFinish}>
          Open App
        </button>
      </div>
    </section>
  );
}

function PianoApp({ user }) {
  const audioContextRef = useRef(null);
  const masterGainRef = useRef(null);
  const destinationRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const metronomeRef = useRef(null);
  const deferredPromptRef = useRef(null);
  const toneSynthRef = useRef(null);
  const toneReverbRef = useRef(null);
  const toneModuleRef = useRef(null);
  const howlModuleRef = useRef(null);
  const clickHowlRef = useRef(null);
  const [activeNote, setActiveNote] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [sustain, setSustain] = useState(false);
  const [velocitySensitivity, setVelocitySensitivity] = useState(true);
  const [realisticPressure, setRealisticPressure] = useState(true);
  const [reverb, setReverb] = useState(false);
  const [soundPreset, setSoundPreset] = useState('glass');
  const [rainbowKeys, setRainbowKeys] = useState(false);
  const [midiStatus, setMidiStatus] = useState('Not connected');
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(
    () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true,
  );
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState('');

  const whiteNotes = useMemo(() => NOTES.filter((note) => note.type === 'white'), []);
  const selectedPreset = SOUND_PRESETS[soundPreset];

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

  const getToneModule = useCallback(async () => {
    if (!toneModuleRef.current) {
      toneModuleRef.current = await import('tone');
    }

    return toneModuleRef.current;
  }, []);

  const playKeyClick = useCallback(async () => {
    if (!howlModuleRef.current) {
      howlModuleRef.current = await import('howler');
    }

    if (!clickHowlRef.current) {
      clickHowlRef.current = new howlModuleRef.current.Howl({
        src: [
          'data:audio/wav;base64,UklGRjIAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQ4AAAAAAP//AAAA//8AAP//AAA=',
        ],
        volume: 0.08,
      });
    }

    clickHowlRef.current.play();
  }, []);

  const ensureToneSynth = useCallback(async () => {
    ensureAudio();
    const Tone = await getToneModule();
    await Tone.start();

    if (!toneReverbRef.current) {
      toneReverbRef.current = new Tone.Reverb({ decay: 3, wet: 0.28 }).toDestination();
    }

    if (!toneSynthRef.current || toneSynthRef.current.presetKey !== soundPreset) {
      toneSynthRef.current?.dispose();
      const preset = SOUND_PRESETS[soundPreset];
      const synth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: preset.oscillator },
        envelope: {
          attack: preset.attack,
          decay: preset.decay,
          sustain: preset.sustain,
          release: sustain ? preset.release + 1.2 : preset.release,
        },
      });

      synth.presetKey = soundPreset;
      synth.connect(reverb ? toneReverbRef.current : Tone.Destination);
      toneSynthRef.current = synth;
    }

    return toneSynthRef.current;
  }, [ensureAudio, getToneModule, reverb, soundPreset, sustain]);

  useEffect(() => {
    if (!toneSynthRef.current) return;

    let isMounted = true;

    const reconnect = async () => {
      const Tone = await getToneModule();
      if (!isMounted || !toneSynthRef.current) return;

      toneSynthRef.current.disconnect();
      toneSynthRef.current.connect(reverb && toneReverbRef.current ? toneReverbRef.current : Tone.Destination);
    };

    reconnect();

    return () => {
      isMounted = false;
    };
  }, [getToneModule, reverb]);

  useEffect(
    () => () => {
      clickHowlRef.current?.unload();
      toneSynthRef.current?.dispose();
      toneReverbRef.current?.dispose();
    },
    [],
  );

  const getVelocity = useCallback(
    (note, pressure = 0.65) => {
      if (!velocitySensitivity) return 0.76;

      const normalizedPressure = Math.min(1, Math.max(0.18, pressure || 0.65));
      const octaveLift = note.frequency > 500 ? 0.92 : 1;
      return Math.min(0.98, Math.max(0.2, normalizedPressure * octaveLift));
    },
    [velocitySensitivity],
  );

  const playNote = useCallback(
    async (note, pressure = 0.65) => {
      const velocity = getVelocity(note, pressure);

      if (selectedPreset.engine === 'tone') {
        const Tone = await getToneModule();
        const synth = await ensureToneSynth();
        const midi = 69 + 12 * Math.log2(note.frequency / 440);
        const toneNote = Tone.Frequency(Math.round(midi), 'midi').toNote();
        synth.triggerAttackRelease(toneNote, sustain ? '1.8n' : '8n', undefined, velocity);
        playKeyClick();
        setActiveNote(note.label);
        window.setTimeout(() => setActiveNote((current) => (current === note.label ? '' : current)), 180);
        return;
      }

      const context = ensureAudio();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const filter = context.createBiquadFilter();
      const convolver = reverb ? context.createConvolver() : null;
      const now = context.currentTime;
      const releaseTime = sustain ? selectedPreset.release + 1.3 : selectedPreset.release;
      const attack = realisticPressure ? selectedPreset.attack + (1 - velocity) * 0.04 : selectedPreset.attack;

      oscillator.type = selectedPreset.oscillator;
      oscillator.frequency.setValueAtTime(note.frequency, now);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + velocity * 3800 * selectedPreset.brightness, now);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.48 * velocity, now + attack);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.02, selectedPreset.sustain * velocity), now + attack + selectedPreset.decay);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + releaseTime);

      if (convolver) {
        const seconds = 1.8;
        const sampleRate = context.sampleRate;
        const length = sampleRate * seconds;
        const impulse = context.createBuffer(2, length, sampleRate);

        for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
          const channelData = impulse.getChannelData(channel);
          for (let index = 0; index < length; index += 1) {
            channelData[index] = (Math.random() * 2 - 1) * (1 - index / length) ** 2;
          }
        }

        convolver.buffer = impulse;
      }

      oscillator.connect(filter);
      filter.connect(gain);
      gain.connect(masterGainRef.current);
      if (convolver) {
        gain.connect(convolver);
        convolver.connect(masterGainRef.current);
      }
      oscillator.start(now);
      oscillator.stop(now + releaseTime + 0.05);
      playKeyClick();

      setActiveNote(note.label);
      window.setTimeout(() => setActiveNote((current) => (current === note.label ? '' : current)), 180);
    },
    [ensureAudio, ensureToneSynth, getToneModule, getVelocity, playKeyClick, realisticPressure, reverb, selectedPreset, sustain],
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
      playNote(note, 0.7);
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
          <strong>{activeNote || selectedPreset.label}</strong>
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
                    onPointerDown={(event) => playNote(whiteNote, event.pressure || 0.65)}
                  >
                    <span>{whiteNote.label}</span>
                    <small>{whiteNote.key}</small>
                  </button>

                  {blackNote && (
                    <button
                      className={`piano-key black-key ${activeNote === blackNote.label ? 'is-active' : ''}`}
                      type="button"
                      onPointerDown={(event) => playNote(blackNote, event.pressure || 0.78)}
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
              <div className="tool-section-title">
                <Music2 size={18} />
                <span>Sound Engine</span>
              </div>
              <label className="select-field">
                <span>Select tone</span>
                <select value={soundPreset} onChange={(event) => setSoundPreset(event.target.value)}>
                  {Object.entries(SOUND_PRESETS).map(([key, preset]) => (
                    <option key={key} value={key}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className={`toggle-row ${sustain ? 'is-on' : ''}`} type="button" onClick={() => setSustain((value) => !value)}>
                <SlidersHorizontal size={18} />
                <span>Sustain Pedal</span>
                <strong>{sustain ? 'ON' : 'OFF'}</strong>
              </button>
              <button className={`toggle-row ${velocitySensitivity ? 'is-on' : ''}`} type="button" onClick={() => setVelocitySensitivity((value) => !value)}>
                <Gauge size={18} />
                <span>Velocity Sensitivity</span>
                <strong>{velocitySensitivity ? 'ON' : 'OFF'}</strong>
              </button>
              <button className={`toggle-row ${reverb ? 'is-on' : ''}`} type="button" onClick={() => setReverb((value) => !value)}>
                <Volume2 size={18} />
                <span>Reverb</span>
                <strong>{reverb ? 'ON' : 'OFF'}</strong>
              </button>
              <button className={`toggle-row ${realisticPressure ? 'is-on' : ''}`} type="button" onClick={() => setRealisticPressure((value) => !value)}>
                <ShieldCheck size={18} />
                <span>Realistic Key Pressure</span>
                <strong>{realisticPressure ? 'ON' : 'OFF'}</strong>
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
  const [showSplash, setShowSplash] = useState(true);

  const finishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (isLoadingSession) {
    return (
      <main className="app-loader" aria-live="polite">
        <Loader2 className="spin" size={24} />
        <span>Loading PianoFlow</span>
      </main>
    );
  }

  if (showSplash) {
    return <SplashIntro onFinish={finishSplash} />;
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
