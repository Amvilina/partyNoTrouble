/**
 * Карусель фото: свайп и перетаскивание мышью, точки, стрелки с клавиатуры.
 */
(function () {
  function escapeHtml(s) {
    if (s == null) return "";
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttrUrl(s) {
    return escapeHtml(s);
  }

  /**
   * Разметка карусели. extraClass: например img-carousel--card | img-carousel--hero
   */
  window.buildImageCarouselHtml = function (images, altText, extraClass) {
    const imgs = Array.isArray(images) ? images.filter(Boolean) : [];
    if (!imgs.length) return "";
    const alt = escapeHtml(altText || "");
    const slides = imgs
      .map(function (src) {
        return (
          '<div class="img-carousel__slide"><img src="' +
          escapeAttrUrl(src) +
          '" alt="' +
          alt +
          '" loading="lazy" width="800" height="600" decoding="async" /></div>'
        );
      })
      .join("");
    var dotsHtml = "";
    var navHtml = "";
    if (imgs.length > 1) {
      dotsHtml =
        '<div class="img-carousel__dots">' +
        imgs
          .map(function (_, j) {
            return (
              '<button type="button" class="img-carousel__dot' +
              (j === 0 ? " is-active" : "") +
              '" aria-label="Фото ' +
              (j + 1) +
              " из " +
              imgs.length +
              '"></button>'
            );
          })
          .join("") +
        "</div>";
      navHtml =
        '<button type="button" class="img-carousel__nav img-carousel__nav--prev" aria-label="Предыдущее фото">' +
        '<span class="img-carousel__nav-icon" aria-hidden="true">\u2039</span></button>' +
        '<button type="button" class="img-carousel__nav img-carousel__nav--next" aria-label="Следующее фото">' +
        '<span class="img-carousel__nav-icon" aria-hidden="true">\u203a</span></button>';
    }
    var cls = "img-carousel" + (extraClass ? " " + extraClass : "");
    return (
      '<div class="' +
      cls +
      '" role="region" aria-roledescription="карусель" aria-label="' +
      alt +
      '">' +
      '<div class="img-carousel__viewport">' +
      '<div class="img-carousel__track">' +
      slides +
      "</div>" +
      navHtml +
      "</div>" +
      dotsHtml +
      "</div>"
    );
  };

  function initImageCarousel(el) {
    if (!el || el.getAttribute("data-carousel-init") === "1") return;
    el.setAttribute("data-carousel-init", "1");

    var track = el.querySelector(".img-carousel__track");
    var slides = el.querySelectorAll(".img-carousel__slide");
    var dots = el.querySelectorAll(".img-carousel__dot");
    var viewport = el.querySelector(".img-carousel__viewport");
    if (!track || !viewport || !slides.length) return;

    var n = slides.length;
    var i = 0;
    var ignoreClick = false;

    function go(to) {
      i = ((to % n) + n) % n;
      track.style.transform = "translateX(" + -i * 100 + "%)";
      dots.forEach(function (d, j) {
        d.classList.toggle("is-active", j === i);
      });
      slides.forEach(function (s, j) {
        s.setAttribute("aria-hidden", j === i ? "false" : "true");
      });
    }

    el.addEventListener(
      "click",
      function (e) {
        if (ignoreClick) {
          e.preventDefault();
          e.stopPropagation();
          ignoreClick = false;
        }
      },
      true
    );

    if (n <= 1) {
      go(0);
      return;
    }

    var startX = 0;
    var activePointerId = null;

    viewport.addEventListener("pointerdown", function (e) {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      startX = e.clientX;
      activePointerId = e.pointerId;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch (err) {}

      function onMove(ev) {
        if (ev.pointerId !== activePointerId) return;
      }

      function onEnd(ev) {
        if (ev.pointerId !== activePointerId) return;
        try {
          viewport.releasePointerCapture(ev.pointerId);
        } catch (err2) {}
        viewport.removeEventListener("pointermove", onMove);
        viewport.removeEventListener("pointerup", onEnd);
        viewport.removeEventListener("pointercancel", onEnd);
        var dx = ev.clientX - startX;
        if (Math.abs(dx) > 48) {
          ignoreClick = true;
          if (dx < 0) go(i + 1);
          else go(i - 1);
        }
        activePointerId = null;
      }

      viewport.addEventListener("pointermove", onMove);
      viewport.addEventListener("pointerup", onEnd);
      viewport.addEventListener("pointercancel", onEnd);
    });

    dots.forEach(function (dot, j) {
      dot.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(j);
      });
    });

    var prevBtn = el.querySelector(".img-carousel__nav--prev");
    var nextBtn = el.querySelector(".img-carousel__nav--next");
    function bindNav(btn, delta) {
      if (!btn) return;
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        go(i + delta);
      });
    }
    bindNav(prevBtn, -1);
    bindNav(nextBtn, 1);

    if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
    el.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(i - 1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(i + 1);
      }
    });

    go(0);
  }

  window.initImageCarousel = initImageCarousel;

  window.initAllImageCarousels = function (scope) {
    var root = scope || document;
    root.querySelectorAll(".img-carousel").forEach(function (el) {
      initImageCarousel(el);
    });
  };
})();
