import React, { useState } from 'react';
import './AnnotationToolbar.css';

const ANNOTATION_TYPES = [
    { type: 'stress', label: 'Stress (重音)', icon: 'ˈ', shortcut: '1' },
    { type: 'elongated', label: 'Elongated (拉長音)', icon: '〰', shortcut: '2' },
    { type: 'aspirated', label: 'Aspirated (氣音)', icon: 'ʰ', shortcut: '3' },
    { type: 'breath_pause', label: 'Breath (換氣)', icon: 'v', shortcut: '4' },
    { type: 'linking', label: 'Linking (連字)', icon: '◡', shortcut: '5' },
    { type: 'silent', label: 'Silent (不發音)', icon: '⧵', shortcut: '6' },
    { type: 'section', label: 'Section (段落)', icon: '📑', shortcut: '7' },
];

const AnnotationToolbar = ({ onAddAnnotation }) => {
    const [customText, setCustomText] = useState('');
    const [isCustomOpen, setIsCustomOpen] = useState(false);

    const handleAdd = (type, value = null) => {
        onAddAnnotation(type, value);
        if (type === 'custom') {
            setIsCustomOpen(false);
            setCustomText('');
        }
    };

    return (
        <div className="toolbar-container glass fade-in">
            <div className="toolbar-buttons">
                {ANNOTATION_TYPES.map(({ type, label, icon }) => (
                    <button
                        key={type}
                        className="toolbar-btn"
                        onClick={() => handleAdd(type, icon)}
                        title={label}
                    >
                        <span className="btn-icon">{icon}</span>
                        <span className="btn-label">{label}</span>
                    </button>
                ))}

                <div className="custom-note-divider" />

                <div className="custom-note-section">
                    {isCustomOpen ? (
                        <div className="custom-input-wrapper">
                            <input
                                type="text"
                                autoFocus
                                className="custom-input"
                                placeholder="Phonetic note..."
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customText.trim()) {
                                        handleAdd('custom', customText.trim());
                                    }
                                    if (e.key === 'Escape') {
                                        setIsCustomOpen(false);
                                    }
                                }}
                            />
                            <button
                                className="custom-submit-btn"
                                onClick={() => customText.trim() && handleAdd('custom', customText.trim())}
                            >
                                Add
                            </button>
                        </div>
                    ) : (
                        <button
                            className="toolbar-btn custom-btn"
                            onClick={() => setIsCustomOpen(true)}
                            title="Custom Note"
                        >
                            <span className="btn-icon">✎</span>
                            <span className="btn-label">Note</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnnotationToolbar;
