// Utility: Extract image placeholders and split text into segments
function extractImageSegments(text, imagePlaceholders) {
    const segments = [];
    let currentText = text;
    imagePlaceholders.forEach(({ placeholder }) => {
        const parts = currentText.split(placeholder);
        if (parts.length > 1) {
            if (parts[0].trim()) {
                segments.push({ type: 'text', content: parts[0].trim() });
            }
            segments.push({ type: 'image', placeholder });
            currentText = parts.slice(1).join(placeholder);
        }
    });
    if (currentText.trim()) {
        segments.push({ type: 'text', content: currentText.trim() });
    }
    return segments;
}

// Utility: Split sentences (simple version for test)
function splitSentencesWithQuotes(text) {
    // Split on period, exclamation, or question mark followed by space or end
    return (text.match(/[^.!?]+[.!?]+(?:\s+|$)/g) || [text]).map(s => s.trim());
}

module.exports = {
    extractImageSegments,
    splitSentencesWithQuotes,
}; 