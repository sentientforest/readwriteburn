import { nextTick, onMounted, onUnmounted, ref } from "vue";

export interface AccessibilityConfig {
  // Focus management
  enableFocusManagement: boolean;
  focusTimeout: number;

  // Keyboard navigation
  enableKeyboardNavigation: boolean;

  // Screen reader support
  enableScreenReaderAnnouncements: boolean;

  // High contrast mode
  enableHighContrastDetection: boolean;

  // Reduced motion
  enableReducedMotionDetection: boolean;

  // Color contrast checking
  enableContrastChecking: boolean;
  minContrastRatio: number;
}

export interface FocusTrap {
  activate: () => void;
  deactivate: () => void;
  isActive: boolean;
}

const defaultConfig: AccessibilityConfig = {
  enableFocusManagement: true,
  focusTimeout: 100,
  enableKeyboardNavigation: true,
  enableScreenReaderAnnouncements: true,
  enableHighContrastDetection: true,
  enableReducedMotionDetection: true,
  enableContrastChecking: false, // Disabled by default for performance
  minContrastRatio: 4.5
};

export function useAccessibility(config: Partial<AccessibilityConfig> = {}) {
  const settings = { ...defaultConfig, ...config };

  // Reactive state
  const prefersReducedMotion = ref(false);
  const prefersHighContrast = ref(false);
  const currentFocus = ref<HTMLElement | null>(null);
  const focusHistory = ref<HTMLElement[]>([]);
  const announcements = ref<string[]>([]);

  // Screen reader announcements
  const liveRegion = ref<HTMLElement | null>(null);

  // Focus management
  function manageFocus(
    element: HTMLElement | string,
    options: {
      preventScroll?: boolean;
      restoreFocus?: boolean;
      timeout?: number;
    } = {}
  ) {
    if (!settings.enableFocusManagement) return;

    const targetElement =
      typeof element === "string" ? (document.querySelector(element) as HTMLElement) : element;

    if (!targetElement) {
      console.warn("Focus target not found:", element);
      return;
    }

    // Store current focus for restoration
    if (options.restoreFocus && document.activeElement instanceof HTMLElement) {
      focusHistory.value.push(document.activeElement);
    }

    const timeout = options.timeout ?? settings.focusTimeout;

    setTimeout(() => {
      targetElement.focus({ preventScroll: options.preventScroll });
      currentFocus.value = targetElement;
    }, timeout);
  }

  function restoreFocus() {
    const previousFocus = focusHistory.value.pop();
    if (previousFocus && document.contains(previousFocus)) {
      manageFocus(previousFocus);
    }
  }

  // Focus trap for modals and overlays
  function createFocusTrap(container: HTMLElement | string): FocusTrap {
    const containerElement =
      typeof container === "string" ? (document.querySelector(container) as HTMLElement) : container;

    if (!containerElement) {
      throw new Error("Focus trap container not found");
    }

    let isActive = false;
    let firstFocusable: HTMLElement | null = null;
    let lastFocusable: HTMLElement | null = null;

    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      "[contenteditable]"
    ].join(", ");

    function updateFocusableElements() {
      const elements = Array.from(containerElement.querySelectorAll(focusableSelectors)) as HTMLElement[];
      firstFocusable = elements[0] || null;
      lastFocusable = elements[elements.length - 1] || null;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (!isActive || event.key !== "Tab") return;

      updateFocusableElements();

      if (!firstFocusable) return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }

    function activate() {
      if (isActive) return;

      isActive = true;
      updateFocusableElements();

      // Store current focus
      if (document.activeElement instanceof HTMLElement) {
        focusHistory.value.push(document.activeElement);
      }

      // Focus first element
      firstFocusable?.focus();

      // Add event listener
      document.addEventListener("keydown", handleKeyDown);
    }

    function deactivate() {
      if (!isActive) return;

      isActive = false;
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus
      restoreFocus();
    }

    return {
      activate,
      deactivate,
      get isActive() {
        return isActive;
      }
    };
  }

  // Screen reader announcements
  function announce(message: string, priority: "polite" | "assertive" = "polite") {
    if (!settings.enableScreenReaderAnnouncements) return;

    announcements.value.push(message);

    if (liveRegion.value) {
      liveRegion.value.setAttribute("aria-live", priority);
      liveRegion.value.textContent = message;

      // Clear after announcement
      setTimeout(() => {
        if (liveRegion.value) {
          liveRegion.value.textContent = "";
        }
      }, 1000);
    }
  }

  // Keyboard navigation helpers
  function setupKeyboardNavigation(
    container: HTMLElement,
    options: {
      arrowKeys?: boolean;
      enterSpace?: boolean;
      escape?: boolean;
      home?: boolean;
      end?: boolean;
    } = {}
  ) {
    if (!settings.enableKeyboardNavigation) return () => {};

    const { arrowKeys = true, enterSpace = true, escape = false, home = false, end = false } = options;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement;

      switch (event.key) {
        case "ArrowDown":
        case "ArrowUp":
          if (arrowKeys) {
            event.preventDefault();
            navigateVertically(container, event.key === "ArrowDown" ? 1 : -1);
          }
          break;

        case "ArrowLeft":
        case "ArrowRight":
          if (arrowKeys) {
            event.preventDefault();
            navigateHorizontally(container, event.key === "ArrowRight" ? 1 : -1);
          }
          break;

        case "Enter":
        case " ":
          if (enterSpace && target.click) {
            event.preventDefault();
            target.click();
          }
          break;

        case "Escape":
          if (escape) {
            event.preventDefault();
            container.dispatchEvent(new CustomEvent("escape-pressed", { detail: event }));
          }
          break;

        case "Home":
          if (home) {
            event.preventDefault();
            focusFirstElement(container);
          }
          break;

        case "End":
          if (end) {
            event.preventDefault();
            focusLastElement(container);
          }
          break;
      }
    }

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
    };
  }

  function navigateVertically(container: HTMLElement, direction: 1 | -1) {
    const focusable = getFocusableElements(container);
    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);

    if (currentIndex === -1) return;

    const nextIndex = currentIndex + direction;
    const targetElement = focusable[nextIndex];

    if (targetElement) {
      manageFocus(targetElement);
    }
  }

  function navigateHorizontally(container: HTMLElement, direction: 1 | -1) {
    // Similar to vertical navigation but for horizontal layouts
    navigateVertically(container, direction);
  }

  function focusFirstElement(container: HTMLElement) {
    const focusable = getFocusableElements(container);
    if (focusable[0]) {
      manageFocus(focusable[0]);
    }
  }

  function focusLastElement(container: HTMLElement) {
    const focusable = getFocusableElements(container);
    const lastElement = focusable[focusable.length - 1];
    if (lastElement) {
      manageFocus(lastElement);
    }
  }

  function getFocusableElements(container: HTMLElement): HTMLElement[] {
    const selectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      "[contenteditable]"
    ].join(", ");

    return Array.from(container.querySelectorAll(selectors)) as HTMLElement[];
  }

  // Color contrast checking
  function checkContrast(
    foreground: string,
    background: string
  ): {
    ratio: number;
    meetsAA: boolean;
    meetsAAA: boolean;
  } {
    const fgLuminance = getLuminance(foreground);
    const bgLuminance = getLuminance(background);

    const ratio = (Math.max(fgLuminance, bgLuminance) + 0.05) / (Math.min(fgLuminance, bgLuminance) + 0.05);

    return {
      ratio,
      meetsAA: ratio >= 4.5,
      meetsAAA: ratio >= 7
    };
  }

  function getLuminance(color: string): number {
    // Convert hex to RGB
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16) / 255;
    const g = parseInt(hex.substr(2, 2), 16) / 255;
    const b = parseInt(hex.substr(4, 2), 16) / 255;

    // Apply gamma correction
    const rs = r <= 0.03928 ? r / 12.92 : Math.pow((r + 0.055) / 1.055, 2.4);
    const gs = g <= 0.03928 ? g / 12.92 : Math.pow((g + 0.055) / 1.055, 2.4);
    const bs = b <= 0.03928 ? b / 12.92 : Math.pow((b + 0.055) / 1.055, 2.4);

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // User preference detection
  function detectUserPreferences() {
    if (settings.enableReducedMotionDetection) {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      prefersReducedMotion.value = mediaQuery.matches;

      mediaQuery.addEventListener("change", (e) => {
        prefersReducedMotion.value = e.matches;
        document.body.classList.toggle("reduced-motion", e.matches);
      });
    }

    if (settings.enableHighContrastDetection) {
      const mediaQuery = window.matchMedia("(prefers-contrast: high)");
      prefersHighContrast.value = mediaQuery.matches;

      mediaQuery.addEventListener("change", (e) => {
        prefersHighContrast.value = e.matches;
        document.body.classList.toggle("high-contrast", e.matches);
      });
    }
  }

  // Skip links
  function createSkipLink(target: string, text = "Skip to main content") {
    const skipLink = document.createElement("a");
    skipLink.href = target;
    skipLink.textContent = text;
    skipLink.className =
      "sr-only focus:not-sr-only focus:absolute focus:top-0 focus:left-0 z-50 bg-primary-600 text-white px-4 py-2 rounded-br";

    skipLink.addEventListener("click", (e) => {
      e.preventDefault();
      const targetElement = document.querySelector(target) as HTMLElement;
      if (targetElement) {
        manageFocus(targetElement);
      }
    });

    return skipLink;
  }

  // Initialize live region for announcements
  function createLiveRegion() {
    const region = document.createElement("div");
    region.setAttribute("aria-live", "polite");
    region.setAttribute("aria-atomic", "true");
    region.className = "sr-only";
    region.id = "accessibility-announcements";

    document.body.appendChild(region);
    liveRegion.value = region;
  }

  // Cleanup function
  function cleanup() {
    if (liveRegion.value) {
      document.body.removeChild(liveRegion.value);
      liveRegion.value = null;
    }
  }

  // Initialize on mount
  onMounted(() => {
    createLiveRegion();
    detectUserPreferences();

    // Add skip link
    const skipLink = createSkipLink("#main-content", "Skip to main content");
    document.body.insertBefore(skipLink, document.body.firstChild);
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    // State
    prefersReducedMotion,
    prefersHighContrast,
    currentFocus,
    announcements,

    // Focus management
    manageFocus,
    restoreFocus,
    createFocusTrap,

    // Screen reader
    announce,

    // Keyboard navigation
    setupKeyboardNavigation,
    getFocusableElements,

    // Color contrast
    checkContrast,

    // User preferences
    detectUserPreferences,

    // Utilities
    createSkipLink,
    cleanup
  };
}

// ARIA attribute helpers
export function generateId(prefix = "element"): string {
  return `${prefix}-${Math.random().toString(36).substr(2, 9)}`;
}

export function setupAriaRelationships(options: {
  labelledBy?: string[];
  describedBy?: string[];
  controls?: string;
  expanded?: boolean;
  hasPopup?: boolean | "menu" | "listbox" | "tree" | "grid" | "dialog";
}) {
  const attributes: Record<string, string> = {};

  if (options.labelledBy?.length) {
    attributes["aria-labelledby"] = options.labelledBy.join(" ");
  }

  if (options.describedBy?.length) {
    attributes["aria-describedby"] = options.describedBy.join(" ");
  }

  if (options.controls) {
    attributes["aria-controls"] = options.controls;
  }

  if (typeof options.expanded === "boolean") {
    attributes["aria-expanded"] = options.expanded.toString();
  }

  if (options.hasPopup) {
    attributes["aria-haspopup"] = options.hasPopup.toString();
  }

  return attributes;
}
