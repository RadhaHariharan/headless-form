import { timeoutManager } from './timeoutManager'
import { environmentManager } from './environmentManager'
import { isValidTimeout } from './utils'
import type { ManagedTimerId } from './timeoutManager'

export abstract class Removable {
  gcTime!: number
  #gcTimeout?: ManagedTimerId

  destroy(): void {
    this.clearGcTimeout()
  }

  protected scheduleGc(): void {
    this.clearGcTimeout()

    if (isValidTimeout(this.gcTime)) {
      this.#gcTimeout = timeoutManager.setTimeout(() => {
        this.optionalRemove()
      }, this.gcTime)
    }
  }

  protected updateGcTime(newGcTime: number | undefined): void {
    this.gcTime = Math.max(
      this.gcTime || 0,
      newGcTime ?? (environmentManager.isServer() ? Infinity : 5 * 60 * 1000),
    )
  }

  protected clearGcTimeout() {
    if (this.#gcTimeout !== undefined) {
      timeoutManager.clearTimeout(this.#gcTimeout)
      this.#gcTimeout = undefined
    }
  }

  protected abstract optionalRemove(): void
}
