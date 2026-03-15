import React from 'react';

const LyricEditor = ({ lyrics, onChange }) => {
    return (
        <div className="lyric-editor-container">
            <div className="textarea-wrapper">
                <textarea
                    className="lyrics-textarea"
                    value={lyrics}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="Type or paste your lyrics here..."
                />
            </div>
            <div className="editor-hint">
                <span className="hint-icon">💡</span>
                <span><strong>Pro Tip:</strong> Use brackets like <code>[Verse 1]</code> or <code>[Chorus]</code> on a new line to automatically create section dividers in Annotate mode.</span>
            </div>
        </div>
    );
};

export default LyricEditor;
