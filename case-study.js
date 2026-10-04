/* -------------------------------------------------------------
   CASE-STUDY PAGES — small helpers (loaded only on project pages)
   1. A row of "jump to" chips under the summary.
   2. The mini gallery at the end: a title, a short hint, arrow buttons
      for the sideways strip.
   3. A bigger viewer for the gallery pictures (arrow keys, Esc, swipe
      friendly arrows on phones).
   Everything is optional: without this file the page still reads in
   full and the pictures link to their full-size files.
   ------------------------------------------------------------- */
(function () {
  "use strict";

  var article = document.querySelector(".project");
  if (!article) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- 1. "Jump to" chips ---- */
  var slug = function (text) {
    return text
      .toLowerCase()
      .replace(/&/g, "and")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  var gallery = article.querySelector(".project__gallery");
  var galleryTitle = null;
  if (gallery) {
    galleryTitle = document.createElement("h2");
    galleryTitle.className = "project__section-title gallery__title";
    galleryTitle.id = "gallery";
    galleryTitle.style.marginTop = "3rem";
    galleryTitle.textContent = "Gallery";
    gallery.parentNode.insertBefore(galleryTitle, gallery);
  }

  var titles = Array.prototype.slice.call(article.querySelectorAll(".project__section-title"));
  var anchors = [];
  titles.forEach(function (title) {
    var holder = title.closest(".project__section, .project__compare") || title;
    if (!holder.id) holder.id = slug(title.textContent);
    if (title === galleryTitle) holder = title;
    anchors.push({ id: holder.id, label: title.textContent.trim() });
  });

  var anchorAfter = article.querySelector(".pitch") || article.querySelector(".project__facts");
  if (anchorAfter && anchors.length >= 3) {
    var list = document.createElement("ul");
    list.className = "toc";
    list.setAttribute("aria-label", "Jump to a part of this page");
    anchors.forEach(function (a) {
      var li = document.createElement("li");
      var link = document.createElement("a");
      link.href = "#" + a.id;
      link.textContent = a.label;
      li.appendChild(link);
      list.appendChild(li);
    });
    anchorAfter.parentNode.insertBefore(list, anchorAfter.nextSibling);
  }

  if (!gallery) return;

  /* ---- 2. The strip: hint and arrows ---- */
  gallery.setAttribute("role", "group");
  gallery.setAttribute("aria-label", "Project gallery");
  gallery.tabIndex = 0;

  var count = gallery.children.length;
  var controls = document.createElement("div");
  controls.className = "gallery__controls";
  controls.innerHTML =
    '<p class="gallery__hint">' + count + (count === 1 ? " item" : " items") + " · scroll sideways or use the arrows</p>" +
    '<div class="gallery__arrows">' +
    '<button class="gallery__arrow" type="button" data-dir="-1" aria-label="Scroll the gallery left">‹</button>' +
    '<button class="gallery__arrow" type="button" data-dir="1" aria-label="Scroll the gallery right">›</button>' +
    "</div>";
  gallery.parentNode.insertBefore(controls, gallery);

  var back = controls.querySelector('[data-dir="-1"]');
  var forward = controls.querySelector('[data-dir="1"]');
  var syncArrows = function () {
    var max = gallery.scrollWidth - gallery.clientWidth - 2;
    back.disabled = gallery.scrollLeft <= 2;
    forward.disabled = gallery.scrollLeft >= max;
  };
  controls.addEventListener("click", function (event) {
    var button = event.target.closest(".gallery__arrow");
    if (!button) return;
    gallery.scrollBy({
      left: Number(button.dataset.dir) * gallery.clientWidth * 0.8,
      behavior: reduced ? "auto" : "smooth",
    });
  });
  gallery.addEventListener("scroll", syncArrows, { passive: true });
  window.addEventListener("resize", syncArrows);
  window.addEventListener("load", syncArrows);
  syncArrows();

  /* ---- 3. The bigger viewer ---- */
  var links = Array.prototype.slice.call(gallery.querySelectorAll("a"));
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  var dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", "Picture viewer");
  dialog.innerHTML =
    '<button class="gallery__arrow lightbox__close" type="button" aria-label="Close the viewer">×</button>' +
    '<div class="lightbox__stage">' +
    '<button class="gallery__arrow gallery__arrow--prev" type="button" aria-label="Previous picture">‹</button>' +
    '<figure class="lightbox__figure">' +
    '<img class="lightbox__img" alt="" />' +
    '<figcaption class="lightbox__cap"></figcaption>' +
    "</figure>" +
    '<button class="gallery__arrow gallery__arrow--next" type="button" aria-label="Next picture">›</button>' +
    "</div>";
  document.body.appendChild(dialog);

  var img = dialog.querySelector(".lightbox__img");
  var caption = dialog.querySelector(".lightbox__cap");
  var current = 0;

  var show = function (index) {
    current = (index + links.length) % links.length;
    var link = links[current];
    var thumb = link.querySelector("img");
    var alt = thumb ? thumb.getAttribute("alt") || "" : "";
    img.src = link.getAttribute("href");
    img.alt = alt;
    caption.textContent = "";
    var text = document.createTextNode(alt);
    var counter = document.createElement("span");
    counter.className = "lightbox__count";
    counter.textContent = current + 1 + " of " + links.length;
    caption.appendChild(text);
    caption.appendChild(counter);
  };

  links.forEach(function (link, index) {
    link.addEventListener("click", function (event) {
      event.preventDefault();
      show(index);
      dialog.showModal();
    });
  });

  dialog.querySelector(".gallery__arrow--prev").addEventListener("click", function () {
    show(current - 1);
  });
  dialog.querySelector(".gallery__arrow--next").addEventListener("click", function () {
    show(current + 1);
  });
  dialog.querySelector(".lightbox__close").addEventListener("click", function () {
    dialog.close();
  });
  dialog.addEventListener("click", function (event) {
    // a click on the dark area (the dialog itself) closes it
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("keydown", function (event) {
    if (event.key === "ArrowLeft") show(current - 1);
    if (event.key === "ArrowRight") show(current + 1);
  });
  dialog.addEventListener("close", function () {
    img.removeAttribute("src");
  });
})();
