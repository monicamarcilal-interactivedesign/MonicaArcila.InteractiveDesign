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

  /* Words the script writes itself, in the page's language. */
  var es = (document.documentElement.lang || "").toLowerCase().indexOf("es") === 0;
  var T = es
    ? {
        gallery: "Galería",
        jump: "Ir a una parte de esta página",
        group: "Galería del proyecto",
        one: " elemento",
        many: " elementos",
        hint: " · desliza hacia los lados o usa las flechas",
        left: "Desplazar la galería a la izquierda",
        right: "Desplazar la galería a la derecha",
        viewer: "Visor de imágenes",
        close: "Cerrar el visor",
        prev: "Imagen anterior",
        next: "Imagen siguiente",
        of: " de ",
      }
    : {
        gallery: "Gallery",
        jump: "Jump to a part of this page",
        group: "Project gallery",
        one: " item",
        many: " items",
        hint: " · scroll sideways or use the arrows",
        left: "Scroll the gallery left",
        right: "Scroll the gallery right",
        viewer: "Picture viewer",
        close: "Close the viewer",
        prev: "Previous picture",
        next: "Next picture",
        of: " of ",
      };

  /* ---- 0. YouTube players. Each one starts by itself, muted (browsers only
     allow autoplay without sound; the player has its own sound button), and
     loops. It loads when it scrolls into view and pauses when it scrolls out,
     so the page stays light. On a file:// copy YouTube refuses embeds, so the
     poster stays and its link opens YouTube in a new tab. ---- */
  var canEmbed = /^https?:$/.test(window.location.protocol);
  var command = function (frame, name) {
    try {
      frame.contentWindow.postMessage(JSON.stringify({ event: "command", func: name, args: [] }), "*");
    } catch (e) {}
  };
  Array.prototype.forEach.call(document.querySelectorAll(".yt[data-yt]"), function (box) {
    if (!canEmbed || !("IntersectionObserver" in window)) return;
    var id = box.getAttribute("data-yt");
    var frame = null;
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            if (!frame) {
              frame = document.createElement("iframe");
              frame.src =
                "https://www.youtube-nocookie.com/embed/" + id +
                "?autoplay=1&mute=1&loop=1&playlist=" + id +
                "&rel=0&modestbranding=1&playsinline=1&enablejsapi=1";
              frame.title = box.getAttribute("data-title") || "Video";
              frame.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
              frame.referrerPolicy = "strict-origin-when-cross-origin";
              box.textContent = "";
              box.classList.add("is-playing");
              box.appendChild(frame);
            } else {
              command(frame, "playVideo");
            }
          } else if (frame) {
            command(frame, "pauseVideo");
          }
        });
      },
      { threshold: 0.35 }
    );
    observer.observe(box);
  });

  /* ---- Videos that are files on the site (not YouTube) do the same: they start
     by themselves, muted, and loop while they are on screen, and pause when
     they scroll away. The controls stay, so a visitor can add sound or stop. ---- */
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  Array.prototype.forEach.call(document.querySelectorAll(".project__gallery video, .project__media video"), function (video) {
    if (calm || !("IntersectionObserver" in window)) return;
    video.muted = true;
    video.loop = true;
    video.setAttribute("playsinline", "");
    video.preload = "metadata";
    new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var p = video.play();
            if (p && p.catch) p.catch(function () {});
          } else {
            video.pause();
          }
        });
      },
      { threshold: 0.4 }
    ).observe(video);
  });

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
    galleryTitle.textContent = T.gallery;
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
    list.setAttribute("aria-label", T.jump);
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
  gallery.setAttribute("aria-label", T.group);
  gallery.tabIndex = 0;

  var count = gallery.children.length;
  var controls = document.createElement("div");
  controls.className = "gallery__controls";
  controls.innerHTML =
    '<p class="gallery__hint">' + count + (count === 1 ? T.one : T.many) + T.hint + "</p>" +
    '<div class="gallery__arrows">' +
    '<button class="gallery__arrow" type="button" data-dir="-1" aria-label="' + T.left + '">‹</button>' +
    '<button class="gallery__arrow" type="button" data-dir="1" aria-label="' + T.right + '">›</button>' +
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
  var links = Array.prototype.slice.call(gallery.querySelectorAll("a:not(.yt__link)"));
  if (!links.length || typeof HTMLDialogElement !== "function") return;

  var dialog = document.createElement("dialog");
  dialog.className = "lightbox";
  dialog.setAttribute("aria-label", T.viewer);
  dialog.innerHTML =
    '<button class="gallery__arrow lightbox__close" type="button" aria-label="' + T.close + '">×</button>' +
    '<div class="lightbox__stage">' +
    '<button class="gallery__arrow gallery__arrow--prev" type="button" aria-label="' + T.prev + '">‹</button>' +
    '<figure class="lightbox__figure">' +
    '<img class="lightbox__img" alt="" />' +
    '<figcaption class="lightbox__cap"></figcaption>' +
    "</figure>" +
    '<button class="gallery__arrow gallery__arrow--next" type="button" aria-label="' + T.next + '">›</button>' +
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
    var stage = link.getAttribute("data-stage");
    img.src = link.getAttribute("href");
    img.alt = alt;
    caption.textContent = "";
    var text = document.createTextNode(stage ? stage + ": " + alt : alt);
    var counter = document.createElement("span");
    counter.className = "lightbox__count";
    counter.textContent = current + 1 + T.of + links.length;
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
