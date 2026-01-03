// XSS prevention: Escape HTML entities
function escapeHtml(text) {
  if (typeof text !== 'string') {
    return text;
  }
  
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

// Sanitize user input for display (basic version)
// For production, consider using DOMPurify or similar library
function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return input;
  }
  
  // Remove script tags and event handlers
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/javascript:/gi, '');
}

// Validate and sanitize note content
function sanitizeNote(note) {
  if (!note) return '';
  
  // First sanitize, then escape
  const sanitized = sanitizeInput(note);
  return escapeHtml(sanitized);
}

module.exports = {
  escapeHtml,
  sanitizeInput,
  sanitizeNote,
};

