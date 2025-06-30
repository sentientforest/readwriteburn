import { VueWrapper, mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { vi } from "vitest";
import type { Component } from "vue";

export function createTestPinia() {
  const pinia = createPinia();
  setActivePinia(pinia);
  return pinia;
}

export function mountComponent<T extends Component>(component: T, options: any = {}): VueWrapper<any> {
  const pinia = createTestPinia();

  return mount(component, {
    global: {
      plugins: [pinia],
      stubs: {
        RouterLink: {
          template: "<a><slot /></a>",
          props: ["to"]
        },
        RouterView: {
          template: "<div><slot /></div>"
        }
      },
      ...options.global
    },
    ...options
  });
}

export function createMockFetch(responseData: any, status = 200) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(responseData),
    text: vi.fn().mockResolvedValue(JSON.stringify(responseData)),
    headers: new Map([["content-type", "application/json"]])
  });
}

export function mockApiResponse(endpoint: string, response: any, status = 200) {
  const mockFetch = createMockFetch(response, status);
  global.fetch = mockFetch;
  return mockFetch;
}

export function mockApiError(endpoint: string, error: string, status = 500) {
  const mockFetch = vi.fn().mockRejectedValue(new Error(error));
  global.fetch = mockFetch;
  return mockFetch;
}

export async function flushPromises() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

export function createMockFire(overrides = {}) {
  return {
    slug: "test-fire",
    name: "Test Fire",
    description: "A test fire for testing purposes",
    created_at: "2023-01-01T00:00:00Z",
    created_by: "0x1234567890abcdef",
    ...overrides
  };
}

export function createMockSubmission(overrides = {}) {
  return {
    id: 1,
    name: "Test Submission",
    description: "A test submission",
    subfire_id: "test-fire",
    contributor: "0x1234567890abcdef",
    created_at: "2023-01-01T00:00:00Z",
    hash_verified: true,
    moderation_status: "active",
    votes: 5,
    ...overrides
  };
}

export function createMockVote(overrides = {}) {
  return {
    id: "vote-1",
    entry: "1",
    fire: "test-fire",
    quantity: "1.0",
    voter: "0x1234567890abcdef",
    created_at: "2023-01-01T00:00:00Z",
    ...overrides
  };
}

export function createMockUser(overrides = {}) {
  return {
    address: "0x1234567890abcdef1234567890abcdef12345678",
    role: "user",
    isActive: true,
    lastActivity: "2023-01-01T00:00:00Z",
    ...overrides
  };
}

// Test data generators
export function generateMockFires(count: number) {
  return Array.from({ length: count }, (_, i) =>
    createMockFire({
      slug: `fire-${i}`,
      name: `Fire ${i}`,
      description: `Description for fire ${i}`
    })
  );
}

export function generateMockSubmissions(count: number, fireSlug = "test-fire") {
  return Array.from({ length: count }, (_, i) =>
    createMockSubmission({
      id: i + 1,
      name: `Submission ${i + 1}`,
      description: `Description for submission ${i + 1}`,
      subfire_id: fireSlug
    })
  );
}

export function generateMockVotes(count: number, entryId = "1") {
  return Array.from({ length: count }, (_, i) =>
    createMockVote({
      id: `vote-${i + 1}`,
      entry: entryId,
      quantity: (Math.random() * 10).toFixed(1)
    })
  );
}

// Error simulation helpers
export function simulateNetworkError() {
  global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));
}

export function simulateSlowResponse(delay = 2000) {
  global.fetch = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({}),
              text: () => Promise.resolve("{}")
            }),
          delay
        )
      )
  );
}

// Component interaction helpers
export async function clickButton(wrapper: VueWrapper<any>, selector: string) {
  const button = wrapper.find(selector);
  expect(button.exists()).toBe(true);
  await button.trigger("click");
  await flushPromises();
}

export function findByText(wrapper: VueWrapper<any>, text: string) {
  const elements = wrapper.findAll("*");
  return elements.find((el) => el.text().includes(text));
}

export async function fillInput(wrapper: VueWrapper<any>, selector: string, value: string) {
  const input = wrapper.find(selector);
  expect(input.exists()).toBe(true);
  await input.setValue(value);
  await flushPromises();
}

export async function submitForm(wrapper: VueWrapper<any>, selector = "form") {
  const form = wrapper.find(selector);
  expect(form.exists()).toBe(true);
  await form.trigger("submit");
  await flushPromises();
}

// Assertion helpers
export function expectElementToContainText(wrapper: VueWrapper<any>, selector: string, text: string) {
  const element = wrapper.find(selector);
  expect(element.exists()).toBe(true);
  expect(element.text()).toContain(text);
}

export function expectElementToHaveClass(wrapper: VueWrapper<any>, selector: string, className: string) {
  const element = wrapper.find(selector);
  expect(element.exists()).toBe(true);
  expect(element.classes()).toContain(className);
}

// Store testing helpers
export function resetAllStores() {
  // This would reset all Pinia stores to their initial state
  const pinia = createTestPinia();
  setActivePinia(pinia);
}

// Async state testing
export function waitForAsyncState(fn: () => boolean, timeout = 5000) {
  return new Promise<void>((resolve, reject) => {
    const startTime = Date.now();

    function check() {
      if (fn()) {
        resolve();
      } else if (Date.now() - startTime > timeout) {
        reject(new Error("Timeout waiting for async state"));
      } else {
        setTimeout(check, 10);
      }
    }

    check();
  });
}

export default {
  createTestPinia,
  mountComponent,
  createMockFetch,
  mockApiResponse,
  mockApiError,
  flushPromises,
  createMockFire,
  createMockSubmission,
  createMockVote,
  createMockUser,
  generateMockFires,
  generateMockSubmissions,
  generateMockVotes,
  simulateNetworkError,
  simulateSlowResponse,
  clickButton,
  fillInput,
  submitForm,
  expectElementToContainText,
  expectElementToHaveClass,
  resetAllStores,
  waitForAsyncState
};
