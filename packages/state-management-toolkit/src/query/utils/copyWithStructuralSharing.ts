import { isPlainObject } from '../core/toolkitImports'

export function copyWithStructuralSharing<T>(oldObj: any, newObj: T): T
export function copyWithStructuralSharing(oldObj: any, newObj: any): any {
  // cast away the `obj is object` type guard so `oldObj`/`newObj` don't get
  // narrowed to a no-index-signature `object` type below
  const isPlain = isPlainObject as (_: any) => boolean
  if (
    oldObj === newObj ||
    !(
      (isPlain(oldObj) && isPlain(newObj)) ||
      (Array.isArray(oldObj) && Array.isArray(newObj))
    )
  ) {
    return newObj
  }
  const newKeys = Object.keys(newObj)
  const oldKeys = Object.keys(oldObj)

  let isSameObject = newKeys.length === oldKeys.length
  const mergeObj: any = Array.isArray(newObj) ? [] : {}
  for (const key of newKeys) {
    mergeObj[key] = copyWithStructuralSharing(oldObj[key], newObj[key])
    if (isSameObject) isSameObject = oldObj[key] === mergeObj[key]
  }
  return isSameObject ? oldObj : mergeObj
}
