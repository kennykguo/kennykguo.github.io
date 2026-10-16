// Latent page: tiles are shuffled into a new random order on every load, then fade in
// one by one in a random order as they scroll into view.
// Runs straight away (the script sits after the grid) so this happens before first paint.
(function () {
  const grid = document.querySelector('.gallery-fullwidth');
  if (!grid) return;

  // Shuffle, retrying a few times to avoid two videos side by side
  const tiles = [...grid.querySelectorAll('.gallery-item')];
  const isVideo = tile => tile.hasAttribute('data-video');
  let order = tiles;
  for (let attempt = 0; attempt < 20; attempt++) {
    order = tiles.slice();
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    if (!order.some((tile, i) => i > 0 && isVideo(tile) && isVideo(order[i - 1]))) break;
  }
  order.forEach(tile => grid.appendChild(tile));

  if (!('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  grid.classList.add('is-revealing');
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const tile = entry.target;
      tile.style.setProperty('--reveal-delay', `${Math.round(Math.random() * 900)}ms`);
      tile.classList.add('is-in');
      observer.unobserve(tile);
    });
  }, { rootMargin: '0px 0px -5% 0px' });
  grid.querySelectorAll('.gallery-item').forEach(tile => observer.observe(tile));
})();

document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up gallery modal...');
  
  // Set all videos to slow motion (0.5x speed)
  const allVideos = document.querySelectorAll('video');
  allVideos.forEach(video => {
    video.playbackRate = 0.5;
  });

  // Hover-to-play tiles: paused until the pointer is over them
  document.querySelectorAll('.gallery-item.hover-play video').forEach(video => {
    const tile = video.closest('.gallery-item');
    tile.addEventListener('mouseenter', () => {
      video.playbackRate = 0.5;
      video.play().catch(() => {});
    });
    tile.addEventListener('mouseleave', () => video.pause());
  });
  
  // Add click listeners to all gallery items using event delegation
  const galleries = document.querySelectorAll('.gallery-top, .gallery-fullwidth, .image-gallery, .origami-gallery');
  galleries.forEach(gallery => {
    gallery.addEventListener('click', function(e) {
      const galleryItem = e.target.closest('.gallery-item');
      if (galleryItem) {
        const video = galleryItem.querySelector('video');
        const imageUrl = galleryItem.getAttribute('data-image');
        
        if (video) {
          openModal(video);
        } else if (imageUrl) {
          // Create a temporary img element for the modal
          const tempImg = document.createElement('img');
          tempImg.src = imageUrl;
          tempImg.alt = galleryItem.getAttribute('alt') || '';
          openModal(tempImg);
        }
      } else if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        openModal(e.target);
      }
    });
  });
  
  function openModal(element) {
    const modal = document.getElementById('galleryModal');
    const modalImage = document.getElementById('modalImage');
    const modalVideo = document.getElementById('modalVideo');
    
    if (!modal || !modalImage || !modalVideo) return;
    
    // Hide both initially
    modalImage.style.display = 'none';
    modalVideo.style.display = 'none';
    
    if (element.tagName === 'IMG') {
      modalImage.src = element.src;
      modalImage.alt = element.alt;
      modalImage.style.display = 'block';
    } else if (element.tagName === 'VIDEO') {
      const source = element.querySelector('source');
      if (source) {
        modalVideo.src = source.src;
      }
      modalVideo.style.display = 'block';
      modalVideo.playbackRate = 0.5; // Set modal video to slow motion too
      modalVideo.play().catch(e => {});
    }
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
  }
  
  function closeModal() {
    const modal = document.getElementById('galleryModal');
    const modalVideo = document.getElementById('modalVideo');
    
    if (modal) {
      modal.style.display = 'none';
    }
    document.body.style.overflow = 'auto';
    
    if (modalVideo) {
      modalVideo.pause();
      modalVideo.src = '';
    }
  }
  
  // Close modal when clicking X button
  const closeButton = document.querySelector('#galleryModal span');
  if (closeButton) {
    closeButton.addEventListener('click', closeModal);
  }
  
  // Close modal when clicking outside content
  const modal = document.getElementById('galleryModal');
  if (modal) {
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });
  }
  
  // Close modal with Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal && modal.style.display === 'block') {
      closeModal();
    }
  });
  
  console.log('Gallery modal ready - click any image or video to enlarge!');
});
