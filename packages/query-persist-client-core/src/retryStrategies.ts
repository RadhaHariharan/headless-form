import type { StorageValue } from './createPersister'

export interface RetryConfig {
  retries?: number
  retryDelay?: number | ((retryAttempt: number, error: Error) => number)
}

export function defaultRetry(failureCount: number, error: Error): boolean {
  return failureCount < 3
}

export function defaultRetryDelay(failureCount: number): number {
  return Math.min(1000 * 2 ** failureCount, 30000)
}
