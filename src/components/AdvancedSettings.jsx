import { useState, useEffect, useRef } from 'react';
import { 
  Settings, Mic, Square, Play, Pause, 
  Maximize, Bluetooth, Sparkles, X, 
  Music
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AdvancedSettings = ({ 
  isOpen,
  onClose,
  isRecording, 
  onStartRecording, 
  onStopRecording, 
  sustain, 
  setSustain, 
  theme, 
  colorfulKeys, 
  setColorfulKeys,
  octaveOffset,
  setOctaveOffset
}) => {
  const [bpm, setBpm] = useState(120);
  const [metronomeActive, setMetronomeActive] = useState(false);
  const metronomeInterval = useRef(null);
  const metronomeCtx = useRef(null);

  const playClick = () => {
    if (!metronomeCtx.current) {
      metronomeCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = metronomeCtx.current;
    if (ctx.state === 'suspended') ctx.resume();
    
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.connect(g);
    g.connect(ctx.destination);
    osc.frequency.value = 1000;
    g.gain.setValueAtTime(0.1, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  };

  const toggleMetronome = () => {
    if (metronomeActive) {
      clearInterval(metronomeInterval.current);
    } else {
      playClick();
      const interval = (60 / bpm) * 1000;
      metronomeInterval.current = setInterval(playClick, interval);
    }
    setMetronomeActive(!metronomeActive);
  };

  useEffect(() => {
    if (metronomeActive) {
      clearInterval(metronomeInterval.current);
      const interval = (60 / bpm) * 1000;
      metronomeInterval.current = setInterval(playClick, interval);
    }
    return () => clearInterval(metronomeInterval.current);
  }, [bpm, metronomeActive]);

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const connectMIDI = async () => {
    try {
      await navigator.requestMIDIAccess();
      alert("MIDI Keyboard Connected Successfully!");
    } catch {
      alert("MIDI not supported or no device found.");
    }
  };

  const isDark = theme === 'dark';

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="sidebar-overlay"
          />
        )}
      </AnimatePresence>

      <div className={`sidebar glass-panel ${isOpen ? 'open' : ''} ${isDark ? 'theme-dark' : 'theme-light'}`}>
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-xl font-bold flex items-center gap-2 text-visible">
            <Settings size={20} />
            Features
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-visible">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto pr-2">
          {/* Recording Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase opacity-50 text-visible">Recording</span>
            <button 
              onClick={isRecording ? onStopRecording : onStartRecording}
              className={`btn w-full justify-start ${isRecording ? 'bg-red-500 text-white' : 'btn-secondary'}`}
            >
              {isRecording ? <Square size={18} /> : <Mic size={18} />}
              {isRecording ? 'Stop Recording' : 'Start Recording'}
            </button>
          </div>

          {/* Metronome Section */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase opacity-50 text-visible">Metronome</span>
            <button onClick={toggleMetronome} className={`btn w-full justify-start ${metronomeActive ? 'btn-primary' : 'btn-secondary'}`}>
              {metronomeActive ? <Pause size={18} /> : <Play size={18} />}
              {metronomeActive ? 'Stop' : 'Start'} Metronome
            </button>
            <div className="flex flex-col gap-2 p-3 bg-white/5 rounded-xl">
              <div className="flex justify-between text-xs font-bold text-visible">
                <span>Tempo</span>
                <span>{bpm} BPM</span>
              </div>
              <input 
                type="range" min="40" max="220" value={bpm} 
                onChange={(e) => setBpm(e.target.value)}
                className="w-full accent-indigo-500"
              />
            </div>
          </div>

          {/* Piano Settings */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase opacity-50 text-visible">Piano Engine</span>
            <button 
              onClick={() => setSustain(!sustain)}
              className={`btn w-full justify-start ${sustain ? 'btn-primary' : 'btn-secondary'}`}
            >
              <Music size={18} />
              Sustain Pedal: {sustain ? 'ON' : 'OFF'}
            </button>
            
            <div className="flex items-center justify-between btn-secondary p-3 rounded-xl">
              <span className="text-sm font-bold text-visible">Octave Shift</span>
              <div className="flex items-center gap-3">
                <button onClick={() => setOctaveOffset(o => Math.max(-2, o - 1))} className="p-1 hover:bg-white/20 rounded text-visible">-</button>
                <span className="w-4 text-center font-bold text-visible">{octaveOffset}</span>
                <button onClick={() => setOctaveOffset(o => Math.min(2, o + 1))} className="p-1 hover:bg-white/20 rounded text-visible">+</button>
              </div>
            </div>
          </div>

          {/* Visual Options */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase opacity-50 text-visible">Visuals</span>
            <button onClick={() => setColorfulKeys(!colorfulKeys)} className={`btn w-full justify-start ${colorfulKeys ? 'btn-primary' : 'btn-secondary'}`}>
              <Sparkles size={18} />
              Rainbow Keys: {colorfulKeys ? 'ON' : 'OFF'}
            </button>
            <button onClick={toggleFullScreen} className="btn btn-secondary w-full justify-start">
              <Maximize size={18} />
              Full Screen
            </button>
          </div>

          {/* Hardware */}
          <div className="flex flex-col gap-3">
            <span className="text-xs font-bold uppercase opacity-50 text-visible">Hardware</span>
            <button onClick={connectMIDI} className="btn btn-primary w-full justify-start">
              <Bluetooth size={18} />
              Connect MIDI Keyboard
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdvancedSettings;
