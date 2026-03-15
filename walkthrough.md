# Lyric Annotator — Walkthrough

## What Was Built

A full-featured **Lyric Annotation Web App** (`lyric-annotator`) in React + Vite that lets performers mark up song lyrics with phonetic and structural annotations.

---

## Features

### ✏️ Edit Mode
- Paste or type any lyrics into a rich text editor
- Supports bracket-syntax for pre-labelled sections: `[Verse 1]`, `[Chorus]`, `[Bridge]`
- Live preview with formatting preserved (`white-space: pre-wrap`)

### 🎙 Annotate Mode — Toolbar
Select any word or phrase, then click a toolbar button to apply:

| Button | Type | Effect |
|--------|------|--------|
| `ˈ` | Stress (重音) | Yellow bold glow highlight |
| `〰` | Elongated (拉長音) | Wavy text decoration |
| `ʰ` | Aspirated (氣音) | Superscript marker |
| `v` | Breath Pause (換氣) | Pause symbol between words |
| `◡` | Linking (連字) | Curved underline arc |
| `⧵` | Silent (不發音) | Diagonal strikethrough |
| `📑` | Section (段落) | Block wrapper with editable header |
| ✏️ | Custom Note | Free-text phonetic note |

### 📑 Section Annotations
- Select a block of lyrics and click **Section** to wrap it in a named block
- Click the section heading marker to rename it inline
- Sections appear in the left-side **Outline** panel for quick navigation

### 🗂 Outline Panel (Left Sidebar)
- Lists all named sections, sorted by position in the song
- Clicking any item **smooth-scrolls** to that section, with offset correction to account for the sticky toolbar so it's never obscured
- Active section is highlighted as you scroll

### 💾 Auto-Save
- All lyrics and annotations are **auto-saved to `localStorage`** on every change
- Refreshing or closing the tab won't lose your work
- Use **Export JSON** to save a portable file; **Import JSON** to reload it

---

## Technical Highlights

### Accurate Text Selection (`textUtils.js`)
Uses a `TreeWalker`-based offset algorithm that **ignores rendered UI nodes** (delete buttons, marker labels, popups) when calculating character positions, preventing annotations from drifting onto neighbouring words.

### Nested Annotation Support (`textUtils.js → buildRenderChunks`)
A recursive tree-building algorithm allows arbitrary nesting: e.g., a **Stress** mark on a single word *inside* a **Section** block renders correctly without one overriding the other.

### Duplicate Annotation Prevention (`LyricAnnotator.jsx → handleAddAnnotation`)
Before adding a new annotation of a given type, the app checks for **overlapping annotations of the same type**:
- **Exact match** → toggles it off (like an on/off switch)
- **Partial overlap** → removes the old one and replaces it with the new boundary

### CSS Line Spacing
Using `line-height: 3.5` on `.lyric-annotated` to expand the line box selectively on annotated lines, with `box-decoration-break: clone` so multi-line highlights appear cohesive rather than fragmented.

---

## Project Structure

```
lyric-annotator/
├── src/
│   ├── App.jsx                  # Mode toggle, auto-save, layout
│   ├── App.css                  # Global layout, header, mode toggle
│   ├── components/
│   │   ├── LyricEditor.jsx      # Lyrics textarea
│   │   ├── LyricAnnotator.jsx   # Core: selection, rendering, editing
│   │   ├── LyricAnnotator.css   # Annotation styles & section blocks
│   │   ├── AnnotationToolbar.jsx # Button row for annotation types
│   │   ├── SectionOutline.jsx   # Left-side navigation panel
│   │   └── SectionOutline.css
│   └── utils/
│       └── textUtils.js         # TreeWalker offset + render tree builder
```
