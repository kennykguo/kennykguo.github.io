// Blog posts: a contents list built from the post's headings (h2 and h3), with the section
// you're reading highlighted as you scroll. On narrow screens it's a bar stuck to the top of
// the screen that shows the current section and opens into the full list.
(function () {
  const toc = document.querySelector('.post-toc');
  const body = document.querySelector('.post-body');
  if (!toc || !body) return;
  const headings = [...body.querySelectorAll('h2[id], h3[id]')];
  if (headings.length < 2) return;

  const label = document.createElement('span');
  label.className = 'post-toc-label';
  label.textContent = 'Contents';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'post-toc-toggle';
  toggle.setAttribute('aria-expanded', 'false');
  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'post-toc-toggle-label';
  toggleLabel.textContent = 'contents';
  const currentLabel = document.createElement('span');
  currentLabel.className = 'post-toc-current';
  const chevron = document.createElement('span');
  chevron.className = 'post-toc-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  toggle.append(toggleLabel, currentLabel, chevron);

  const list = document.createElement('ol');
  const links = headings.map(heading => {
    const item = document.createElement('li');
    if (heading.tagName === 'H3') item.className = 'toc-sub';
    const link = document.createElement('a');
    link.href = `#${heading.id}`;
    link.textContent = heading.textContent;
    item.appendChild(link);
    list.appendChild(item);
    return link;
  });

  toc.append(label, toggle, list);
  toc.hidden = false;

  const setOpen = open => {
    toc.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
  list.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  // tapping anywhere else closes the list
  document.addEventListener('click', event => {
    if (!toc.contains(event.target)) setOpen(false);
  });

  // On wide screens the list sits in the left margin, starting below the post's title and then
  // staying put once the title has scrolled away
  const header = document.querySelector('.post-header');
  const wide = window.matchMedia('(min-width: 1240px)');
  function place() {
    if (!wide.matches || !header) { toc.style.top = ''; return; }
    toc.style.top = `${Math.max(144, header.getBoundingClientRect().bottom + 32)}px`;
  }

  // The current section is the last heading that has scrolled past the top fifth of the screen
  let active = -1;
  function update() {
    place();
    const line = window.innerHeight * 0.2;
    let current = 0;
    headings.forEach((heading, i) => {
      if (heading.getBoundingClientRect().top <= line) current = i;
    });
    if (current === active) return;
    active = current;
    links.forEach((link, i) => {
      link.classList.toggle('is-active', i === current);
      if (i === current) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
    currentLabel.textContent = headings[current].textContent;
  }

  // Listen in the capture phase: on phones the site's styles make <body> the element that
  // scrolls, and its scroll events never reach window
  let queued = false;
  document.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => { queued = false; update(); });
  }, { capture: true, passive: true });
  window.addEventListener('resize', update);
  update();
})();
