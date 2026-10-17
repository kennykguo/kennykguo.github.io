reasoning: blog posts

Layout of this folder
- `index.html` is the reasoning page: the list of everything I've written.
- Each post written on this site gets its own folder, named after its URL:
  `reasoning/<slug>/index.md` is served at `/reasoning/<slug>/`.
  The post's scripts and images live in that same folder (e.g. `reasoning/<slug>/images/`).
- Posts hosted elsewhere (Substack etc.) don't get a folder; they're only a link in `index.html`.

Writing a post
- Create `reasoning/<slug>/index.md` with this front matter:

      ---
      layout: post
      title: "post title"
      date: YYYY-MM-DD
      description: one line for search results
      ---

- Add it to the list in `reasoning/index.html` so it shows up there.

Math (KaTeX)
- Write all math with double dollars. Inside a sentence it renders inline: `the phase is $$\phi = \beta L$$`.
- On its own lines (blank line before and after) it renders as a centred equation:

      $$
      \nabla^2 \mathbf{E} - \mu_0 \varepsilon \frac{\partial^2 \mathbf{E}}{\partial t^2} = 0
      $$

- `\begin{aligned} ... \end{aligned}` works for multi-line equations.
- Single `$` is plain text, so prices like $5 are safe.
- Inside raw HTML (like a figcaption), write inline math as `\(...\)`; kramdown doesn't convert `$$` there.
- Avoid `{{` and `{%` in math: Jekyll reads them as template tags.

Images
- Put them in the post's folder, e.g. `reasoning/<slug>/images/name.jpg`.
- Markdown, relative to the post: `![alt text](images/name.jpg)`
- With a caption:

      <figure>
        <img src="images/name.jpg" alt="alt text">
        <figcaption>Caption text.</figcaption>
      </figure>

Code
- Fenced blocks with a language get syntax highlighting:

      ```python
      k0 = 2 * np.pi / wavelength
      ```

Also supported: tables, blockquotes (`>`), and footnotes (`[^1]`, then `[^1]: note` at the bottom).

Interactive figures
- Put the figure scripts in the post's folder and list them in front matter by file name:
  `scripts:` for classic scripts, `modules:` for ES modules (e.g. ones that import Three.js).
- Place `<figure class="viz" data-viz="name" data-label="..."><div class="viz-stage"></div><figcaption>...</figcaption></figure>` where the figure goes.
- `deep-dive-into-photonics/` is the worked example (`viz.js` for 2D canvas figures, `em-wave-3d.js` for Three.js).
