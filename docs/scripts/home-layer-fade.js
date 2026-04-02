document.addEventListener("DOMContentLoaded", () => {
  const homeStack = document.querySelector(".home-stack.edge-blur");
  if (!homeStack) {
    return;
  }

  const layers = Array.from(homeStack.querySelectorAll(".home-layer"));
  if (layers.length === 0) {
    return;
  }

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

  const setFocused = () => {
    layers.forEach((layer) => {
      layer.style.setProperty("--layer-focus", "1");
    });
  };

  let rafId = null;

  const updateLayers = () => {
    rafId = null;

    if (reducedMotionQuery.matches) {
      setFocused();
      return;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const edgeBand = Math.max(1, viewportHeight * 0.1);

    layers.forEach((layer) => {
      const rect = layer.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, viewportHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const fullyOnScreen = rect.top >= 0 && rect.bottom <= viewportHeight;

      let focus = 0;

      if (visibleHeight > 0) {
        if (fullyOnScreen) {
          focus = 1;
        } else {
          // Fade in/out only across the edge band (top 10% and bottom 10% of viewport).
          const t = Math.min(1, visibleHeight / edgeBand);
          const held = Math.pow(t, 1.5);
          // Cinematic profile: hold layers dimmed near edges, then lift smoothly.
          focus = held * held * (3 - 2 * held);
        }
      }

      layer.style.setProperty("--layer-focus", focus.toFixed(3));
    });
  };

  const requestUpdate = () => {
    if (rafId !== null) {
      return;
    }
    rafId = window.requestAnimationFrame(updateLayers);
  };

  requestUpdate();
  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);

  if (typeof reducedMotionQuery.addEventListener === "function") {
    reducedMotionQuery.addEventListener("change", requestUpdate);
  } else if (typeof reducedMotionQuery.addListener === "function") {
    reducedMotionQuery.addListener(requestUpdate);
  }
});
