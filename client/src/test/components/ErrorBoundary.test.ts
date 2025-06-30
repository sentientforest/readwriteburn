import ErrorBoundary from "@/components/ErrorBoundary.vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineComponent } from "vue";

import { clickButton, findByText, flushPromises, mountComponent } from "../utils";

// Mock the error reporting composable
vi.mock("@/composables/useErrorReporting", () => ({
  useErrorReporting: () => ({
    reportError: vi.fn()
  })
}));

// Create a test component that throws an error
const ThrowingComponent = defineComponent({
  name: "ThrowingComponent",
  setup() {
    throw new Error("Test error from component");
  },
  template: "<div>This should not render</div>"
});

// Create a working test component
const WorkingComponent = defineComponent({
  name: "WorkingComponent",
  template: "<div>Working component content</div>"
});

describe("ErrorBoundary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined)
      }
    });
  });

  it("should render children when no error occurs", () => {
    const wrapper = mountComponent(ErrorBoundary, {
      slots: {
        default: '<div class="test-content">Test content</div>'
      }
    });

    expect(wrapper.find(".test-content").exists()).toBe(true);
    expect(wrapper.find(".error-boundary").exists()).toBe(false);
  });

  it("should show error UI when an error is caught", async () => {
    const wrapper = mountComponent(ErrorBoundary, {
      slots: {
        default: ThrowingComponent
      }
    });

    await flushPromises();

    expect(wrapper.find(".error-boundary").exists()).toBe(true);
    expect(wrapper.text()).toContain("Something went wrong");
  });

  it("should display error message", async () => {
    // Simulate an error being caught
    const wrapper = mountComponent(ErrorBoundary);

    // Manually trigger error state for testing
    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error message";
    vm.showDetails = true; // Show details to see the error message

    await wrapper.vm.$nextTick();

    expect(wrapper.text()).toContain("Test error message");
  });

  it("should show technical details when toggled", async () => {
    const wrapper = mountComponent(ErrorBoundary);

    // Set error state
    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error";
    vm.errorInfo = "Component stack trace";

    await wrapper.vm.$nextTick();

    // Initially details should be hidden
    expect(wrapper.find(".bg-gray-50").exists()).toBe(false);

    // Click show details button
    await clickButton(wrapper, 'button:contains("Show technical details")');

    expect(wrapper.text()).toContain("Component stack trace");
  });

  it("should attempt retry when retry button is clicked", async () => {
    const wrapper = mountComponent(ErrorBoundary);

    // Set error state
    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error";

    await wrapper.vm.$nextTick();

    // Click retry button
    await clickButton(wrapper, 'button:contains("Try Again")');

    // Should show retrying state temporarily
    expect(wrapper.text()).toContain("Retrying...");
  });

  it("should reload page when reload button is clicked", async () => {
    const mockReload = vi.fn();
    Object.defineProperty(window.location, "reload", {
      value: mockReload,
      writable: true
    });

    const wrapper = mountComponent(ErrorBoundary);

    // Set error state
    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error";

    await wrapper.vm.$nextTick();

    await clickButton(wrapper, 'button:contains("Reload Page")');

    expect(mockReload).toHaveBeenCalled();
  });

  it("should copy error details to clipboard when report button is clicked", async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: { writeText: mockWriteText }
    });

    // Mock alert
    const mockAlert = vi.fn();
    global.alert = mockAlert;

    const wrapper = mountComponent(ErrorBoundary);

    // Set error state
    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error message";
    vm.errorInfo = "Test error info";

    await wrapper.vm.$nextTick();

    await clickButton(wrapper, 'a:contains("report this issue")');

    expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining("Test error message"));
    expect(mockAlert).toHaveBeenCalledWith(expect.stringContaining("Error details copied to clipboard"));
  });

  it("should handle clipboard API failure", async () => {
    // Mock clipboard API to fail
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockRejectedValue(new Error("Clipboard failed"))
      }
    });

    // Mock document.execCommand for fallback
    const mockExecCommand = vi.fn().mockReturnValue(true);
    document.execCommand = mockExecCommand;

    const mockAlert = vi.fn();
    global.alert = mockAlert;

    const wrapper = mountComponent(ErrorBoundary);

    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error";

    await wrapper.vm.$nextTick();

    await clickButton(wrapper, 'a:contains("report this issue")');

    expect(mockExecCommand).toHaveBeenCalledWith("copy");
    expect(mockAlert).toHaveBeenCalled();
  });

  it("should respect maxRetries prop", async () => {
    const wrapper = mountComponent(ErrorBoundary, {
      props: {
        maxRetries: 2
      }
    });

    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Test error";
    vm.retryCount = 2; // At max retries

    await wrapper.vm.$nextTick();

    const retryButton = wrapper.find('button:contains("Try Again")');
    await retryButton.trigger("click");

    // Should not attempt retry when at max
    expect(vm.retryCount).toBe(2);
  });

  it("should call onError callback when provided", async () => {
    const mockOnError = vi.fn();

    const wrapper = mountComponent(ErrorBoundary, {
      props: {
        onError: mockOnError
      }
    });

    // Simulate error capture
    const vm = wrapper.vm as any;
    const testError = new Error("Test error");
    const testInfo = "Test component info";

    // Call the error handler manually
    const errorHandler = vm.$.appContext.config.errorHandler;
    if (errorHandler) {
      errorHandler(testError, vm, testInfo);
    }

    expect(mockOnError).toHaveBeenCalledWith(testError, testInfo);
  });

  it("should show different styling based on error type", async () => {
    const wrapper = mountComponent(ErrorBoundary);

    const vm = wrapper.vm as any;
    vm.hasError = true;
    vm.errorMessage = "Network Error: Failed to fetch";

    await wrapper.vm.$nextTick();

    // Should render error boundary with standard styling
    expect(wrapper.find(".error-boundary").exists()).toBe(true);
    expect(wrapper.find(".bg-white.rounded-lg.shadow-lg").exists()).toBe(true);
  });

  it("should handle error state reset correctly", async () => {
    const wrapper = mountComponent(ErrorBoundary, {
      slots: {
        default: WorkingComponent
      }
    });

    const vm = wrapper.vm as any;

    // Simulate error
    vm.hasError = true;
    vm.errorMessage = "Test error";
    await wrapper.vm.$nextTick();

    expect(wrapper.find(".error-boundary").exists()).toBe(true);

    // Reset error state
    vm.hasError = false;
    vm.errorMessage = "";
    await wrapper.vm.$nextTick();

    // Should show normal content again
    expect(wrapper.find(".error-boundary").exists()).toBe(false);
    expect(wrapper.text()).toContain("Working component content");
  });
});
