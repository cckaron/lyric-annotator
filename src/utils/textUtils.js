/**
 * Maps a DOM selection range to absolute string offsets within a parent text node.
 * Uses a TreeWalker to count only the actual lyric text characters,
 * strictly skipping over any hidden marker elements or popups.
 */
export const getSelectionOffsets = (containerRef) => {
    const selection = window.getSelection();
    if (!selection.rangeCount || !containerRef.current) return null;

    const range = selection.getRangeAt(0);

    // Make sure selection is inside our container
    if (!containerRef.current.contains(range.commonAncestorContainer)) {
        return null;
    }

    // Helper to resolve an Element startContainer down to a text node offset 0
    // so the TreeWalker matches perfectly when user doubleclicks an empty area
    const resolveContainer = (container, offset, isEnd) => {
        if (container.nodeType === Node.TEXT_NODE) return { node: container, offset };
        let child = container.childNodes[offset];
        if (!child && isEnd && offset > 0) child = container.childNodes[offset - 1];
        if (child && child.nodeType === Node.TEXT_NODE) {
            return { node: child, offset: isEnd && !container.childNodes[offset] ? child.nodeValue.length : 0 };
        }
        
        // Find first text node descendant
        const w = document.createTreeWalker(child || container, NodeFilter.SHOW_TEXT, null);
        const firstText = w.nextNode();
        return firstText ? { node: firstText, offset: 0 } : { node: container, offset: 0 };
    };

    const startInfo = resolveContainer(range.startContainer, range.startOffset, false);
    const endInfo = resolveContainer(range.endContainer, range.endOffset, true);

    const walker = document.createTreeWalker(
        containerRef.current,
        NodeFilter.SHOW_TEXT,
        {
            acceptNode: (node) => {
                // Ignore text nodes inside our marker/popup elements 
                if (node.parentElement && node.parentElement.closest('.annotation-marker, .annotation-edit-popup, .lyric-editor-container')) {
                    return NodeFilter.FILTER_REJECT;
                }
                return NodeFilter.FILTER_ACCEPT;
            }
        }
    );

    let startOffset = 0;
    let endOffset = 0;
    let currentLen = 0;
    let foundStart = false;
    let foundEnd = false;

    let node = walker.nextNode();
    while (node) {
        if (node === startInfo.node) {
            startOffset = currentLen + startInfo.offset;
            foundStart = true;
        }
        if (node === endInfo.node) {
            endOffset = currentLen + endInfo.offset;
            foundEnd = true;
        }

        currentLen += node.nodeValue.length;

        if (foundStart && foundEnd) break;
        node = walker.nextNode();
    }

    if (!foundStart || !foundEnd) return null;

    return {
        start: Math.min(startOffset, endOffset),
        end: Math.max(startOffset, endOffset),
        text: '' // This must be populated by the caller using the original lyric text
    };
};

/**
 * Splits the raw lyrics string into renderable chunks based on an array of annotations.
 * Each chunk is either plain text or annotated text.
 * Nested or overlapping annotations are tricky. This simple approach assumes
 * non-overlapping annotations or flattens them by applying the most recent.
 */
/**
 * Helper to recursively build a tree of annotations.
 * It takes a string of text, its absolute start/end offsets, and any annotations that fall within it.
 */
const buildRenderTree = (text, globalStart, globalEnd, annotations) => {
    // Filter annotations that strictly fall within this text segment
    const relevantAnns = annotations.filter(
        a => a.start >= globalStart && a.end <= globalEnd
    );

    if (relevantAnns.length === 0) {
        return [{ type: 'text', content: text, start: globalStart, end: globalEnd }];
    }

    // Sort by start position; if same start, longest first (so outer wraps inner)
    relevantAnns.sort((a, b) => {
        if (a.start === b.start) return (b.end - b.start) - (a.end - a.start);
        return a.start - b.start;
    });

    const chunks = [];
    let currentPos = globalStart;

    while (relevantAnns.length > 0) {
        const ann = relevantAnns.shift();

        // If this annotation overlaps with something we already processed, 
        // it means we have a partial overlap (invalid nesting). We'll have to skip it or truncate it.
        // For simplicity, we skip strictly overlapping (but non-nested) brethren.
        if (ann.start < currentPos) continue;

        // Add pre-text before this annotation
        if (ann.start > currentPos) {
            chunks.push({
                type: 'text',
                content: text.substring(currentPos - globalStart, ann.start - globalStart),
                start: currentPos,
                end: ann.start
            });
        }

        // Find children of this annotation
        const children = relevantAnns.filter(
            child => child.start >= ann.start && child.end <= ann.end
        );

        // Remove children from the main queue so they aren't processed twice
        for (const child of children) {
            const idx = relevantAnns.findIndex(a => a.id === child.id);
            if (idx > -1) relevantAnns.splice(idx, 1);
        }

        // Build the tree for the inside of this annotation
        const innerText = text.substring(ann.start - globalStart, ann.end - globalStart);
        const innerChunks = buildRenderTree(innerText, ann.start, ann.end, children);

        chunks.push({
            type: 'annotation',
            annotation: ann,
            start: ann.start,
            end: ann.end,
            children: innerChunks // Nested contents
        });

        currentPos = ann.end;
    }

    // Add remaining trailing text
    if (currentPos < globalEnd) {
        chunks.push({
            type: 'text',
            content: text.substring(currentPos - globalStart),
            start: currentPos,
            end: globalEnd
        });
    }

    return chunks;
};

/**
 * Splits the raw lyrics string into a renderable tree of chunks based on an array of annotations.
 * Supports nesting (e.g. inner annotations inside a Section block).
 */
export const buildRenderChunks = (text, annotations) => {
    return buildRenderTree(text, 0, text.length, annotations || []);
};

/**
 * Adjusts annotation offsets when the underlying text changes.
 * Uses a simple prefix/suffix match to find the inserted/deleted region
 * and shifts annotations accordingly.
 */
export const adjustAnnotations = (oldText, newText, annotations) => {
    if (!annotations || annotations.length === 0) return [];
    if (oldText === newText) return annotations;

    // 1. Find the common prefix length
    let prefixLen = 0;
    while (prefixLen < oldText.length && prefixLen < newText.length && oldText[prefixLen] === newText[prefixLen]) {
        prefixLen++;
    }

    // 2. Find the common suffix length
    let suffixLen = 0;
    while (
        suffixLen < oldText.length - prefixLen &&
        suffixLen < newText.length - prefixLen &&
        oldText[oldText.length - 1 - suffixLen] === newText[newText.length - 1 - suffixLen]
    ) {
        suffixLen++;
    }

    // The change occurred between `prefixLen` and `oldText.length - suffixLen`
    const oldChangeStart = prefixLen;
    const oldChangeEnd = oldText.length - suffixLen;
    const newChangeStart = prefixLen;
    const newChangeEnd = newText.length - suffixLen;

    const charsDelta = (newChangeEnd - newChangeStart) - (oldChangeEnd - oldChangeStart);

    return annotations.map(ann => {
        // Option A: Annotation is completely before the change
        if (ann.end <= oldChangeStart) {
            return ann;
        }

        // Option B: Annotation is completely after the change
        if (ann.start >= oldChangeEnd) {
            return {
                ...ann,
                start: ann.start + charsDelta,
                end: ann.end + charsDelta
            };
        }

        // Option C: The change completely swallowed the annotation (deleted it)
        if (ann.start >= oldChangeStart && ann.end <= oldChangeEnd) {
            return null; // Will filter these out
        }

        // Option D: The change overlaps with the annotation (partial delete/insert inside the annotated word)
        // We'll try to adjust it proportionally or just shift the boundaries that are outside the change zone.
        let newStart = ann.start;
        let newEnd = ann.end;

        if (ann.start > oldChangeStart) {
            // Start is inside the changed region, push it to the end of the new insert
            newStart = newChangeEnd;
        }

        if (ann.end >= oldChangeEnd) {
            // End is after the changed region, shift it by delta
            newEnd = ann.end + charsDelta;
        } else if (ann.end > oldChangeStart) {
            // End is inside the changed region
            newEnd = newChangeEnd;
        }

        if (newStart >= newEnd) return null; // Collapsed

        return {
            ...ann,
            start: newStart,
            end: newEnd
        };
    }).filter(Boolean); // Remove nulls
};
