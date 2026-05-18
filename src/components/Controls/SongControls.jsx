import { useRef, useState } from 'react';
import { Play, Pause, Upload, Volume2 } from 'lucide-react';

const SongControls = ({ connectSource }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileInputRef = useRef(null);
  const audioRef = useRef(new Audio());
  const sourceConnectedRef = useRef(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      
      if (!sourceConnectedRef.current) {
        connectSource(audioRef.current);
        sourceConnectedRef.current = true;
      }
    }
  };

  const togglePlay = () => {
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolume = (e) => {
    audioRef.current.volume = e.target.value;
  };

  return (
    <div className="controls-panel glass-panel">
      <div className="flex items-center gap-4">
        <button className="btn btn-primary" onClick={() => fileInputRef.current.click()}>
          <Upload size={20} />
          {fileName ? 'Change Song' : 'Upload Song'}
        </button>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="audio/*"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
        
        {fileName && (
          <div className="flex items-center gap-4">
            <span className="text-sm opacity-70">{fileName}</span>
            <button className="btn" onClick={togglePlay}>
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <div className="flex items-center gap-2">
              <Volume2 size={20} />
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.1" 
                defaultValue="0.5" 
                onChange={handleVolume}
                className="w-24 accent-purple-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SongControls;
