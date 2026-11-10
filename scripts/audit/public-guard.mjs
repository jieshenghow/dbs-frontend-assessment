import {lookup} from 'node:dns/promises'

function loopback(hostname) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '')
  return host === 'localhost' || host.endsWith('.localhost') || /^127\./.test(host) || host === '::1' || host === '0:0:0:0:0:0:0:1' || host === '0.0.0.0' || /^::ffff:(127\.|7f[0-9a-f]{2}:)/.test(host)
}

export async function rejectLoopbackRequests(context, evidence) {
  const addresses = new Map()
  const forbidden = async (url) => {
    const parsed = new URL(url)
    if (!['http:', 'https:', 'ws:', 'wss:'].includes(parsed.protocol)) return false
    if (loopback(parsed.hostname)) return true
    if (!addresses.has(parsed.hostname)) addresses.set(parsed.hostname, lookup(parsed.hostname.replace(/^\[|\]$/g, ''), {all: true}).catch(() => []))
    return (await addresses.get(parsed.hostname)).some((entry) => loopback(entry.address))
  }
  context.on('request', (request) => {
    const url = request.url()
    evidence.requests.push({url, method: request.method(), serviceWorker: Boolean(request.serviceWorker())})
    if (loopback(new URL(url).hostname)) evidence.loopbackAttempts.push({url, source: 'observed request'})
  })
  await context.route('**/*', async (route) => {
    const url = route.request().url()
    if (await forbidden(url)) {
      evidence.loopbackAttempts.push({url, source: 'blocked route including DNS resolution'})
      await route.abort('blockedbyclient')
    } else await route.continue()
  })
  await context.routeWebSocket('**/*', async (socket) => {
    if (await forbidden(socket.url())) {
      evidence.loopbackAttempts.push({url: socket.url(), source: 'blocked WebSocket'})
      await socket.close()
    } else socket.connectToServer()
  })
}
