import { useErrorReporting } from "@/composables/useErrorReporting";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("useErrorReporting", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Reset time
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2023-01-01T00:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default configuration", () => {
    const { config } = useErrorReporting();

    expect(config.enabled).toBe(false); // Should be false in test mode
    expect(config.maxReports).toBe(50);
    expect(config.throttleMs).toBe(5000);
  });

  it("should report errors correctly", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    const error = new Error("Test error");
    reportError(error, { component: "TestComponent" });

    const history = getErrorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].message).toBe("Test error");
    expect(history[0].component).toBe("TestComponent");
    expect(history[0].timestamp).toBe("2023-01-01T00:00:00.000Z");
  });

  it("should handle string errors", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    reportError("String error message", { component: "TestComponent" });

    const history = getErrorHistory();
    expect(history).toHaveLength(1);
    expect(history[0].message).toBe("String error message");
    expect(history[0].stack).toBeUndefined();
  });

  it("should throttle duplicate errors", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    // Report the same error multiple times
    reportError("Duplicate error", { component: "TestComponent" });
    reportError("Duplicate error", { component: "TestComponent" });
    reportError("Duplicate error", { component: "TestComponent" });

    const history = getErrorHistory();
    expect(history).toHaveLength(1); // Should only record once
  });

  it("should allow duplicate errors after throttle period", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    reportError("Throttled error", { component: "TestComponent" });

    // Advance time beyond throttle period
    vi.advanceTimersByTime(6000);

    reportError("Throttled error", { component: "TestComponent" });

    const history = getErrorHistory();
    expect(history).toHaveLength(2);
  });

  it("should respect rate limits", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    // Report more than maxReports errors
    for (let i = 0; i < 60; i++) {
      reportError(`Error ${i}`, { component: "TestComponent" });
    }

    const history = getErrorHistory();
    expect(history.length).toBeLessThanOrEqual(50); // Should not exceed maxReports
  });

  it("should provide error statistics", () => {
    const { reportError, getErrorStats } = useErrorReporting();

    reportError("Error 1", { component: "Component1" });
    reportError("Error 2", { component: "Component2" });
    reportError("Error 3", { component: "Component1" });

    const stats = getErrorStats();
    expect(stats.totalErrors).toBe(3);
    expect(stats.errorsByComponent.Component1).toBe(2);
    expect(stats.errorsByComponent.Component2).toBe(1);
  });

  it("should calculate recent errors correctly", () => {
    const { reportError, getErrorStats } = useErrorReporting();

    // Report an error
    reportError("Recent error", { component: "TestComponent" });

    // Advance time by 30 minutes
    vi.advanceTimersByTime(30 * 60 * 1000);

    // Report another error
    reportError("Old error", { component: "TestComponent" });

    // Advance time by 2 hours
    vi.advanceTimersByTime(2 * 60 * 60 * 1000);

    const stats = getErrorStats();
    expect(stats.totalErrors).toBe(2);
    expect(stats.recentErrors).toBe(1); // Only the second error is within the last hour
  });

  it("should clear error history", () => {
    const { reportError, getErrorHistory, clearErrorHistory } = useErrorReporting();

    reportError("Error 1", { component: "TestComponent" });
    reportError("Error 2", { component: "TestComponent" });

    expect(getErrorHistory()).toHaveLength(2);

    clearErrorHistory();

    expect(getErrorHistory()).toHaveLength(0);
  });

  it("should send errors to endpoint when configured", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200
    });

    // Create error reporting with endpoint
    const { reportError } = useErrorReporting();

    // Manually set config for testing
    const reporting = useErrorReporting();
    reporting.config.enabled = true;
    reporting.config.endpoint = "https://api.example.com/errors";

    const error = new Error("Network error");
    await reportError(error, { component: "NetworkComponent" });

    // Wait for async operation
    await vi.runAllTimersAsync();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/errors",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("Network error")
      })
    );
  });

  it("should handle endpoint failures gracefully", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));

    const { reportError, getErrorHistory } = useErrorReporting();

    // Manually set config for testing
    const reporting = useErrorReporting();
    reporting.config.enabled = true;
    reporting.config.endpoint = "https://api.example.com/errors";

    const error = new Error("Test error");
    reportError(error, { component: "TestComponent" });

    // Should still record error locally even if endpoint fails
    const history = getErrorHistory();
    expect(history).toHaveLength(1);
  });

  it("should setup global error handlers", () => {
    const { setupGlobalErrorHandling } = useErrorReporting();

    const originalAddEventListener = window.addEventListener;
    const mockAddEventListener = vi.fn();
    window.addEventListener = mockAddEventListener;

    setupGlobalErrorHandling();

    expect(mockAddEventListener).toHaveBeenCalledWith("unhandledrejection", expect.any(Function));
    expect(mockAddEventListener).toHaveBeenCalledWith("error", expect.any(Function));

    // Restore original
    window.addEventListener = originalAddEventListener;
  });

  it("should maintain error history limit", () => {
    const { reportError, getErrorHistory } = useErrorReporting();

    // Report more than 100 errors (the internal limit)
    for (let i = 0; i < 150; i++) {
      reportError(`Error ${i}`, { component: `Component${i}` });
    }

    const history = getErrorHistory();
    expect(history.length).toBeLessThanOrEqual(100);

    // Should keep the most recent errors
    expect(history[0].message).toBe("Error 149");
  });
});
