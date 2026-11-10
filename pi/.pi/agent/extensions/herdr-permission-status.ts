import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import type { PermissionDecisionEvent, PermissionUiPromptEvent } from '@gotgenes/pi-permission-system'

const openRequests = new Set<string>()

function report(status: 'working' | 'blocked') {
  const kind = status === 'blocked' ? ':kind=permission' : ''
  process.stdout.write(`\x1b]7501;app=pi:state=${status}${kind}\x1b\\`)
}

export default function (pi: ExtensionAPI) {
  if (!process.env.HC_TERMINAL_ID) return

  pi.events.on('permissions:ui_prompt', (raw) => {
    const event = raw as PermissionUiPromptEvent
    if (typeof event.requestId !== 'string' || !event.requestId || openRequests.has(event.requestId)) return

    const alreadyBlocked = openRequests.size > 0
    openRequests.add(event.requestId)
    if (!alreadyBlocked) report('blocked')
  })

  pi.events.on('permissions:decision', (raw) => {
    const event = raw as PermissionDecisionEvent
    if (typeof event.requestId !== 'string' || !event.requestId) return
    if (event.result !== 'allow' && event.result !== 'deny') return
    if (!openRequests.delete(event.requestId)) return
    if (openRequests.size === 0) report('working')
  })
}
