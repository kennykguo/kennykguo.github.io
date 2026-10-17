// Blog posts: render LaTeX with KaTeX.
// Write all math as $$...$$: kramdown turns it into \(...\) inside a sentence and \[...\]
// when it sits on its own lines. Single $ is left alone so prices like $5 stay as text.
// Display equations wider than the column scroll sideways; a soft fade on the side with
// more equation hidden shows that there's more to see.
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

  const displays = [...body.querySelectorAll('.katex-display')];
  const markEdges = display => {
    const more = display.scrollWidth - display.clientWidth;
    display.classList.toggle('is-scrollable', more > 1);
    display.classList.toggle('more-left', more > 1 && display.scrollLeft > 1);
    display.classList.toggle('more-right', more > 1 && display.scrollLeft < more - 1);
  };
  displays.forEach(display => {
    display.addEventListener('scroll', () => markEdges(display), { passive: true });
    markEdges(display);
  });
  window.addEventListener('resize', () => displays.forEach(markEdges));
});
