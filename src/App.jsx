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
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Check if iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    setIsIOS(isIOSDevice);

    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
      setIsInstalled(true);
    }

    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      console.log('beforeinstallprompt event was fired');
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      console.log('PWA was installed');
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      if (isInstalled) {
        alert("PianoFlow is already installed!");
      } else if (isIOS) {
        alert("To install on iOS: Tap the Share button (square with arrow) and select 'Add to Home Screen'.");
      } else {
        alert("Installation is available in your browser's menu (e.g., 'Install App' or 'Add to Home Screen').");
      }
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
  };

  const isDark = theme === 'dark';

  return (
    <div className={`flex flex-col items-center justify-center w-full min-h-screen transition-colors duration-500 theme-${theme} ${isDark ? 'bg-slate-950' : 'bg-slate-50'}`}>
      <div className="w-full max-w-5xl flex flex-wrap justify-between items-center mb-8 md:mb-12 px-4 relative z-50 gap-4">
        <div className="flex items-center gap-3 md:gap-6">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className={`p-2 md:p-3 rounded-2xl glass-panel text-visible hover:scale-110 transition-transform`}
          >
            <Menu size={20} className="md:w-6 md:h-6" />
          </button>
          <Logo theme={theme} />
        </div>
        
        <div className="flex items-center gap-2 md:gap-4 ml-auto sm:ml-0">
          <button 
            onClick={() => setTheme(isDark ? 'light' : 'dark')} 
            className="btn btn-secondary shadow-lg p-2 md:p-3 rounded-2xl"
          >
            {isDark ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-slate-600" />}
          </button>

          {!isInstalled && (
            <button
              onClick={handleInstallClick}
              className={`btn ${deferredPrompt ? 'btn-primary' : 'btn-secondary'} shadow-lg flex items-center gap-2 px-3 py-2 md:px-6 md:py-3`}
            >
              <Download size={16} className="md:w-5 md:h-5" />
              <span className="font-bold uppercase text-[10px] md:text-xs">Install</span>
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
