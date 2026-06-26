const randomString = () =>
  Math.random().toString(36).substring(7).split('').join('.')

const ActionTypes = {
  INIT: `@@headlesskit/INIT${/* #__PURE__ */ randomString()}`,
  REPLACE: `@@headlesskit/REPLACE${/* #__PURE__ */ randomString()}`,
  PROBE_UNKNOWN_ACTION: () => `@@headlesskit/PROBE_UNKNOWN_ACTION${randomString()}`
}

export default ActionTypes
