import { usePerformanceMonitoring } from "@/composables/usePerformanceMonitoring";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock PerformanceObserver
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();
global.PerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: mockObserve,
  disconnect: mockDisconnect
}));

// Mock performance API
global.performance = {
  ...global.performance,
  now: vi.fn(() => 1000),
  getEntriesByType: vi.fn(() => []),
  memory: {
    usedJSHeapSize: 1024 * 1024 * 10, // 10MB
    totalJSHeapSize: 1024 * 1024 * 50, // 50MB
    jsHeapSizeLimit: 1024 * 1024 * 100 // 100MB
  }
};

describe("usePerformanceMonitoring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should initialize with default configuration", () => {
    const { metrics, isMonitoring } = usePerformanceMonitoring();

    expect(isMonitoring.value).toBe(false);
    expect(metrics.value.CLS).toBeNull();
    expect(metrics.value.FID).toBeNull();
    expect(metrics.value.LCP).toBeNull();
  });

  it("should start monitoring when enabled", () => {
    const { startMonitoring, isMonitoring } = usePerformanceMonitoring({
      enableWebVitals: true,
      enableMemoryMonitoring: true
    });

    startMonitoring();

    expect(isMonitoring.value).toBe(true);
    expect(mockObserve).toHaveBeenCalled();
  });

  it("should stop monitoring correctly", () => {
    const { startMonitoring, stopMonitoring, isMonitoring } = usePerformanceMonitoring();

    startMonitoring();
    expect(isMonitoring.value).toBe(true);

    stopMonitoring();
    expect(isMonitoring.value).toBe(false);
  });

  it("should measure route change performance", async () => {
    const { measureRouteChange } = usePerformanceMonitoring();

    const finishMeasurement = measureRouteChange("test-route");

    // Simulate some time passing
    vi.advanceTimersByTime(100);
    (performance.now as any).mockReturnValue(1100);

    finishMeasurement();

    // Should log the measurement (we can't easily test the exact value due to mocking)
    expect(performance.now).toHaveBeenCalled();
  });

  it("should measure component render time", () => {
    const { measureComponentRender } = usePerformanceMonitoring();

    const finishMeasurement = measureComponentRender("TestComponent");

    // Simulate render time
    vi.advanceTimersByTime(50);
    (performance.now as any).mockReturnValue(1050);

    const renderTime = finishMeasurement();

    expect(renderTime).toBe(50);
  });

  it("should calculate performance score correctly", () => {
    const { getPerformanceScore, metrics } = usePerformanceMonitoring();

    // Set good performance metrics
    metrics.value.LCP = 2000; // Good
    metrics.value.FID = 50; // Good
    metrics.value.CLS = 0.05; // Good

    const score = getPerformanceScore();
    expect(score).toBe(100); // Perfect score
  });

  it("should penalize poor performance metrics", () => {
    const { getPerformanceScore, metrics } = usePerformanceMonitoring();

    // Set poor performance metrics
    metrics.value.LCP = 5000; // Poor
    metrics.value.FID = 400; // Poor
    metrics.value.CLS = 0.3; // Poor

    const score = getPerformanceScore();
    expect(score).toBeLessThan(50); // Should be significantly penalized
  });

  it("should update memory usage", () => {
    const { getCurrentMetrics } = usePerformanceMonitoring({
      enableMemoryMonitoring: true
    });

    const currentMetrics = getCurrentMetrics();

    expect(currentMetrics.memoryUsage).toBe(1024 * 1024 * 10); // 10MB
  });

  it("should handle missing performance APIs gracefully", () => {
    // Remove memory API
    const originalMemory = (performance as any).memory;
    delete (performance as any).memory;

    const { getCurrentMetrics } = usePerformanceMonitoring({
      enableMemoryMonitoring: true
    });

    const currentMetrics = getCurrentMetrics();

    expect(currentMetrics.memoryUsage).toBeNull();

    // Restore memory API
    (performance as any).memory = originalMemory;
  });

  it("should respect sampling rate", () => {
    const mathRandomSpy = vi.spyOn(Math, "random");

    // Test case where monitoring should be skipped (sample rate not met)
    mathRandomSpy.mockReturnValue(0.9); // Higher than typical sample rate

    const { startMonitoring, isMonitoring } = usePerformanceMonitoring({
      sampleRate: 0.1 // Only 10% of sessions
    });

    startMonitoring();

    expect(isMonitoring.value).toBe(false);

    // Test case where monitoring should proceed
    mathRandomSpy.mockReturnValue(0.05); // Lower than sample rate

    startMonitoring();

    expect(isMonitoring.value).toBe(true);

    mathRandomSpy.mockRestore();
  });

  it("should track API response times", async () => {
    const { metrics } = usePerformanceMonitoring({
      enableApiMonitoring: true
    });

    // Mock fetch to capture the wrapper
    const originalFetch = global.fetch;
    let wrappedFetch: any;

    const monitoring = usePerformanceMonitoring({ enableApiMonitoring: true });
    monitoring.startMonitoring();

    // Simulate API call
    const mockResponse = {
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ data: "test" })
    };

    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    // Make API call
    await fetch("/api/test");

    // Check if response time was tracked
    expect(Object.keys(metrics.value.apiResponseTimes)).toContain("/api/test");

    global.fetch = originalFetch;
  });

  it("should report metrics to endpoint", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200
    });
    global.fetch = mockFetch;

    const { reportMetrics, metrics } = usePerformanceMonitoring({
      reportingEndpoint: "https://api.example.com/metrics"
    });

    // Set some metrics
    metrics.value.LCP = 2000;
    metrics.value.FID = 100;

    await reportMetrics();

    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.example.com/metrics",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining("LCP")
      })
    );
  });

  it("should handle reporting failures gracefully", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("Network error"));
    global.fetch = mockFetch;

    const { reportMetrics } = usePerformanceMonitoring({
      reportingEndpoint: "https://api.example.com/metrics"
    });

    // Should not throw error
    await expect(reportMetrics()).resolves.toBeUndefined();
  });

  it("should set up periodic reporting", () => {
    const setIntervalSpy = vi.spyOn(global, "setInterval");

    const { startMonitoring } = usePerformanceMonitoring({
      reportingInterval: 5000
    });

    startMonitoring();

    expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 5000);

    setIntervalSpy.mockRestore();
  });

  it("should clean up intervals on stop", () => {
    const clearIntervalSpy = vi.spyOn(global, "clearInterval");

    const { startMonitoring, stopMonitoring } = usePerformanceMonitoring();

    startMonitoring();
    stopMonitoring();

    expect(clearIntervalSpy).toHaveBeenCalled();

    clearIntervalSpy.mockRestore();
  });
});
