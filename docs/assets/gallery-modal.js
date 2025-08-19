document.addEventListener('DOMContentLoaded', function() {
  console.log('Setting up gallery modal...');
  
  // Add click listeners to all gallery items using event delegation
  const gallery = document.querySelector('.image-gallery');
  if (gallery) {
    gallery.addEventListener('click', function(e) {
      if (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO') {
        openModal(e.target);
      }
    });
  }
  
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