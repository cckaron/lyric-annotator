import React, { useEffect, useState } from 'react';
import './SectionOutline.css';

const SectionOutline = ({ annotations, containerRef }) => {
    const [activeSectionId, setActiveSectionId] = useState(null);
    const sections = annotations
        .filter(a => a.type === 'section')
        .sort((a, b) => a.start - b.start);

    // Optional: add scroll listener to highlight active section based on scroll position
    useEffect(() => {
        if (!containerRef || !containerRef.current) return;

        const handleScroll = () => {
            if (sections.length === 0) return;
            // Find which section is currently centered or at top of viewport
            let currentId = null;
            let minDistance = Infinity;

            sections.forEach(sec => {
                const el = document.getElementById(`section-${sec.id}`);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // Distance from top of viewport to top of element
                    const distance = Math.abs(rect.top - 100); // 100px offset to account for headers/padding
                    if (distance < minDistance) {
                        minDistance = distance;
                        currentId = sec.id;
                    }
                }
            });
            if (currentId) {
                setActiveSectionId(currentId);
            }
        };

        const scrollContainer = window; // or a specific interior scrolling div
        scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
        // Run once on mount
        handleScroll();

        return () => scrollContainer.removeEventListener('scroll', handleScroll);
    }, [sections, containerRef]);

    const scrollToSection = (id) => {
        const el = document.getElementById(`section-${id}`);
        if (el) {
            // Calculate offset: measure the actual height of sticky elements so we don't scroll under them.
            // The sticky toolbar sits at roughly 60px (header) + toolbar height.
            // We also add a little breathing room (16px) so the section name is cleanly visible.
            const HEADER_HEIGHT = document.querySelector('.header')?.offsetHeight ?? 60;
            const TOOLBAR_HEIGHT = document.querySelector('.toolbar-container')?.offsetHeight ?? 80;
            const OFFSET = HEADER_HEIGHT + TOOLBAR_HEIGHT + 24; // 24px extra breathing room

            const elementTop = el.getBoundingClientRect().top + window.scrollY;
            window.scrollTo({
                top: elementTop - OFFSET,
                behavior: 'smooth'
            });
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
