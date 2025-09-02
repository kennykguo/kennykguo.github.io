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
</div>

<!-- Modal for enlarged images -->
<div id="galleryModal" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:9999;">
  <span style="position:absolute; top:20px; right:35px; color:white; font-size:40px; font-weight:bold; cursor:pointer;">&times;</span>
  <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); max-width:90%; max-height:90%;">
    <img id="modalImage" style="max-width:100%; max-height:100%; display:none;">
    <video id="modalVideo" style="max-width:100%; max-height:100%; display:none;" controls></video>
  </div>
</div>
<br>
<br>
<br>
<br>
<script src="{{ site.baseurl }}/scripts/gallery-modal.js"></script>