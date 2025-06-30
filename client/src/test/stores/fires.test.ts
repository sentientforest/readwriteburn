import { useFiresStore } from "@/stores/fires";
import { createPinia, setActivePinia } from "pinia";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createMockFetch, flushPromises, generateMockFires } from "../utils";

describe("useFiresStore", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("should initialize with empty state", () => {
    const store = useFiresStore();

    expect(store.fires).toEqual([]);
    expect(store.loading).toBe(false);
    expect(store.error).toBeNull();
  });

  it("should fetch fires successfully", async () => {
    const mockFires = generateMockFires(3);
    global.fetch = createMockFetch(mockFires);

    const store = useFiresStore();

    expect(store.loading).toBe(false);

    const result = store.fetchFires();

    expect(store.loading).toBe(true);

    await result;

    expect(store.loading).toBe(false);
    expect(store.fires).toEqual(mockFires);
    expect(store.error).toBeNull();
  });

  it("should handle fetch errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const store = useFiresStore();

    await store.fetchFires();

    expect(store.loading).toBe(false);
    expect(store.fires).toEqual([]);
    expect(store.error).toBe("Network error");
  });

  it("should handle HTTP errors", async () => {
    global.fetch = createMockFetch({ error: "Server error" }, 500);

    const store = useFiresStore();

    await store.fetchFires();

    expect(store.loading).toBe(false);
    expect(store.fires).toEqual([]);
    expect(store.error).toBe("Failed to fetch fires: 500");
  });

  it("should create a new fire", async () => {
    const newFire = {
      name: "New Fire",
      description: "A new fire for testing",
      parent: null
    };

    const createdFire = {
      slug: "new-fire",
      ...newFire,
      created_at: "2023-01-01T00:00:00Z",
      created_by: "0x1234567890abcdef"
    };

    global.fetch = createMockFetch({ fire: createdFire });

    const store = useFiresStore();

    const result = await store.createFire(newFire);

    expect(result).toEqual({ fire: createdFire });
    expect(store.error).toBeNull();
  });

  it("should handle create fire errors", async () => {
    global.fetch = createMockFetch({ message: "Fire already exists" }, 400);

    const store = useFiresStore();

    const newFire = {
      name: "Duplicate Fire",
      description: "This fire already exists"
    };

    await expect(store.createFire(newFire)).rejects.toThrow("Fire already exists");
    expect(store.error).toBe("Fire already exists");
  });

  it("should use cache when data is fresh", async () => {
    const mockFires = generateMockFires(2);
    const mockFetch = createMockFetch(mockFires);
    global.fetch = mockFetch;

    const store = useFiresStore();

    // First fetch
    await store.fetchFires();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Second fetch (should use cache)
    await store.fetchFires();
    expect(mockFetch).toHaveBeenCalledTimes(1); // No additional call
  });

  it("should bypass cache when forced", async () => {
    const mockFires = generateMockFires(2);
    const mockFetch = createMockFetch(mockFires);
    global.fetch = mockFetch;

    const store = useFiresStore();

    // First fetch
    await store.fetchFires();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Forced fetch
    await store.fetchFires(true);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("should prevent concurrent fetches", async () => {
    const mockFires = generateMockFires(2);
    const mockFetch = createMockFetch(mockFires);
    global.fetch = mockFetch;

    const store = useFiresStore();

    // Start multiple concurrent fetches
    const promise1 = store.fetchFires();
    const promise2 = store.fetchFires();
    const promise3 = store.fetchFires();

    await Promise.all([promise1, promise2, promise3]);

    // Should only make one actual fetch call
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("should clear error state", () => {
    const store = useFiresStore();

    store.error = "Test error";
    expect(store.error).toBe("Test error");

    store.clearError();
    expect(store.error).toBeNull();
  });

  it("should add a fire to the store", () => {
    const store = useFiresStore();
    const newFire = {
      slug: "test-fire",
      name: "Test Fire",
      description: "A test fire",
      created_at: "2023-01-01T00:00:00Z",
      created_by: "0x1234567890abcdef"
    };

    store.addFire(newFire);

    expect(store.fires).toContain(newFire);
  });

  it("should update existing fire when adding duplicate", () => {
    const store = useFiresStore();
    const fire = {
      slug: "test-fire",
      name: "Test Fire",
      description: "Original description",
      created_at: "2023-01-01T00:00:00Z",
      created_by: "0x1234567890abcdef"
    };

    store.addFire(fire);
    expect(store.fires).toHaveLength(1);

    const updatedFire = {
      ...fire,
      description: "Updated description"
    };

    store.addFire(updatedFire);

    expect(store.fires).toHaveLength(1);
    expect(store.fires[0].description).toBe("Updated description");
  });

  it("should remove a fire from the store", () => {
    const store = useFiresStore();
    const fire = {
      slug: "test-fire",
      name: "Test Fire",
      description: "A test fire",
      created_at: "2023-01-01T00:00:00Z",
      created_by: "0x1234567890abcdef"
    };

    store.addFire(fire);
    expect(store.fires).toHaveLength(1);

    store.removeFire("test-fire");
    expect(store.fires).toHaveLength(0);
  });

  it("should handle cache expiration correctly", async () => {
    vi.useFakeTimers();

    const mockFires = generateMockFires(2);
    const mockFetch = createMockFetch(mockFires);
    global.fetch = mockFetch;

    const store = useFiresStore();

    // First fetch
    await store.fetchFires();
    expect(mockFetch).toHaveBeenCalledTimes(1);

    // Advance time by 6 minutes (past the 5-minute cache)
    vi.advanceTimersByTime(6 * 60 * 1000);

    // Second fetch should hit the API again
    await store.fetchFires();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it("should handle invalid response format", async () => {
    global.fetch = createMockFetch("invalid json string");

    const store = useFiresStore();

    await store.fetchFires();

    expect(store.loading).toBe(false);
    expect(store.fires).toEqual([]);
    expect(store.error).toContain("Invalid response format");
  });

  it("should handle network timeout", async () => {
    global.fetch = vi.fn().mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const store = useFiresStore();

    // Start fetch but don't await it completely
    const fetchPromise = store.fetchFires();

    // The loading state should be true initially
    expect(store.loading).toBe(true);

    // Clean up the hanging promise
    vi.clearAllMocks();
  });
});
