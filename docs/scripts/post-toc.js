// Blog posts: a contents list built from the post's headings (h2 and h3), with the section
// you're reading highlighted as you scroll.
// Wide screens: the list sits in the left margin. Narrower screens: a bar near the top of the
// post opens the list as a dropdown, and once that bar has scrolled away a small floating
// "contents" button appears in the corner, opening the same list as a sheet from the bottom.
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

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'post-toc-fab';
  fab.setAttribute('aria-label', 'Open contents');
  const fabIcon = document.createElement('span');
  fabIcon.className = 'post-toc-fab-icon';
  fabIcon.setAttribute('aria-hidden', 'true');
  fab.append(fabIcon, document.createTextNode('contents'));

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

  toc.append(label, toggle, list, fab);
  toc.hidden = false;

  // Open as a dropdown under the bar, or as a sheet from the bottom (from the floating button).
  // The sheet class stays on until the closing fade ends, so the list doesn't jump mid-fade.
  let sheetTimer = null;
  function setOpen(open, sheet = false) {
    clearTimeout(sheetTimer);
    toc.classList.toggle('is-open', open);
    if (open) {
      toc.classList.toggle('is-sheet', sheet);
      const active = list.querySelector('.is-active');
      if (sheet && active) list.scrollTop = active.offsetTop - list.clientHeight / 2;
    } else {
      sheetTimer = setTimeout(() => toc.classList.remove('is-sheet'), 200);
    }
    toggle.setAttribute('aria-expanded', String(open && !sheet));
    fab.setAttribute('aria-expanded', String(open && sheet));
  }
  toggle.addEventListener('click', () => setOpen(!toc.classList.contains('is-open')));
  fab.addEventListener('click', () => setOpen(!toc.classList.contains('is-open'), true));
  list.addEventListener('click', event => {
    if (event.target.closest('a')) setOpen(false);
  });
  // tapping anywhere else closes the list
  document.addEventListener('click', event => {
    if (!toc.contains(event.target)) setOpen(false);
  });

  // The floating button shows once the bar near the top has scrolled out of view
  new IntersectionObserver(([entry]) => {
    const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    toc.classList.toggle('is-past', past);
    if (!past && toc.classList.contains('is-sheet')) setOpen(false);
  }).observe(toggle);

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
