// Accessibility Testing Utilities for ReadWriteBurn dApp
// Helps validate WCAG 2.1 AA compliance

export interface AccessibilityIssue {
  type: "error" | "warning" | "info";
  element: HTMLElement;
  message: string;
  wcagCriterion: string;
  severity: "high" | "medium" | "low";
  suggestion?: string;
}

export interface AccessibilityReport {
  issues: AccessibilityIssue[];
  score: number;
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  timestamp: Date;
}

export class AccessibilityTester {
  private issues: AccessibilityIssue[] = [];

  // Test color contrast ratios
  testColorContrast(): void {
    const elements = document.querySelectorAll("*");

    elements.forEach((element) => {
      const htmlElement = element as HTMLElement;
      const style = window.getComputedStyle(htmlElement);
      const backgroundColor = style.backgroundColor;
      const color = style.color;

      // Skip elements without visible text
      if (!htmlElement.textContent?.trim() || style.display === "none" || style.visibility === "hidden") {
        return;
      }

      const contrast = this.calculateContrast(color, backgroundColor);
      const fontSize = parseFloat(style.fontSize);
      const fontWeight = style.fontWeight;

      // WCAG 2.1 AA requirements
      const isLargeText =
        fontSize >= 18 || (fontSize >= 14 && (fontWeight === "bold" || fontWeight >= "700"));
      const requiredRatio = isLargeText ? 3 : 4.5;

      if (contrast < requiredRatio) {
        this.addIssue({
          type: "error",
          element: htmlElement,
          message: `Insufficient color contrast ratio: ${contrast.toFixed(2)}:1. Required: ${requiredRatio}:1`,
          wcagCriterion: "1.4.3 Contrast (Minimum)",
          severity: "high",
          suggestion: `Increase contrast between text (${color}) and background (${backgroundColor})`
        });
      }
    });
  }

  // Test heading structure
  testHeadingStructure(): void {
    const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
    let currentLevel = 0;

    if (headings.length === 0) {
      this.addIssue({
        type: "warning",
        element: document.body,
        message: "No heading elements found on page",
        wcagCriterion: "1.3.1 Info and Relationships",
        severity: "medium",
        suggestion: "Add semantic heading structure to organize content"
      });
      return;
    }

    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));

      // Check for h1 as first heading
      if (index === 0 && level !== 1) {
        this.addIssue({
          type: "warning",
          element: heading as HTMLElement,
          message: "Page should start with h1 heading",
          wcagCriterion: "1.3.1 Info and Relationships",
          severity: "medium",
          suggestion: "Use h1 for the main page heading"
        });
      }

      // Check for skipped heading levels
      if (level > currentLevel + 1) {
        this.addIssue({
          type: "error",
          element: heading as HTMLElement,
          message: `Heading level skipped from h${currentLevel} to h${level}`,
          wcagCriterion: "1.3.1 Info and Relationships",
          severity: "high",
          suggestion: "Use sequential heading levels (h1, h2, h3, etc.)"
        });
      }

      currentLevel = level;
    });
  }

  // Test form accessibility
  testFormAccessibility(): void {
    const forms = document.querySelectorAll("form");

    forms.forEach((form) => {
      const inputs = form.querySelectorAll("input, select, textarea");

      inputs.forEach((input) => {
        const htmlInput = input as HTMLInputElement;

        // Check for labels
        if (!this.hasLabel(htmlInput)) {
          this.addIssue({
            type: "error",
            element: htmlInput,
            message: "Form control missing accessible label",
            wcagCriterion: "1.3.1 Info and Relationships",
            severity: "high",
            suggestion: "Add a label element or aria-label attribute"
          });
        }

        // Check required fields
        if (htmlInput.required && !htmlInput.getAttribute("aria-required")) {
          this.addIssue({
            type: "warning",
            element: htmlInput,
            message: 'Required field should have aria-required="true"',
            wcagCriterion: "3.3.2 Labels or Instructions",
            severity: "medium",
            suggestion: 'Add aria-required="true" to required form controls'
          });
        }

        // Check for error states
        if (htmlInput.classList.contains("error") || htmlInput.getAttribute("aria-invalid") === "true") {
          if (!htmlInput.getAttribute("aria-describedby")) {
            this.addIssue({
              type: "error",
              element: htmlInput,
              message: "Invalid form control missing error description",
              wcagCriterion: "3.3.1 Error Identification",
              severity: "high",
              suggestion: "Add aria-describedby pointing to error message"
            });
          }
        }
      });
    });
  }

  // Test keyboard accessibility
  testKeyboardAccessibility(): void {
    const interactiveElements = document.querySelectorAll(
      'a, button, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="menuitem"]'
    );

    interactiveElements.forEach((element) => {
      const htmlElement = element as HTMLElement;

      // Check if element is focusable
      if (!this.isFocusable(htmlElement)) {
        this.addIssue({
          type: "error",
          element: htmlElement,
          message: "Interactive element is not keyboard accessible",
          wcagCriterion: "2.1.1 Keyboard",
          severity: "high",
          suggestion: "Ensure element can receive keyboard focus"
        });
      }

      // Check for skip links
      if (htmlElement.textContent?.toLowerCase().includes("skip")) {
        if (
          !htmlElement.classList.contains("skip-link") &&
          !htmlElement.getAttribute("href")?.startsWith("#")
        ) {
          this.addIssue({
            type: "info",
            element: htmlElement,
            message: "Potential skip link should link to main content",
            wcagCriterion: "2.4.1 Bypass Blocks",
            severity: "low",
            suggestion: "Ensure skip links target main content areas"
          });
        }
      }
    });
  }

  // Test ARIA attributes
  testAriaAttributes(): void {
    const elementsWithAria = document.querySelectorAll("[aria-labelledby], [aria-describedby]");

    elementsWithAria.forEach((element) => {
      const htmlElement = element as HTMLElement;

      // Check aria-labelledby references
      const labelledBy = htmlElement.getAttribute("aria-labelledby");
      if (labelledBy) {
        const ids = labelledBy.split(" ");
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            this.addIssue({
              type: "error",
              element: htmlElement,
              message: `aria-labelledby references non-existent element: ${id}`,
              wcagCriterion: "1.3.1 Info and Relationships",
              severity: "high",
              suggestion: "Ensure all ARIA references point to existing elements"
            });
          }
        });
      }

      // Check aria-describedby references
      const describedBy = htmlElement.getAttribute("aria-describedby");
      if (describedBy) {
        const ids = describedBy.split(" ");
        ids.forEach((id) => {
          if (!document.getElementById(id)) {
            this.addIssue({
              type: "error",
              element: htmlElement,
              message: `aria-describedby references non-existent element: ${id}`,
              wcagCriterion: "1.3.1 Info and Relationships",
              severity: "high",
              suggestion: "Ensure all ARIA references point to existing elements"
            });
          }
        });
      }
    });
  }

  // Test image accessibility
  testImageAccessibility(): void {
    const images = document.querySelectorAll("img");

    images.forEach((img) => {
      if (!img.alt && !img.getAttribute("aria-label") && !img.getAttribute("aria-labelledby")) {
        // Check if image is decorative
        if (img.getAttribute("role") === "presentation" || img.getAttribute("aria-hidden") === "true") {
          return; // Decorative image, skip
        }

        this.addIssue({
          type: "error",
          element: img,
          message: "Image missing alternative text",
          wcagCriterion: "1.1.1 Non-text Content",
          severity: "high",
          suggestion: 'Add alt attribute or mark as decorative with role="presentation"'
        });
      }

      // Check for empty alt text on meaningful images
      if (img.alt === "" && !img.getAttribute("role") && !img.getAttribute("aria-hidden")) {
        this.addIssue({
          type: "warning",
          element: img,
          message: "Image with empty alt text may be meaningful",
          wcagCriterion: "1.1.1 Non-text Content",
          severity: "medium",
          suggestion: "If image conveys information, provide descriptive alt text"
        });
      }
    });
  }

  // Helper methods
  private calculateContrast(foreground: string, background: string): number {
    // Simplified contrast calculation - in real implementation, use more robust color parsing
    const fgLum = this.getLuminance(foreground);
    const bgLum = this.getLuminance(background);

    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);

    return (lighter + 0.05) / (darker + 0.05);
  }

  private getLuminance(color: string): number {
    // Simplified luminance calculation
    // In production, use a proper color parsing library
    if (color === "rgb(0, 0, 0)" || color === "#000000" || color === "black") {
      return 0;
    }
    if (color === "rgb(255, 255, 255)" || color === "#ffffff" || color === "white") {
      return 1;
    }
    // Default to medium gray for complex color calculations
    return 0.5;
  }

  private hasLabel(input: HTMLInputElement): boolean {
    // Check for label element
    if (input.labels && input.labels.length > 0) {
      return true;
    }

    // Check for aria-label
    if (input.getAttribute("aria-label")) {
      return true;
    }

    // Check for aria-labelledby
    if (input.getAttribute("aria-labelledby")) {
      return true;
    }

    // Check for implicit label (input inside label)
    const parentLabel = input.closest("label");
    if (parentLabel) {
      return true;
    }

    return false;
  }

  private isFocusable(element: HTMLElement): boolean {
    const tabIndex = element.getAttribute("tabindex");

    // Elements with tabindex="-1" are programmatically focusable but not in tab order
    if (tabIndex === "-1") {
      return true;
    }

    // Elements with positive tabindex are focusable
    if (tabIndex && parseInt(tabIndex) >= 0) {
      return true;
    }

    // Check native focusable elements
    const focusableElements = ["a", "button", "input", "select", "textarea"];
    if (focusableElements.includes(element.tagName.toLowerCase())) {
      return !element.hasAttribute("disabled");
    }

    // Check elements with role that should be focusable
    const focusableRoles = ["button", "link", "menuitem", "tab"];
    const role = element.getAttribute("role");
    if (role && focusableRoles.includes(role)) {
      return true;
    }

    return false;
  }

  private addIssue(issue: AccessibilityIssue): void {
    this.issues.push(issue);
  }

  // Public methods
  runAllTests(): AccessibilityReport {
    this.issues = []; // Reset issues

    this.testColorContrast();
    this.testHeadingStructure();
    this.testFormAccessibility();
    this.testKeyboardAccessibility();
    this.testAriaAttributes();
    this.testImageAccessibility();

    const summary = {
      errors: this.issues.filter((issue) => issue.type === "error").length,
      warnings: this.issues.filter((issue) => issue.type === "warning").length,
      info: this.issues.filter((issue) => issue.type === "info").length
    };

    // Calculate score (0-100)
    const totalPossibleIssues = 50; // Arbitrary baseline
    const weightedScore = summary.errors * 3 + summary.warnings * 2 + summary.info * 1;
    const score = Math.max(0, 100 - (weightedScore / totalPossibleIssues) * 100);

    return {
      issues: this.issues,
      score: Math.round(score),
      summary,
      timestamp: new Date()
    };
  }

  generateReport(report: AccessibilityReport): string {
    let output = `Accessibility Report - ${report.timestamp.toLocaleString()}\n`;
    output += `Score: ${report.score}/100\n`;
    output += `Issues: ${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.info} info\n\n`;

    if (report.issues.length === 0) {
      output += "No accessibility issues found!\n";
      return output;
    }

    // Group by severity
    const grouped = {
      high: report.issues.filter((i) => i.severity === "high"),
      medium: report.issues.filter((i) => i.severity === "medium"),
      low: report.issues.filter((i) => i.severity === "low")
    };

    ["high", "medium", "low"].forEach((severity) => {
      const issues = grouped[severity as keyof typeof grouped];
      if (issues.length > 0) {
        output += `${severity.toUpperCase()} PRIORITY ISSUES:\n`;
        issues.forEach((issue, index) => {
          output += `${index + 1}. ${issue.message}\n`;
          output += `   WCAG: ${issue.wcagCriterion}\n`;
          if (issue.suggestion) {
            output += `   Suggestion: ${issue.suggestion}\n`;
          }
          output += `   Element: ${issue.element.tagName.toLowerCase()}`;
          if (issue.element.id) output += `#${issue.element.id}`;
          if (issue.element.className) output += `.${issue.element.className.split(" ")[0]}`;
          output += "\n\n";
        });
      }
    });

    return output;
  }
}

// Export utility function for easy testing
export function runAccessibilityTest(): AccessibilityReport {
  const tester = new AccessibilityTester();
  return tester.runAllTests();
}

export function logAccessibilityReport(): void {
  const tester = new AccessibilityTester();
  const report = tester.runAllTests();
  console.log(tester.generateReport(report));
}
