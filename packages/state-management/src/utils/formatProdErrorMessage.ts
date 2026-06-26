export function formatProdErrorMessage(code: number) {
  return (
    `Minified error #${code}; ` +
    'use the non-minified dev environment for the full message. '
  )
}
