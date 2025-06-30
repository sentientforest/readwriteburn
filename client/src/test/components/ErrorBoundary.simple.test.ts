import ErrorBoundary from "@/components/ErrorBoundary.vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock the error reporting composable
vi.mock("@/composables/useErrorReporting", () => ({
  useErrorReporting: () => ({
    reportError: vi.fn()
  })
}));

describe("ErrorBoundary Component", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();

    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });

    // Mock window.location.reload
    delete (window as any).location;
    (window as any).location = { reload: vi.fn() };
  });

  it("should render slot content when no error", () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="test-content">Normal content</div>'
      },
      global: {
        plugins: [createPinia()]
      }
    });

    expect(wrapper.find(".test-content").exists()).toBe(true);
    expect(wrapper.find(".error-boundary").exists()).toBe(false);
  });

  it("should show error UI when hasError is true", async () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [createPinia()]
      }
    });

    // Manually set error state
    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error occurred"
    });

    expect(wrapper.find(".error-boundary").exists()).toBe(true);
    expect(wrapper.text()).toContain("Something went wrong");
  });

  it("should toggle technical details", async () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error",
      errorInfo: "Component stack trace",
      showDetails: false
    });

    // Should not show details initially
    expect(wrapper.text()).not.toContain("Component stack trace");

    // Toggle details
    await wrapper.setData({ showDetails: true });

    expect(wrapper.text()).toContain("Component stack trace");
  });

  it("should handle retry functionality", async () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error"
    });

    const retryButton = wrapper.find("button");
    expect(retryButton.text()).toContain("Try Again");

    await retryButton.trigger("click");

    // Should show retrying state
    expect(wrapper.vm.retrying).toBe(true);
  });

  it("should handle page reload", async () => {
    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error"
    });

    const buttons = wrapper.findAll("button");
    const reloadButton = buttons.find((btn) => btn.text().includes("Reload Page"));

    expect(reloadButton).toBeDefined();
    await reloadButton!.trigger("click");

    expect(window.location.reload).toHaveBeenCalled();
  });

  it("should prevent retry when at max retries", async () => {
    const wrapper = mount(ErrorBoundary, {
      props: { maxRetries: 2 },
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error",
      retryCount: 2
    });

    const retryButton = wrapper.find("button");
    await retryButton.trigger("click");

    // Should not increment retry count beyond max
    expect(wrapper.vm.retryCount).toBe(2);
  });

  it("should call onError prop when provided", async () => {
    const onErrorSpy = vi.fn();

    const wrapper = mount(ErrorBoundary, {
      props: { onError: onErrorSpy },
      global: {
        plugins: [createPinia()]
      }
    });

    // Simulate calling the onError handler
    const testError = new Error("Test error");
    const testInfo = "Component info";

    wrapper.vm.onError?.(testError, testInfo);

    expect(onErrorSpy).toHaveBeenCalledWith(testError, testInfo);
  });

  it("should format error details for reporting", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;

    global.alert = vi.fn();

    const wrapper = mount(ErrorBoundary, {
      global: {
        plugins: [createPinia()]
      }
    });

    await wrapper.setData({
      hasError: true,
      errorMessage: "Test error message",
      errorInfo: "Test error info"
    });

    // Find and click the report link
    const reportLink = wrapper.find("a");
    await reportLink.trigger("click");

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
  });
});
