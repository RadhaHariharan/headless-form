import { isServer } from './utils'

export type IsServerValue = () => boolean

export const environmentManager = (() => {
  let isServerFn: IsServerValue = () => isServer

  return {
    isServer(): boolean {
      return isServerFn()
    },
    setIsServer(isServerValue: IsServerValue): void {
      isServerFn = isServerValue
    },
  }
})()
