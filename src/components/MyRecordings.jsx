import { useEffect, useRef, useState } from 'react';
import {
  ArrowUpDown,
  Check,
  CheckSquare,
  Clock,
  Edit3,
  FastForward,
  FileAudio,
  FolderOpen,
  HardDrive,
  Heart,
  Music,
  Pause,
  Play,
  Rewind,
  Search,
  Share2,
  Square,
  SquareSquare,
  Trash2,
  Upload,
  Volume2,
} from 'lucide-react';
import { recordingsDB } from '../lib/recordingsDB';

export default function MyRecordings({ 
  refreshTrigger, 
  onNewPlay, 
  activeBackingTrack, 
  onBackingTrackConnect 
}) {
  const [recordings, setRecordings] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // latest, oldest, largest, name
  const [isGridLayout, setIsGridLayout] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [loading, setLoading] = useState(true);

  // Audio Player State
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);

  // Refs
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const animationFrameRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);

  // Load recordings on mount and refreshTrigger change
  const loadRecordings = async () => {
    try {
      setLoading(true);
      const data = await recordingsDB.getAllRecordings();
      setRecordings(data);
    } catch (error) {
      console.error('Error loading recordings:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, [refreshTrigger]);

  // Handle Play directly from outside (e.g. when app starts recording, it can auto refresh)
  useEffect(() => {
    if (onNewPlay) {
      loadRecordings();
    }
  }, [onNewPlay]);

  // Audio Event Handlers
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => {
      setIsPlaying(true);
      setupAudioVisualizer();
    };

    const handlePause = () => {
      setIsPlaying(false);
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const handleDurationChange = () => {
      if (!isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [currentTrack]);

  // Setup Web Audio Analyser for the Waveform Canvas
  const setupAudioVisualizer = () => {
    const audio = audioRef.current;
    if (!audio || !canvasRef.current) return;

    // Initialize AudioContext only once on user interaction
    if (!audioContextRef.current) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      audioContextRef.current = new AudioCtx();
    }

    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (!analyserRef.current) {
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;
    }

    // Connect source to analyser and output
    if (!sourceRef.current) {
      try {
        const source = ctx.createMediaElementSource(audio);
        source.connect(analyserRef.current);
        analyserRef.current.connect(ctx.destination);
        sourceRef.current = source;
      } catch (err) {
        // Source already connected error might occur on re-render, ignore
      }
    }

    // Start drawing
    drawVisualizer();
  };

  const drawVisualizer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const analyser = analyserRef.current;

    if (!analyser || !isPlaying) {
      // Draw a subtle resting wave
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = 'rgba(54, 88, 245, 0.4)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let i = 0; i < width; i++) {
        const y = height / 2 + Math.sin(i * 0.05) * 2;
        if (i === 0) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying || !canvasRef.current) return;

      animationFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, width, height);

      // Create Gradient
      const isDark = document.body.classList.contains('dark-theme') || 
                     document.documentElement.classList.contains('dark-theme');
      
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#3658f5'); // Brand Blue
      gradient.addColorStop(0.5, '#ec4899'); // Neon Pink
      gradient.addColorStop(1, '#a855f7'); // Violet Purple

      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const offset = (v - 1.0) * (height / 2.2);
        const y = height / 2 + offset;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Draw mirrored glow
      ctx.save();
      ctx.globalAlpha = 0.25;
      ctx.shadowBlur = 12;
      ctx.shadowColor = '#3658f5';
      ctx.stroke();
      ctx.restore();
    };

    draw();
  };

  // Stop rendering visualizer when paused/stopped
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Re-draw resting wave
      setTimeout(() => drawVisualizer(), 50);
    }
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  // Audio Actions
  const playTrack = (track) => {
    if (currentTrack?.id === track.id) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log('Audio playback error:', e));
      }
    } else {
      // Create Object URL for Blob
      const url = URL.createObjectURL(track.blob);
      
      // Clean up previous URL if any
      if (currentTrack?.url) {
        URL.revokeObjectURL(currentTrack.url);
      }

      setCurrentTrack({
        ...track,
        url: url
      });
      setCurrentTime(0);

      // Play new source
      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.play().catch(e => console.log('Audio playback error:', e));
        }
      }, 50);
    }
  };

  const handlePlayPause = () => {
    if (!currentTrack && recordings.length > 0) {
      playTrack(recordings[0]);
    } else if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(e => console.log('Audio playback error:', e));
      }
    }
  };

  const handleStop = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  const handleSkip = (seconds) => {
    if (audioRef.current) {
      let newTime = audioRef.current.currentTime + seconds;
      if (newTime < 0) newTime = 0;
      if (newTime > duration) newTime = duration;
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (audioRef.current) {
      audioRef.current.volume = val;
    }
    if (val === 0) {
      setIsMuted(true);
    } else {
      setIsMuted(false);
    }
  };

  const handleToggleMute = () => {
    if (audioRef.current) {
      const nextMute = !isMuted;
      setIsMuted(nextMute);
      audioRef.current.muted = nextMute;
    }
  };

  // Format Helper functions
  const formatTime = (timeInSec) => {
    if (isNaN(timeInSec)) return '0:00';
    const mins = Math.floor(timeInSec / 60);
    const secs = Math.floor(timeInSec % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) + ' ' + date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const formatSize = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Database Interactions
  const handleRename = async (id, trackType) => {
    if (!editName.trim()) return;
    try {
      const ext = trackType ? (trackType.split('/')[1] || 'webm') : 'webm';
      const cleanExt = ext === 'x-matroska' || ext === 'webm' ? 'webm' : ext;
      const cleanName = editName.trim().endsWith(`.${cleanExt}`) 
        ? editName.trim()
        : `${editName.trim()}.${cleanExt}`;
      
      await recordingsDB.updateRecording(id, { name: cleanName });
      if (currentTrack?.id === id) {
        setCurrentTrack(prev => ({ ...prev, name: cleanName }));
      }
      setEditingId(null);
      setEditName('');
      loadRecordings();
    } catch (error) {
      console.error('Failed to rename recording:', error);
    }
  };

  const handleToggleFavorite = async (e, id, currentFav) => {
    e.stopPropagation();
    try {
      await recordingsDB.updateRecording(id, { favorite: !currentFav });
      loadRecordings();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this recording?')) return;
    try {
      await recordingsDB.deleteRecording(id);
      if (currentTrack?.id === id) {
        handleStop();
        setCurrentTrack(null);
      }
      loadRecordings();
    } catch (error) {
      console.error('Failed to delete recording:', error);
    }
  };

  const handleShare = async (e, track) => {
    e.stopPropagation();
    const file = new File([track.blob], track.name, { type: track.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: track.name,
          text: 'Listen to my recording from PianoFlow!',
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          downloadFallback(track);
        }
      }
    } else {
      downloadFallback(track);
    }
  };

  const downloadFallback = (track) => {
    const url = URL.createObjectURL(track.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = track.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Multi-select management
  const handleToggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedIds.length === filteredAndSortedRecordings.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredAndSortedRecordings.map(x => x.id));
    }
  };

  const handleDeleteSelected = async () => {
    if (!confirm(`Are you sure you want to delete the ${selectedIds.length} selected recordings?`)) return;
    try {
      await recordingsDB.deleteMultipleRecordings(selectedIds);
      if (selectedIds.includes(currentTrack?.id)) {
        handleStop();
        setCurrentTrack(null);
      }
      setSelectedIds([]);
      loadRecordings();
    } catch (error) {
      console.error('Failed to delete selected recordings:', error);
    }
  };

  // File Import Logic
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    for (const file of files) {
      // Calculate duration via a temporary audio object
      const objectUrl = URL.createObjectURL(file);
      const tempAudio = new Audio(objectUrl);

      tempAudio.addEventListener('loadedmetadata', async () => {
        const duration = tempAudio.duration || 0;
        URL.revokeObjectURL(objectUrl);

        try {
          const newId = await recordingsDB.addRecording(
            file, // The file is a Blob subclass
            file.name,
            duration,
            file.size
          );
          loadRecordings();

          // Auto-connect as active backing track
          const importedTrack = {
            id: newId,
            name: file.name,
            blob: file,
            type: file.type || 'audio/webm',
            duration: duration,
            size: file.size,
            date: new Date().toISOString(),
            favorite: false
          };
          if (onBackingTrackConnect) {
            onBackingTrackConnect(importedTrack);
          }
        } catch (error) {
          alert('Failed to import file: ' + file.name);
          console.error(error);
        }
      });

      tempAudio.load();
    }
    
    // Reset file input
    e.target.value = '';
  };

  // Search & Filter Logic
  const filteredAndSortedRecordings = recordings
    .filter(track => track.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.date) - new Date(b.date);
        case 'largest':
          return b.size - a.size;
        case 'name':
          return a.name.localeCompare(b.name);
        case 'latest':
        default:
          return new Date(b.date) - new Date(a.date);
      }
    });

  return (
    <section className="recordings-section" aria-label="My Recordings Studio">
      <audio 
        ref={audioRef}
        preload="auto"
        style={{ display: 'none' }}
      />
      <div className="recordings-container">
        {/* Section Header */}
        <div className="recordings-header">
          <div className="header-title-row">
            <FolderOpen className="icon-brand" size={26} />
            <div>
              <h2>My Recordings</h2>
              <p className="recordings-subtitle">
                {recordings.length} {recordings.length === 1 ? 'track' : 'tracks'} stored locally and offline
              </p>
            </div>
          </div>
          <button 
            type="button" 
            className="import-button primary-btn" 
            onClick={handleImportClick}
            title="Import audio files from your device"
          >
            <Upload size={18} />
            <span>Import Audio</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="audio/mp3,audio/wav,audio/m4a,audio/aac,audio/webm,audio/x-m4a,audio/mp4"
            multiple 
            style={{ display: 'none' }}
          />
        </div>

        {/* Toolbar & Filters */}
        <div className="recordings-toolbar">
          <div className="search-wrapper">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search recordings by name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <div className="toolbar-controls">
            <div className="filter-select-wrapper">
              <ArrowUpDown size={16} className="select-arrow-icon" />
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
                aria-label="Sort recordings by"
              >
                <option value="latest">Latest First</option>
                <option value="oldest">Oldest First</option>
                <option value="largest">Largest File</option>
                <option value="name">Name (A-Z)</option>
              </select>
            </div>

            <div className="layout-toggle">
              <button 
                type="button"
                className={`layout-btn ${!isGridLayout ? 'active' : ''}`}
                onClick={() => setIsGridLayout(false)}
                title="List View"
              >
                <FileAudio size={18} />
              </button>
              <button 
                type="button"
                className={`layout-btn ${isGridLayout ? 'active' : ''}`}
                onClick={() => setIsGridLayout(true)}
                title="Grid View"
              >
                <SquareSquare size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Batch Actions Panel */}
        {selectedIds.length > 0 && (
          <div className="batch-actions-panel">
            <div className="batch-info">
              <CheckSquare size={18} className="batch-icon" />
              <span>{selectedIds.length} items selected</span>
            </div>
            <div className="batch-buttons">
              <button 
                type="button" 
                className="batch-btn secondary"
                onClick={handleSelectAll}
              >
                {selectedIds.length === filteredAndSortedRecordings.length ? 'Deselect All' : 'Select All'}
              </button>
              <button 
                type="button" 
                className="batch-btn danger" 
                onClick={handleDeleteSelected}
              >
                <Trash2 size={16} />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="recordings-empty-state">
            <div className="spinner-glow">
              <Music className="spin animate-pulse" size={32} />
            </div>
            <p>Scanning local vault...</p>
          </div>
        ) : filteredAndSortedRecordings.length === 0 ? (
          /* Empty State Design */
          <div className="recordings-empty-state card-glass">
            <div className="empty-circle">
              <Music size={44} className="music-glow-icon" />
            </div>
            <h3>No recordings found</h3>
            <p>
              {searchQuery 
                ? "No items match your search term. Try another query!" 
                : "You haven't recorded any sessions or imported files yet. Use the Record button above or import audio from your system to build your local studio folder."}
            </p>
            {!searchQuery && (
              <button type="button" className="action-btn-glow" onClick={handleImportClick}>
                <Upload size={18} />
                <span>Import First Track</span>
              </button>
            )}
          </div>
        ) : (
          /* Recordings List / Grid Container */
          <div className={`recordings-grid-container ${isGridLayout ? 'layout-grid' : 'layout-list'}`}>
            {filteredAndSortedRecordings.map((track) => {
              const isSelected = selectedIds.includes(track.id);
              const isCurrent = currentTrack?.id === track.id;
              const isTrackPlaying = isCurrent && isPlaying;
              const isEditing = editingId === track.id;
              const isBackingConnected = activeBackingTrack?.id === track.id;

              return (
                <div 
                  key={track.id} 
                  className={`recording-card card-glass ${isSelected ? 'selected' : ''} ${isCurrent ? 'now-playing-card' : ''} ${isBackingConnected ? 'backing-track-active-card' : ''}`}
                  onClick={() => playTrack(track)}
                >
                  {/* Select Checkbox */}
                  <div 
                    className={`card-select-checkbox ${isSelected ? 'checked' : ''}`}
                    onClick={(e) => handleToggleSelect(e, track.id)}
                    title={isSelected ? "Deselect" : "Select"}
                  >
                    {isSelected && <Check size={14} />}
                  </div>

                  {/* Card Main Info */}
                  <div className="card-media-icon">
                    {isTrackPlaying ? (
                      <div className="playing-bars-animation">
                        <span className="bar1"></span>
                        <span className="bar2"></span>
                        <span className="bar3"></span>
                      </div>
                    ) : (
                      <FileAudio size={28} className="file-audio-icon" />
                    )}
                  </div>

                  <div className="card-info-content" onClick={(e) => e.stopPropagation()}>
                    {isEditing ? (
                      <div className="rename-input-row">
                        <input 
                          type="text" 
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="rename-field"
                          placeholder="Filename..."
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRename(track.id, track.type);
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                        />
                        <button 
                          type="button" 
                          className="rename-save-btn"
                          onClick={() => handleRename(track.id, track.type)}
                        >
                          Save
                        </button>
                      </div>
                    ) : (
                      <div className="card-title-row">
                        <h3 className="card-title" title={track.name}>
                          {track.name}
                        </h3>
                        {isBackingConnected && (
                          <span className="backing-badge">🎹 Backing Track</span>
                        )}
                        <button 
                          type="button"
                          className="rename-trigger-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingId(track.id);
                            setEditName(track.name);
                          }}
                          title="Rename file"
                        >
                          <Edit3 size={14} />
                        </button>
                      </div>
                    )}

                    <div className="card-metadata-row">
                      <span className="metadata-item" title="Recording Date">
                        {formatDate(track.date)}
                      </span>
                      <span className="metadata-divider">•</span>
                      <span className="metadata-item" title="Duration">
                        <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatTime(track.duration)}
                      </span>
                      <span className="metadata-divider">•</span>
                      <span className="metadata-item" title="Size">
                        <HardDrive size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                        {formatSize(track.size)}
                      </span>
                    </div>
                  </div>

                  {/* Card Controls Panel */}
                  <div className="card-actions-panel" onClick={(e) => e.stopPropagation()}>
                    {/* Backing Track Connect Button */}
                    <button 
                      type="button" 
                      className={`card-action-btn backing-connect-btn ${isBackingConnected ? 'is-connected' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (onBackingTrackConnect) {
                          if (isBackingConnected) {
                            onBackingTrackConnect(null);
                          } else {
                            onBackingTrackConnect(track);
                          }
                        }
                      }}
                      title={isBackingConnected ? "Disconnect backing track from piano" : "Connect as piano backing track"}
                    >
                      <Music size={18} />
                    </button>

                    {/* Favorite Button */}
                    <button 
                      type="button" 
                      className={`card-action-btn favorite-btn ${track.favorite ? 'is-favorite' : ''}`}
                      onClick={(e) => handleToggleFavorite(e, track.id, track.favorite)}
                      title={track.favorite ? "Remove from Favorites" : "Add to Favorites"}
                    >
                      <Heart size={18} fill={track.favorite ? "var(--error)" : "none"} />
                    </button>

                    {/* Share Button */}
                    <button 
                      type="button" 
                      className="card-action-btn"
                      onClick={(e) => handleShare(e, track)}
                      title="Share / Save to device"
                    >
                      <Share2 size={18} />
                    </button>

                    {/* Play/Pause Card Action */}
                    <button 
                      type="button" 
                      className={`card-play-btn ${isTrackPlaying ? 'playing' : ''}`}
                      onClick={() => playTrack(track)}
                      title={isTrackPlaying ? "Pause Playback" : "Start Playback"}
                    >
                      {isTrackPlaying ? <Pause size={18} /> : <Play size={18} style={{ marginLeft: '2px' }} />}
                    </button>

                    {/* Delete Button */}
                    <button 
                      type="button" 
                      className="card-action-btn delete-btn"
                      onClick={(e) => handleDelete(e, track.id)}
                      title="Delete recording permanently"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Bottom Audio Player */}
      <div className={`floating-audio-player card-glass ${currentTrack ? 'active' : ''}`}>
        {currentTrack ? (
          <div className="player-inner">

            {/* Left Section: Track Info and Visualizer */}
            <div className="player-track-info">
              <div className="disc-rotator">
                <Music size={20} className={isPlaying ? 'spinning-disc' : ''} />
              </div>
              <div className="text-details">
                <h4 className="track-title" title={currentTrack.name}>
                  {currentTrack.name}
                </h4>
                <p className="track-meta">
                  {formatSize(currentTrack.size)} • Local Storage Vault
                </p>
              </div>
            </div>

            {/* Center Section: Visualizer Wave and Seek Bar */}
            <div className="player-waveform-controls">
              <div className="canvas-wrapper">
                <canvas 
                  ref={canvasRef} 
                  width={340} 
                  height={32}
                  className="waveform-canvas"
                />
              </div>

              <div className="seekbar-container">
                <span className="time-indicator">{formatTime(currentTime)}</span>
                <input 
                  type="range"
                  min="0"
                  max={duration || 100}
                  value={currentTime}
                  onChange={handleSeek}
                  className="player-seekbar"
                  aria-label="Seek track"
                />
                <span className="time-indicator">{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Section: Core Controls */}
            <div className="player-main-controls">
              <button 
                type="button" 
                className="control-btn" 
                onClick={() => handleSkip(-10)}
                title="Rewind 10s"
              >
                <Rewind size={18} />
              </button>

              <button 
                type="button" 
                className="control-btn stop-btn"
                onClick={handleStop}
                title="Stop audio"
              >
                <Square size={16} fill="var(--text)" />
              </button>

              <button 
                type="button" 
                className="control-btn play-pause-btn"
                onClick={handlePlayPause}
                title={isPlaying ? "Pause" : "Play"}
              >
                {isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" style={{ marginLeft: '2px' }} />}
              </button>

              <button 
                type="button" 
                className="control-btn"
                onClick={() => handleSkip(10)}
                title="Skip forward 10s"
              >
                <FastForward size={18} />
              </button>

              {/* Volume Slider */}
              <div className="volume-slider-container">
                <button 
                  type="button" 
                  className="volume-toggle"
                  onClick={handleToggleMute}
                  title={isMuted ? "Unmute" : "Mute"}
                >
                  <Volume2 size={18} style={{ display: isMuted ? 'none' : 'block' }} />
                  <span className="muted-x" style={{ display: isMuted ? 'block' : 'none' }}>🔇</span>
                </button>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="volume-slider"
                  aria-label="Volume slider"
                />
              </div>
            </div>
          </div>
        ) : (
          <p className="player-idle-text">Select a track to launch the high-fidelity player</p>
        )}
      </div>
    </section>
  );
}
