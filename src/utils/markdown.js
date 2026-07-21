/**
 * Pure JS Light Markdown Parser for ZenNote
 * Parses Headers, Bold, Italics, Lists, Code, Blockquotes, Checkboxes
 */
export function parseMarkdown(text) {
  if (!text) return '';

  let html = text
    // Escape HTML symbols first
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

    // Headers
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')

    // Blockquotes
    .replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>')

    // Task Checkboxes
    .replace(/^\[ \] (.*$)/gim, '<li style="list-style:none;"><input type="checkbox" disabled /> $1</li>')
    .replace(/^\[x\] (.*$)/gim, '<li style="list-style:none;"><input type="checkbox" checked disabled /> <del>$1</del></li>')

    // Lists
    .replace(/^\- (.*$)/gim, '<li>$1</li>')
    .replace(/^\* (.*$)/gim, '<li>$1</li>')

    // Bold & Italics
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/_(.*?)_/g, '<em>$1</em>')

    // Inline Code & Pre Code Blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    .replace(/`(.*?)`/g, '<code>$1</code>')

    // Line breaks
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');

  return html;
}

export function calculateReadingStats(content = '') {
  const words = content.trim() ? content.trim().split(/\s+/).length : 0;
  const characters = content.length;
  // Avg reading speed 200 wpm
  const minutes = Math.ceil(words / 200);
  return {
    words,
    characters,
    readingTime: words === 0 ? '0 min read' : `${minutes} min read`
  };
}
