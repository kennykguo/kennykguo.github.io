---
layout: default
title: 
---

<div class="origami-page">
  <div class="origami-content">
    <div class="origami-gallery">
      <img src="/media/images/origami-1.jpg" alt="Origami 1" loading="lazy" style="cursor:pointer;">
      <img src="/media/images/origami-2.jpg" alt="Origami 2" loading="lazy" style="cursor:pointer;">
      <img src="/media/images/origami-3.jpg" alt="Origami 3" loading="lazy" style="cursor:pointer;">
    </div>
  </div>

  <!-- Modal for enlarged images -->
  <div id="galleryModal" class="modal">
    <span class="modal-close">&times;</span>
    <div class="modal-content">
      <img id="modalImage" alt="" style="display:none;">
      <video id="modalVideo" style="display:none;" controls></video>
    </div>
  </div>
</div>
<script src="{{ site.baseurl }}/scripts/gallery-modal.js"></script>
