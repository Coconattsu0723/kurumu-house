"use strict";

const story = document.querySelector(".story");
const storySections = document.querySelectorAll(".story-section");
const storyPoints = document.querySelectorAll(".story-point");
const panMediaElements = document.querySelectorAll(".pan-media");
const autoGalleries = document.querySelectorAll(".tour-gallery");
const materialSliders = document.querySelectorAll("[data-material-slider]");
const demoForms = document.querySelectorAll("[data-demo-form]");
const reduceMotionQuery = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

materialSliders.forEach((slider) => {
  const slides = Array.from(
    slider.querySelectorAll(".material-slider__slide")
  );
  const previousButton = slider.querySelector("[data-material-previous]");
  const nextButton = slider.querySelector("[data-material-next]");
  const count = slider.querySelector("[data-material-count]");

  if (
    slides.length === 0 ||
    !previousButton ||
    !nextButton ||
    !count
  ) {
    return;
  }

  let currentIndex = 0;

  const updateMaterialSlider = () => {
    slides.forEach((slide, index) => {
      const isCurrent = index === currentIndex;

      slide.hidden = !isCurrent;
      slide.setAttribute("aria-hidden", String(!isCurrent));
    });

    previousButton.disabled = currentIndex === 0;
    nextButton.disabled = currentIndex === slides.length - 1;
    count.textContent = `${currentIndex + 1} / ${slides.length}`;
  };

  previousButton.addEventListener("click", () => {
    currentIndex = Math.max(currentIndex - 1, 0);
    updateMaterialSlider();
  });

  nextButton.addEventListener("click", () => {
    currentIndex = Math.min(currentIndex + 1, slides.length - 1);
    updateMaterialSlider();
  });

  slider.classList.add("is-initialized");
  updateMaterialSlider();
});

demoForms.forEach((form) => {
  const message = form.querySelector("[data-form-message]");

  form.addEventListener("submit", (event) => {
    event.preventDefault();

    if (message) {
      message.hidden = false;
    }
  });
});

if (story) {
  let storyStart = 0;
  let storyLength = 1;
  let animationFrameId = null;
  const storyProgressViewportRatio = 0.72;

  const alignStoryPointsWithHeadings = () => {
    storySections.forEach((section) => {
      const point = section.querySelector(".story-point");
      const headingId = section.getAttribute("aria-labelledby");
      const heading = headingId
        ? document.getElementById(headingId)
        : null;

      if (!point || !heading) {
        return;
      }

      const sectionRect = section.getBoundingClientRect();
      const headingRect = heading.getBoundingClientRect();
      const pointRect = point.getBoundingClientRect();
      const headingStyle = window.getComputedStyle(heading);
      const headingLineHeight = Number.parseFloat(headingStyle.lineHeight);
      const transformMatch = headingStyle.transform.match(
        /^matrix(?:3d)?\((.+)\)$/
      );
      const transformValues = transformMatch
        ? transformMatch[1]
            .split(",")
            .map((value) => Number.parseFloat(value.trim()))
        : [];
      const headingTranslateY =
        transformValues.length === 16
          ? transformValues[13]
          : transformValues[5] || 0;
      const centerAdjustment = Number.isFinite(headingLineHeight)
        ? Math.max((headingLineHeight - pointRect.height) / 2, 0)
        : 0;
      const pointBlockStart =
        headingRect.top -
        headingTranslateY -
        sectionRect.top +
        centerAdjustment;

      section.style.setProperty(
        "--story-point-block-start",
        `${pointBlockStart}px`
      );
    });
  };

  const clamp = (value, minimum, maximum) =>
    Math.min(Math.max(value, minimum), maximum);

  const updateStoryProgress = () => {
    animationFrameId = null;

    if (reduceMotionQuery.matches) {
      story.style.setProperty("--story-progress", "1");
      return;
    }

    const viewportProgressPosition =
      window.scrollY + window.innerHeight * storyProgressViewportRatio;
    const progress = clamp(
      (viewportProgressPosition - storyStart) / storyLength,
      0,
      1
    );

    story.style.setProperty("--story-progress", progress.toString());
  };

  const requestStoryUpdate = () => {
    if (animationFrameId !== null) {
      return;
    }

    animationFrameId = window.requestAnimationFrame(updateStoryProgress);
  };

  const measureStory = () => {
    alignStoryPointsWithHeadings();

    const storyRect = story.getBoundingClientRect();

    storyStart = storyRect.top + window.scrollY;
    storyLength = Math.max(storyRect.height, 1);

    requestStoryUpdate();
  };

  window.addEventListener("scroll", requestStoryUpdate, { passive: true });
  window.addEventListener("resize", measureStory);
  window.addEventListener("load", measureStory);
  reduceMotionQuery.addEventListener("change", measureStory);

  story.querySelectorAll("img").forEach((image) => {
    if (!image.complete) {
      image.addEventListener("load", measureStory, { once: true });
    }
  });

  if (document.fonts) {
    document.fonts.ready.then(measureStory);
  }

  measureStory();
}

if (
  storySections.length > 0 ||
  panMediaElements.length > 0 ||
  autoGalleries.length > 0
) {
  if ("IntersectionObserver" in window) {
    document.documentElement.classList.add("has-story-observer");

    const storyObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.target.classList.contains("story-point")) {
            if (!entry.isIntersecting) {
              return;
            }

            const storySection = entry.target.closest(".story-section");

            if (storySection) {
              storySection.classList.add("is-visible");
            }

            observer.unobserve(entry.target);
            return;
          }

          if (entry.target.classList.contains("pan-media")) {
            entry.target.classList.toggle(
              "is-pan-visible",
              entry.isIntersecting
            );
            return;
          }

          if (entry.target.classList.contains("tour-gallery")) {
            entry.target.classList.toggle(
              "is-gallery-visible",
              entry.isIntersecting
            );
          }
        });
      },
      {
        threshold: 0.15,
      }
    );

    storyPoints.forEach((point) => {
      storyObserver.observe(point);
    });

    panMediaElements.forEach((media) => {
      storyObserver.observe(media);
    });

    autoGalleries.forEach((gallery) => {
      storyObserver.observe(gallery);
    });
  } else {
    storySections.forEach((section) => {
      section.classList.add("is-visible");
    });
  }
}
