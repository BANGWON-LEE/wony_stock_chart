export function createApiWebSocketUrl(path: string) {
  const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? '/api'
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  console.log('apiBaseUrl : ', apiBaseUrl)
  const baseUrl = apiBaseUrl.endsWith('/')
    ? apiBaseUrl.slice(0, -1)
    : apiBaseUrl
  const httpUrl = new URL(`${baseUrl}${normalizedPath}`, window.location.href)

  httpUrl.protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'

  return httpUrl.toString()
}
