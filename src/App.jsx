import React, { useState, useEffect } from 'react';
import useAudioEngine from './hooks/useAudioEngine';
import PianoKeyboard from './components/Piano/PianoKeyboard';
import AudioVisualizer from './components/AudioVisualizer';
import Logo from './components/Logo';
import AdvancedSettings from './components/AdvancedSettings';
import { Download, Sparkles, Menu, Moon, Sun } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

function App() {
  const { playNote, analyser, startRecording, stopRecording, isRecording, sustain, setSustain } = useAudioEngine();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [theme, setTheme] = useState('light');
  const [colorfulKeys, setColorfulKeys] = useState(false);
  const [octaveOffset, setOctaveOffset] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } else {
      alert("Installation is only available in supported browsers (like Chrome/Edge).");
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col items-center justify-center w-full min-h-screen transition-colors duration-500 theme-${theme} ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="w-full max-w-5xl flex justify-between items-center mb-12 px-4 relative z-50">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`p-3 rounded-2xl glass-panel text-visible hover:scale-110 transition-transform`}
          >
            <Menu size={24} />
          </button>
          <Logo theme={theme} />
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')} 
            className="btn btn-secondary shadow-lg p-3 rounded-2xl"
          >
            {isDark ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-slate-600" />}
          </button>

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className={`btn ${deferredPrompt ? 'btn-primary' : 'btn-secondary'} shadow-lg flex items-center gap-2`}
            >
              <Download size={18} />
              <span className="font-bold uppercase text-xs">Install App</span>
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-5xl px-4">
        <AudioVisualizer analyser={analyser} theme={theme} />
        
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.8 }}
          className={`piano-container glass-panel ${isDark ? 'bg-white/5 border-white/10' : 'bg-white/70 border-white/50'}`}
        >
          <PianoKeyboard 
            onPlayNote={playNote} 
            octaveOffset={octaveOffset}
            colorfulKeys={colorfulKeys}
          />
        </motion.div>
      </div>

      <AdvancedSettings 
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isRecording={isRecording}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
        sustain={sustain}
        setSustain={setSustain}
        theme={theme}
        colorfulKeys={colorfulKeys}
        setColorfulKeys={setColorfulKeys}
        octaveOffset={octaveOffset}
        setOctaveOffset={setOctaveOffset}
      />

      <footer className={`mt-12 text-sm text-visible opacity-50`}>
        <p>Unleash your musical creativity with PianoFlow</p>
      </footer>
    </div>
  );
}

export default App;
