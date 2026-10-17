// Blog posts: render LaTeX with KaTeX.
// Write all math as $$...$$: kramdown turns it into \(...\) inside a sentence and \[...\]
// when it sits on its own lines. Single $ is left alone so prices like $5 stay as text.
document.addEventListener('DOMContentLoaded', () => {
  const body = document.querySelector('.post-body');
  if (!body || typeof renderMathInElement !== 'function') return;
  renderMathInElement(body, {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '\\[', right: '\\]', display: true },
      { left: '\\(', right: '\\)', display: false },
    ],
    throwOnError: false,
  });
});
