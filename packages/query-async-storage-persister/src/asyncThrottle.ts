export function asyncThrottle<TArgs extends Array<unknown>>(
  func: (...args: TArgs) => Promise<void>,
  { interval = 1000, onError }: { interval?: number; onError?: (error: unknown) => void } = {},
): (...args: TArgs) => void {
  if (typeof func !== 'function') {
    throw new TypeError('argument is not function')
  }

  let running = false
  let lastArgs: TArgs | undefined

  const execute = async (...args: TArgs) => {
    running = true
    try {
      await func(...args)
    } catch (error) {
      onError?.(error)
    } finally {
      running = false
    }
  }

  let timeout: ReturnType<typeof setTimeout> | undefined

  return (...args: TArgs) => {
    lastArgs = args

    if (!running) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = undefined
      }
      timeout = setTimeout(() => {
        timeout = undefined
        if (lastArgs !== undefined) {
          execute(...lastArgs)
          lastArgs = undefined
        }
      }, interval)
    }
  }
}
