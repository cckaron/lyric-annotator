import React, { useRef, useEffect, useState } from 'react';
import './LyricAnnotator.css';
import { getSelectionOffsets, buildRenderChunks } from '../utils/textUtils';
import AnnotationToolbar from './AnnotationToolbar';
import SectionOutline from './SectionOutline';

const SYMBOL_MAP = {
    stress: 'ˈ',
    unstressed: 'ˌ',
    elongated: '≫',
    aspirated: 'ʰ',
    breath_pause: 'v',
    linking: '◡',
    beat: '1',
    silent: '⧵',
};

const LyricAnnotator = ({ lyrics, annotations, onAnnotationsChange }) => {
    const containerRef = useRef(null);
    const [activeSelection, setActiveSelection] = useState(null);
    const [editingAnnId, setEditingAnnId] = useState(null);
    const editInputRef = useRef(null);

    useEffect(() => {
        const handleSelectionChange = () => {
            if (!containerRef.current) return;
            const selection = window.getSelection();
            if (selection.rangeCount === 0) return;

            // Don't grab selection if we are just clicking inside the edit input
            if (editInputRef.current && editInputRef.current.contains(selection.anchorNode)) {
                return;
            }

            const offsets = getSelectionOffsets(containerRef);
            if (offsets && offsets.start !== offsets.end) {
                // Rebuild exact text from original lyrics array to avoid any injected UI characters
                offsets.text = lyrics.substring(offsets.start, offsets.end);
                setActiveSelection(offsets);
            } else if (!editingAnnId) {  // Only clear selection if we aren't currently editing an annotation
                setActiveSelection(null);
            }
        };

        const handleClickOutside = (e) => {
            // Close edit mode if clicking outside the annotation
            if (editingAnnId && containerRef.current && !e.target.closest('.lyric-annotated')) {
                setEditingAnnId(null);
            }
        };

        document.addEventListener('selectionchange', handleSelectionChange);
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('selectionchange', handleSelectionChange);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [editingAnnId]);

    const handleAddAnnotation = (type, value) => {
        if (!activeSelection) return;

        let annStart = activeSelection.start;
        let annEnd = activeSelection.end;
        let annText = activeSelection.text;

        // Automatically trim whitespace from the selection to prevent markers from being off-center
        // (Double-clicking a word often includes a trailing space)
        const leadingWhitespace = annText.match(/^\s*/)[0].length;
        const trailingWhitespace = annText.match(/\s*$/)[0].length;
        
        if (leadingWhitespace > 0 || trailingWhitespace > 0) {
            annStart += leadingWhitespace;
            annEnd -= trailingWhitespace;
            annText = annText.substring(leadingWhitespace, annText.length - trailingWhitespace);
        }

        if (type === 'breath_pause') {
            const spaceIndex = activeSelection.text.indexOf(' ');
            if (spaceIndex !== -1) {
                // Pin the annotation exactly to that space character
                annStart = activeSelection.start + spaceIndex;
                annEnd = annStart + 1;
                annText = ' ';
            } else {
                // Fallback: if they didn't select two words, just put it at the end of the word
                annStart = activeSelection.end;
                annEnd = activeSelection.end;
                annText = '';
            }
        }

        if (type === 'section' && !value) {
            value = 'Section Name'; // Default name for a new section
        }

        if (type === 'beat' && !value) {
            value = '1';
        }

        // Check for overlaps with the *same type* of annotation
        const overlapping = annotations.filter(a => {
            if (a.type !== type) return false;
            // Handle zero-length annotations safely
            if (a.start === a.end && annStart === annEnd) return a.start === annStart;
            if (a.start === a.end) return a.start >= annStart && a.start <= annEnd;
            if (annStart === annEnd) return annStart >= a.start && annStart <= a.end;
            // Standard overlap check
            return Math.max(a.start, annStart) < Math.min(a.end, annEnd);
        });

        // If an EXACT match exists, the user is toggling it off
        const exactMatch = overlapping.find(
            a => a.start === annStart && a.end === annEnd
        );

        if (exactMatch) {
            // Toggle off
            onAnnotationsChange(annotations.filter(a => a.id !== exactMatch.id));
        } else {
            // Remove any overlapping annotations of the SAME TYPE to prevent duplicates,
            // then add the newly requested boundary.
            const filteredAnnotations = annotations.filter(a => !overlapping.includes(a));
            
            const newAnn = {
                id: Date.now().toString(),
                start: annStart,
                end: annEnd,
                type,
                value,
                text: annText
            };
            onAnnotationsChange([...filteredAnnotations, newAnn]);
            
            // Auto open edit mode for sections
            if (type === 'section') {
                setTimeout(() => setEditingAnnId(newAnn.id), 0);
            }
        }

        // Clear selection visually if desired, though standard behavior keeps it until clicked away
        // window.getSelection().removeAllRanges();
    };

    const handleRemoveAnnotation = (e, id) => {
        e.stopPropagation();
        onAnnotationsChange(annotations.filter(a => a.id !== id));
        if (editingAnnId === id) setEditingAnnId(null);
    };

    const handleEditChange = (id, newValue) => {
        onAnnotationsChange(annotations.map(a =>
            a.id === id ? { ...a, value: newValue } : a
        ));
    };

    const handleEditKeyDown = (e, id) => {
        if (e.key === 'Enter' || e.key === 'Escape') {
            e.preventDefault();
            setEditingAnnId(null);
        }
    };

    const renderChunk = (chunk, i) => {
        if (chunk.type === 'text') {
            // Split text by newlines so we can identify standalone [Section] lines
            const lines = chunk.content.split('\n');
            
            return (
                <span key={`text-${chunk.start}-${i}`} className="lyric-text">
                    {lines.map((line, lineIndex) => {
                        const isLastLine = lineIndex === lines.length - 1;
                        // Match [Anything] that spans the whole trimmed line
                        const isHeader = /^\[.*\]$/.test(line.trim());
                        
                        return (
                            <React.Fragment key={`line-${lineIndex}`}>
                                {isHeader ? (
                                    <span className="section-header">{line}</span>
                                ) : (
                                    line
                                )}
                                {!isLastLine && '\n'}
                            </React.Fragment>
                        );
                    })}
                </span>
            );
        }

        const ann = chunk.annotation;
        const isEditing = editingAnnId === ann.id;

        return (
            <span
                key={`ann-${ann.id}`}
                id={ann.type === 'section' ? `section-${ann.id}` : undefined}
                className={`lyric-annotated type-${ann.type} ${isEditing ? 'is-editing' : ''}`}
                onClick={(e) => {
                    // For sections and beats, we only want to trigger edit if they click the marker, not the text inside.
                    // So we ignore clicks on the wrapper if it's a section/beat, and handle it on the marker instead.
                    if (ann.type !== 'section' && ann.type !== 'beat') {
                        e.stopPropagation();
                        if (!isEditing) setEditingAnnId(ann.id);
                    }
                }}
                title={isEditing || ann.type === 'section' ? "" : "Click to edit. Trash icon to remove."}
            >
                <span 
                    className={`annotation-marker type-${ann.type}`} 
                    data-marker={ann.value || SYMBOL_MAP[ann.type] || ''}
                    onClick={(e) => {
                        if (ann.type === 'section') {
                            e.stopPropagation();
                            if (!isEditing) setEditingAnnId(ann.id);
                        } else if (ann.type === 'beat') {
                            e.stopPropagation();
                            // Cycle beat value 1 -> 2 -> 3 -> 4 -> 1
                            const currentValue = parseInt(ann.value) || 1;
                            const nextValue = (currentValue % 4) + 1;
                            handleEditChange(ann.id, nextValue.toString());
                        }
                    }}
                    onContextMenu={(e) => {
                        if (ann.type === 'beat') {
                            e.preventDefault();
                            handleRemoveAnnotation(e, ann.id);
                        }
                    }}
                    title={
                        ann.type === 'section' && !isEditing ? "Click to edit section name. Trash icon to remove." : 
                        ann.type === 'beat' ? "Click: cycle beat (1-4) | Right-click: remove" : ""
                    }
                >
                    {isEditing && (
                        <div className="annotation-edit-popup">
                            {(ann.type === 'custom' || ann.type === 'section') && (
                                <input
                                    ref={editInputRef}
                                    type="text"
                                    value={ann.value}
                                    onChange={(e) => handleEditChange(ann.id, e.target.value)}
                                    onKeyDown={(e) => handleEditKeyDown(e, ann.id)}
                                    autoFocus
                                />
                            )}
                            <button
                                className="remove-btn"
                                onClick={(e) => handleRemoveAnnotation(e, ann.id)}
                                title="Remove Annotation"
                            >
                                🗑️
                            </button>
                        </div>
                    )}
                </span>
                
                <span className="annotated-text">
                    {chunk.children && chunk.children.length > 0
                        ? chunk.children.map((childChunk, idx) => renderChunk(childChunk, idx))
                        : chunk.content
                    }
                </span>
            </span>
        );
    };

    return (
        <div className="annotator-root">
            <aside className="annotator-sidebar">
                <SectionOutline annotations={annotations} />
            </aside>
            <div className="annotator-main">
                <AnnotationToolbar
                    onAddAnnotation={handleAddAnnotation}
                    isActiveSelection={!!activeSelection}
                />
                <div className="lyric-canvas glass" ref={containerRef}>
                    <div className="lyric-content">
                        {buildRenderChunks(lyrics, annotations).map((chunk, i) => renderChunk(chunk, i))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LyricAnnotator;
