import { config } from "@vue/test-utils";
import { vi } from "vitest";

// Mock window methods that are not available in jsdom
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
});

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}));

// Mock PerformanceObserver
global.PerformanceObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn()
}));

// Mock fetch
global.fetch = vi.fn();

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.sessionStorage = sessionStorageMock;

// Mock navigator
Object.defineProperty(window.navigator, "clipboard", {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue("")
  },
  writable: true
});

// Mock console methods for cleaner test output
global.console = {
  ...console,
  log: vi.fn(),
  warn: vi.fn(),
  error: vi.fn()
};

// Global test utilities
export const createMockRouter = () => ({
  push: vi.fn(),
  replace: vi.fn(),
  go: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  getRoutes: vi.fn(() => []),
  resolve: vi.fn(),
  currentRoute: {
    value: {
      path: "/",
      name: "home",
      params: {},
      query: {},
      meta: {}
    }
  }
});

export const createMockMetamaskClient = () => ({
  connect: vi.fn().mockResolvedValue(true),
  disconnect: vi.fn().mockResolvedValue(true),
  getPublicKey: vi.fn().mockResolvedValue("mock-public-key"),
  sign: vi.fn().mockResolvedValue({ signature: "mock-signature" }),
  isConnected: vi.fn().mockReturnValue(true)
});

// Configure Vue Test Utils globally
config.global.mocks = {
  $router: createMockRouter(),
  $route: {
    path: "/",
    name: "home",
    params: {},
    query: {},
    meta: {}
  }
};

// Mock environment variables
vi.mock("meta.env", () => ({
  VITE_PROJECT_API: "http://localhost:4000",
  VITE_PROJECT_ID: "readwriteburn",
  MODE: "test"
}));

// Suppress Vue warnings in tests
config.global.config.warnHandler = () => {};

console.log("Test setup completed");
