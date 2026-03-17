import { useState, useEffect } from 'react'
import './App.css'
import LyricEditor from './components/LyricEditor'
import LyricAnnotator from './components/LyricAnnotator'
import { adjustAnnotations } from './utils/textUtils'

const STORAGE_KEY = 'lyric_annotator_data';

const getInitialData = () => {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed.lyrics !== undefined && parsed.annotations !== undefined) {
        return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved data', e);
    }
  }
  return {
    lyrics: "[Verse 1]\nWe've known each other for so long\nYour heart's been aching, but you're too shy to say it\nInside, we both know what's been going on\nWe know the game and we're gonna play it\n\n[Chorus]\nAnd if you ask me how I'm feeling\nDon't tell me you're too blind to see",
    annotations: []
  };
};

function App() {
  const [mode, setMode] = useState('edit'); // 'edit' | 'annotate'
  
  // Lazy initialize state from localStorage
  const [lyrics, setLyrics] = useState(() => getInitialData().lyrics);
  const [annotations, setAnnotations] = useState(() => getInitialData().annotations);

  // Auto-save whenever lyrics or annotations change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ lyrics, annotations }));
  }, [lyrics, annotations]);

  const handleLyricsChange = (newLyrics) => {
    // If the text changes while we have annotations, try to adjust their offsets
    if (annotations.length > 0) {
      const adjustedAnns = adjustAnnotations(lyrics, newLyrics, annotations);
      setAnnotations(adjustedAnns);
    }
    setLyrics(newLyrics);
  };

  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ lyrics, annotations }, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "lyric-annotations.json");
    document.body.appendChild(downloadAnchorNode); // required for firefox
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        if (data.lyrics !== undefined && data.annotations !== undefined) {
          setLyrics(data.lyrics);
          setAnnotations(data.annotations);
          // Optional: automatically switch to annotate mode after successful load
          setMode('annotate');
        } else {
          alert('Invalid format. File must contain lyrics and annotations.');
        }
      } catch (err) {
        alert('Error parsing JSON file.');
      }
    };
    reader.readAsText(file);
    // Reset input so the same file could be selected again if needed
    e.target.value = '';
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="title-container">
          <div className="accent-dot"></div>
          <h1>Lyric Annotator</h1>
        </div>

        <div className="header-actions">
          <button className="header-action-btn" onClick={handleExport}>
            Export JSON
          </button>
          <label className="header-action-btn" style={{ cursor: 'pointer' }}>
            Import JSON
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="mode-toggle">
          <div className="mode-indicator" data-mode={mode}></div>
          <button
            className={`mode-btn ${mode === 'edit' ? 'active' : ''}`}
            onClick={() => setMode('edit')}
          >
            Edit
          </button>
          <button
            className={`mode-btn ${mode === 'annotate' ? 'active' : ''}`}
            onClick={() => setMode('annotate')}
          >
            Annotate
          </button>
        </div>
      </header>

      <main className="main-content">
        {mode === 'edit' ? (
          <div className="editor-section fade-in">
            <p className="editor-instruction">Paste or type your lyrics below. Preserving line breaks matters.</p>
            <LyricEditor lyrics={lyrics} onChange={handleLyricsChange} />
          </div>
        ) : (
          <div className="annotator-section fade-in">
            <LyricAnnotator
              lyrics={lyrics}
              annotations={annotations}
              onAnnotationsChange={setAnnotations}
            />
          </div>
        )}
      </main>
    </div>
  )
}

export default App
