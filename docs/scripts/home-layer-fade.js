document.addEventListener("DOMContentLoaded", () => {
  const homeStack = document.querySelector(".home-stack.edge-blur");
  if (!homeStack) {
    return;
  }

  const layers = Array.from(homeStack.querySelectorAll(".home-layer"));
  if (layers.length === 0) {
    return;
  }

  const layerNodes = layers.map((layer) => ({
    layer,
    textBlocks: Array.from(layer.querySelectorAll(".layer-text")),
    mediaImages: Array.from(layer.querySelectorAll(".layer-media img, .image-layer .image-block img")),
  }));

  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const compactLayoutQuery = window.matchMedia("(max-width: 850px)");

  const applyLayerState = ({ layer, textBlocks, mediaImages }, focus) => {
    const clampedFocus = Math.max(0, Math.min(1, focus));
    const fadeStrength = 1 - clampedFocus;
    const textOpacity = 0.42 + clampedFocus * 0.58;
    const textBlur = fadeStrength * 2.8;
    const mediaBlur = fadeStrength * 6;
    const mediaScale = 1 + fadeStrength * 0.015;
    const layerOpacity = 0.3 + clampedFocus * 0.7;

    layer.style.opacity = layerOpacity.toFixed(3);
    layer.style.setProperty("--layer-text-overlay-opacity", (fadeStrength * 0.9).toFixed(3));
    layer.style.setProperty("--layer-media-overlay-opacity", (fadeStrength * 0.95).toFixed(3));

    textBlocks.forEach((textBlock) => {
      const textBlurValue = textBlur <= 0.01 ? "none" : `blur(${textBlur.toFixed(2)}px)`;
      textBlock.style.opacity = textOpacity.toFixed(3);
      textBlock.style.filter = textBlurValue;
      textBlock.style.webkitFilter = textBlurValue;
    });

    mediaImages.forEach((image) => {
      const mediaBlurValue = mediaBlur <= 0.01 ? "none" : `blur(${mediaBlur.toFixed(2)}px)`;
      image.style.filter = mediaBlurValue;
      image.style.webkitFilter = mediaBlurValue;
      image.style.transform = mediaScale <= 1.0005 ? "none" : `scale(${mediaScale.toFixed(4)})`;
    });
  };

  const setFocused = () => {
    layerNodes.forEach((layerNode) => {
      applyLayerState(layerNode, 1);
    });
  };

  let rafId = null;

  const updateLayers = () => {
    rafId = null;

    if (reducedMotionQuery.matches || compactLayoutQuery.matches) {
      setFocused();
      return;
    }

    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    const edgeBand = Math.max(1, viewportHeight * 0.1);

    layerNodes.forEach((layerNode) => {
      const rect = layerNode.layer.getBoundingClientRect();
      const visibleTop = Math.max(rect.top, 0);
      const visibleBottom = Math.min(rect.bottom, viewportHeight);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const fullyOnScreen = rect.top >= 0 && rect.bottom <= viewportHeight;

      let focus = 0;

      if (visibleHeight > 0) {
        if (fullyOnScreen) {
          focus = 1;
        } else {
          const t = Math.min(1, visibleHeight / edgeBand);
          const held = Math.pow(t, 1.5);
          focus = held * held * (3 - 2 * held);
        }
      }

      applyLayerState(layerNode, focus);
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

  if (typeof compactLayoutQuery.addEventListener === "function") {
    compactLayoutQuery.addEventListener("change", requestUpdate);
  } else if (typeof compactLayoutQuery.addListener === "function") {
    compactLayoutQuery.addListener(requestUpdate);
  }
});
