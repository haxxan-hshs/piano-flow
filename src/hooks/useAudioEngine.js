import { useRef, useCallback, useState } from 'react';

const useAudioEngine = () => {
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const masterGainRef = useRef(null);
  const destinationRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  
  const [isRecording, setIsRecording] = useState(false);
  const [sustain, setSustain] = useState(false);
  const [analyserNode, setAnalyserNode] = useState(null);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current) return;

    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    analyserRef.current = audioCtxRef.current.createAnalyser();
    setAnalyserNode(analyserRef.current);
    masterGainRef.current = audioCtxRef.current.createGain();
    destinationRef.current = audioCtxRef.current.createMediaStreamDestination();
    
    analyserRef.current.fftSize = 256;
    masterGainRef.current.gain.setValueAtTime(0.5, audioCtxRef.current.currentTime);

    // Connect nodes
    masterGainRef.current.connect(analyserRef.current);
    analyserRef.current.connect(audioCtxRef.current.destination);
    masterGainRef.current.connect(destinationRef.current);
  }, []);

  const playNote = useCallback((frequency) => {
    if (!audioCtxRef.current) initAudio();
    if (audioCtxRef.current.state === 'suspended') audioCtxRef.current.resume();

    const osc = audioCtxRef.current.createOscillator();
    const noteGain = audioCtxRef.current.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime);

    const now = audioCtxRef.current.currentTime;
    const releaseTime = sustain ? 2.5 : 0.8; // Longer release if sustain is on

    noteGain.gain.setValueAtTime(0, now);
    noteGain.gain.linearRampToValueAtTime(0.4, now + 0.05);
    noteGain.gain.exponentialRampToValueAtTime(0.01, now + releaseTime);

    osc.connect(noteGain);
    noteGain.connect(masterGainRef.current);

    osc.start();
    osc.stop(now + releaseTime);
  }, [initAudio, sustain]);

  const startRecording = useCallback(() => {
    if (!audioCtxRef.current) initAudio();
    chunksRef.current = [];
    mediaRecorderRef.current = new MediaRecorder(destinationRef.current.stream);
    
    mediaRecorderRef.current.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'pianoflow-recording.wav';
      a.click();
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  }, [initAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  return {
    playNote,
    startRecording,
    stopRecording,
    isRecording,
    sustain,
    setSustain,
    analyser: analyserNode,
  };
};

export default useAudioEngine;
