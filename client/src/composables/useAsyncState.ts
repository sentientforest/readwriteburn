import { type Ref, computed, ref } from "vue";

import { useErrorReporting } from "./useErrorReporting";

export interface AsyncStateOptions {
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  onError?: (error: Error) => void;
  onRetry?: (attempt: number) => void;
  onSuccess?: (data: any) => void;
}

export interface AsyncState<T> {
  data: Ref<T | null>;
  loading: Ref<boolean>;
  error: Ref<string | null>;
  lastUpdated: Ref<Date | null>;
  retryCount: Ref<number>;
  execute: () => Promise<T | null>;
  retry: () => Promise<T | null>;
  reset: () => void;
  isStale: Ref<boolean>;
}

export function useAsyncState<T>(
  asyncFn: () => Promise<T>,
  initialData: T | null = null,
  options: AsyncStateOptions = {}
): AsyncState<T> {
  const { maxRetries = 3, retryDelay = 1000, timeout = 30000, onError, onRetry, onSuccess } = options;

  const { reportError } = useErrorReporting();

  // State
  const data = ref<T | null>(initialData);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);
  const retryCount = ref(0);

  // Computed
  const isStale = computed(() => {
    if (!lastUpdated.value) return true;
    const fiveMinutes = 5 * 60 * 1000;
    return Date.now() - lastUpdated.value.getTime() > fiveMinutes;
  });

  async function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Operation timed out")), timeoutMs))
    ]);
  }

  async function execute(): Promise<T | null> {
    if (loading.value) return data.value;

    loading.value = true;
    error.value = null;

    try {
      const result = await executeWithTimeout(asyncFn(), timeout);

      data.value = result;
      lastUpdated.value = new Date();
      retryCount.value = 0;

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      error.value = errorMessage;

      reportError(err as Error, {
        component: "useAsyncState",
        retryCount: retryCount.value,
        maxRetries,
        operation: asyncFn.name || "anonymous"
      });

      if (onError) {
        onError(err as Error);
      }

      return null;
    } finally {
      loading.value = false;
    }
  }

  async function retry(): Promise<T | null> {
    if (retryCount.value >= maxRetries) {
      const exhaustedError = new Error(`Max retries (${maxRetries}) exceeded`);
      error.value = exhaustedError.message;
      reportError(exhaustedError, {
        component: "useAsyncState",
        retryCount: retryCount.value,
        maxRetries,
        operation: "retry"
      });
      return null;
    }

    retryCount.value++;

    if (onRetry) {
      onRetry(retryCount.value);
    }

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount.value - 1);
    await new Promise((resolve) => setTimeout(resolve, delay));

    return execute();
  }

  function reset(): void {
    data.value = initialData;
    loading.value = false;
    error.value = null;
    lastUpdated.value = null;
    retryCount.value = 0;
  }

  return {
    data,
    loading,
    error,
    lastUpdated,
    retryCount,
    execute,
    retry,
    reset,
    isStale
  };
}

// Specialized hook for API calls
export function useApiCall<T>(
  url: string,
  options: RequestInit = {},
  asyncOptions: AsyncStateOptions = {}
): AsyncState<T> {
  const apiCall = async (): Promise<T> => {
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    } else {
      return response.text() as unknown as T;
    }
  };

  return useAsyncState(apiCall, null, {
    onError: (error) => {
      console.error(`API call failed for ${url}:`, error);
    },
    ...asyncOptions
  });
}

// Hook for batch operations
export function useBatchAsyncState<T>(
  asyncFns: Array<() => Promise<T>>,
  options: AsyncStateOptions = {}
): AsyncState<T[]> {
  const batchOperation = async (): Promise<T[]> => {
    const results = await Promise.allSettled(asyncFns.map((fn) => fn()));

    const successfulResults: T[] = [];
    const errors: Error[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        errors.push(new Error(`Batch operation ${index} failed: ${result.reason}`));
      }
    });

    if (errors.length > 0 && successfulResults.length === 0) {
      throw new Error(`All batch operations failed: ${errors.map((e) => e.message).join(", ")}`);
    }

    if (errors.length > 0) {
      console.warn(`Some batch operations failed:`, errors);
    }

    return successfulResults;
  };

  return useAsyncState(batchOperation, [], options);
}
