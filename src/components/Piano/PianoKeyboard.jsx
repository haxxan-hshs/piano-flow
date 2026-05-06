import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE_NOTES = [
  { note: 'C', type: 'white', key: 'a', freq: 261.63 },
  { note: 'C#', type: 'black', key: 'w', freq: 277.18 },
  { note: 'D', type: 'white', key: 's', freq: 293.66 },
  { note: 'D#', type: 'black', key: 'e', freq: 311.13 },
  { note: 'E', type: 'white', key: 'd', freq: 329.63 },
  { note: 'F', type: 'white', key: 'f', freq: 349.23 },
  { note: 'F#', type: 'black', key: 't', freq: 369.99 },
  { note: 'G', type: 'white', key: 'g', freq: 392.00 },
  { note: 'G#', type: 'black', key: 'y', freq: 415.30 },
  { note: 'A', type: 'white', key: 'h', freq: 440.00 },
  { note: 'A#', type: 'black', key: 'u', freq: 466.16 },
  { note: 'B', type: 'white', key: 'j', freq: 493.88 },
  { note: 'C2', type: 'white', key: 'k', freq: 523.25 },
  { note: 'C#2', type: 'black', key: 'o', freq: 554.37 },
  { note: 'D2', type: 'white', key: 'l', freq: 587.33 },
  { note: 'D#2', type: 'black', key: 'p', freq: 622.25 },
  { note: 'E2', type: 'white', key: ';', freq: 659.25 },
];

const RAINBOW_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#3b82f6', '#6366f1', '#8b5cf6', '#ec4899'];

const PianoKeyboard = ({ onPlayNote, octaveOffset = 0, colorfulKeys = false }) => {
  const [activeKeys, setActiveKeys] = useState(new Set());
  const [notes, setNotes] = useState([]);

  const playNoteWithOffset = useCallback((noteObj) => {
    // Frequency doubles for each octave up
    const frequency = noteObj.freq * Math.pow(2, octaveOffset);
    onPlayNote(frequency);
    addNoteEffect(noteObj.key);
  }, [onPlayNote, octaveOffset]);

  const addNoteEffect = (key) => {
    const id = Date.now() + Math.random();
    setNotes(prev => [...prev, { id, key, startTime: Date.now() }]);
    setTimeout(() => {
      setNotes(prev => prev.filter(n => n.id !== id));
    }, 2000);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      const noteObj = BASE_NOTES.find((n) => n.key === e.key.toLowerCase());
      if (noteObj && !activeKeys.has(noteObj.key)) {
        playNoteWithOffset(noteObj);
        setActiveKeys((prev) => new Set(prev).add(noteObj.key));
      }
    };

    const handleKeyUp = (e) => {
      setActiveKeys((prev) => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    // MIDI Access
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then(midi => {
        for (let input of midi.inputs.values()) {
          input.onmidimessage = (message) => {
            const [command, note, velocity] = message.data;
            if (command === 144 && velocity > 0) { // Note on
              const freq = 440 * Math.pow(2, (note - 69) / 12);
              onPlayNote(freq);
              addNoteEffect(`midi-${note}`);
              setActiveKeys(prev => new Set(prev).add(`midi-${note}`));
            } else if (command === 128 || (command === 144 && velocity === 0)) { // Note off
              setActiveKeys(prev => {
                const next = new Set(prev);
                next.delete(`midi-${note}`);
                return next;
              });
            }
          };
        }
      });
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [playNoteWithOffset, activeKeys, onPlayNote]);

  const handleMouseDown = (note) => {
    playNoteWithOffset(note);
    setActiveKeys((prev) => new Set(prev).add(note.key));
  };

  const handleMouseUp = (key) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  return (
    <div className="keyboard">
      {BASE_NOTES.map((note, index) => {
        const isActive = activeKeys.has(note.key) || activeKeys.has(`midi-${index + 60}`);
        const color = colorfulKeys ? RAINBOW_COLORS[index % RAINBOW_COLORS.length] : null;
        
        return (
          <div
            key={index}
            className={`key ${note.type}-key ${isActive ? 'active' : ''}`}
            onMouseDown={() => handleMouseDown(note)}
            onMouseUp={() => handleMouseUp(note.key)}
            onMouseLeave={() => handleMouseUp(note.key)}
            style={isActive && color ? { boxShadow: `0 0 20px ${color}`, backgroundColor: color } : {}}
          >
            <AnimatePresence>
              {notes.filter(n => n.key === note.key).map(n => (
                <motion.div
                  key={n.id}
                  initial={{ height: 0, opacity: 0.8, y: 0 }}
                  animate={{ height: 300, opacity: 0, y: -400 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 1.5, ease: "linear" }}
                  className="note-layer"
                  style={{ 
                    left: 0, 
                    width: '100%', 
                    backgroundColor: color || (note.type === 'black' ? '#818cf8' : '#6366f1') 
                  }}
                />
              ))}
            </AnimatePresence>
            
            <span className="key-label">{note.key.toUpperCase()}</span>
          </div>
        );
      })}
    </div>
  );
};

export default PianoKeyboard;
