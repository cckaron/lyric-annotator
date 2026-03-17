import React, { useEffect, useState } from 'react';
import './SectionOutline.css';

const SectionOutline = ({ annotations, canvasRef }) => {
    const [activeSectionId, setActiveSectionId] = useState(null);
    const sections = annotations
        .filter(a => a.type === 'section')
        .sort((a, b) => a.start - b.start);

    // Highlight active section based on scroll position within the canvas
    useEffect(() => {
        const scrollEl = canvasRef?.current;
        if (!scrollEl) return;

        const handleScroll = () => {
            if (sections.length === 0) return;
            let currentId = null;
            let minDistance = Infinity;

            sections.forEach(sec => {
                const el = document.getElementById(`section-${sec.id}`);
                if (el) {
                    const elTop = el.getBoundingClientRect().top;
                    const distance = Math.abs(elTop - scrollEl.getBoundingClientRect().top - 80);
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentId = sec.id;
                    }
                }
            });
            if (currentId) setActiveSectionId(currentId);
        };

        scrollEl.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
        return () => scrollEl.removeEventListener('scroll', handleScroll);
    }, [sections, canvasRef]);

    const scrollToSection = (id) => {
        const canvas = canvasRef?.current;
        const el = document.getElementById(`section-${id}`);
        if (el && canvas) {
            const elOffsetTop = el.offsetTop;
            const PADDING = 32;
            canvas.scrollTo({ top: elOffsetTop - PADDING, behavior: 'smooth' });
            setActiveSectionId(id);
        }
    };

    if (sections.length === 0) {
        return (
            <div className="section-outline empty">
                <div className="outline-header">Outline</div>
                <div className="outline-body empty-state">
                    No sections added yet. Select text and click 'Section' to build your outline.
                </div>
            </div>
        );
    }

    return (
        <nav className="section-outline fade-in glass" aria-label="Section Navigation">
            <div className="outline-header">
                <h2>Outline</h2>
                <span className="outline-count">{sections.length}</span>
            </div>
            <ul className="outline-list">
                {sections.map(section => (
                    <li key={section.id} className="outline-item">
                        <button
                            className={`outline-button ${activeSectionId === section.id ? 'active' : ''}`}
                            onClick={() => scrollToSection(section.id)}
                        >
                            <span className="outline-icon">📑</span>
                            <span className="outline-text">{section.value || 'Untitled Section'}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default SectionOutline;
