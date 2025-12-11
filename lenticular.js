// lenticular.js

(function () {
  "use strict";

  let lenticularData = [];
  let instances = [];
  let isInitialized = false;
  let isDeviceOrientation = false;
  let globalTiltAngle = 50;
  let animationId = null;

  // Load Configuration
  async function loadConfig() {
    try {
      const response = await fetch("lenticular_config.json");
      lenticularData = await response.json();
      console.log("Lenticular config loaded:", lenticularData);
    } catch (error) {
      console.error("Failed to load lenticular config:", error);
    }
  }

  // Initialize Lenticular Gallery
  window.initLenticularGallery = async function (containerId) {
    if (!lenticularData.length) await loadConfig();

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = ""; // Clear existing
    instances = [];

    lenticularData.forEach((album) => {
      const section = createLenticularSection(album);
      container.appendChild(section);
    });

    if (!isInitialized) {
      setupGlobalEvents();
      animate();
      isInitialized = true;
    }
  };

  // Create DOM Elements
  function createLenticularSection(album) {
    // Section Wrapper
    const section = document.createElement("div");
    section.className = "lenticular-section";

    // Header Info
    const info = document.createElement("div");
    info.className = "section-info";
    info.innerHTML = `
            <div class="section-title">${album.title.toUpperCase()}</div>
            <div class="section-desc">${album.description}</div>
        `;
    section.appendChild(info);

    // Viewer Container
    const viewer = document.createElement("div");
    viewer.className = "lenticular-viewer";
    viewer.id = `lenticular-${album.id}`;

    // Frame & Layers
    const frame = document.createElement("div");
    frame.className = "lenticular-frame";

    const layers = [];
    album.images.forEach((src, idx) => {
      const layer = document.createElement("div");
      layer.className = "photo-layer";
      // Determine if it's a full URL or relative path
      const imageUrl = src.startsWith("http") ? src : `${album.folder}/${src}`;
      layer.style.backgroundImage = `url(${imageUrl})`;
      layer.style.zIndex = idx + 1;
      layer.style.opacity = idx === 0 ? 1 : 0;
      frame.appendChild(layer);
      layers.push(layer);
    });

    // Overlays
    const overlay = document.createElement("div");
    overlay.className = "lenticular-overlay";
    const gloss = document.createElement("div");
    gloss.className = "gloss-overlay";

    viewer.appendChild(frame);
    viewer.appendChild(overlay);
    viewer.appendChild(gloss);
    section.appendChild(viewer);

    // Usage Hint (Overlay on Viewer)
    const hint = document.createElement("div");
    hint.style.cssText = `
            position: absolute; bottom: 10px; right: 10px;
            color: rgba(255,255,255,0.5); font-size: 0.7rem; pointer-events: none; z-index: 20;
        `;
    hint.innerHTML = "MOUSE OVER / TILT";
    viewer.appendChild(hint);

    // Indicators
    const indicator = document.createElement("div");
    indicator.className = "image-indicator";
    const dots = [];
    album.images.forEach((_, idx) => {
      const dot = document.createElement("div");
      dot.className = `indicator-dot ${idx === 0 ? "active" : ""}`;
      indicator.appendChild(dot);
      dots.push(dot);
    });
    section.appendChild(indicator);

    // Register Instance
    const instance = {
      id: album.id,
      container: viewer,
      layers: layers,
      dots: dots,
      numImages: album.images.length,
      currentAngle: 50,
      targetAngle: 50,
    };
    instances.push(instance);

    // Interaction Events
    setupInteraction(instance);

    return section;
  }

  // Setup User Interaction (Mouse/Touch)
  function setupInteraction(instance) {
    const { container } = instance;

    // Mouse Move
    container.addEventListener("mousemove", (e) => {
      if (isDeviceOrientation) return;
      const rect = container.getBoundingClientRect();
      const relX = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left) / rect.width)
      );
      instance.targetAngle = relX * 100;
    });

    // Touch Move
    container.addEventListener(
      "touchmove",
      (e) => {
        if (isDeviceOrientation) return;
        const touch = e.touches[0];
        const rect = container.getBoundingClientRect();
        const relX = Math.max(
          0,
          Math.min(1, (touch.clientX - rect.left) / rect.width)
        );
        instance.targetAngle = relX * 100;
      },
      { passive: true }
    );

    // Mouse Leave (Optional: Does not reset to center to keep the "view" active)
  }

  // Global Events (Device Orientation)
  function setupGlobalEvents() {
    if (window.DeviceOrientationEvent) {
      // Check availability - basic check
      window.addEventListener("deviceorientation", handleOrientation);
    }
  }

  function handleOrientation(event) {
    if (event.beta === null) return;
    isDeviceOrientation = true;

    // Beta is front-to-back tilt (-180 to 180)
    // Mapping roughly 0 to 40 degrees for the effect
    let beta = event.beta;
    const clampedBeta = Math.max(0, Math.min(30, beta));
    globalTiltAngle = (clampedBeta / 30) * 100;
  }

  // Animation Loop
  function animate() {
    instances.forEach((instance) => {
      // Apply global tilt if active
      if (isDeviceOrientation) {
        instance.targetAngle = globalTiltAngle;
      }

      // Smooth Interpolation
      instance.currentAngle +=
        (instance.targetAngle - instance.currentAngle) * 0.1;

      const normalizedAngle = instance.currentAngle; // 0-100
      const segment = 100 / instance.numImages;

      // Update Layers
      instance.layers.forEach((layer, idx) => {
        const start = idx * segment;
        const end = (idx + 1) * segment;
        const center = (start + end) / 2;

        let opacity = 0;
        // Basic crossfade logic based on distance from center of segment
        const dist = Math.abs(normalizedAngle - center);
        if (dist < segment) {
          opacity = 1 - dist / segment;
        }

        // Enhance contrast
        opacity = Math.pow(opacity, 2);
        layer.style.opacity = Math.max(0, Math.min(1, opacity));
      });

      // Update Dots
      const activeIdx = Math.min(
        Math.floor(normalizedAngle / segment),
        instance.numImages - 1
      );
      instance.dots.forEach((dot, i) => {
        dot.classList.toggle("active", i === activeIdx);
      });
    });

    animationId = requestAnimationFrame(animate);
  }
})();
