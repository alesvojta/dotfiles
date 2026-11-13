import type { ExtensionAPI } from '@earendil-works/pi-coding-agent'
import { formatProgramStatus } from '@earendil-works/pi-tui'
import type { PermissionDecisionEvent, PermissionUiPromptEvent } from '@gotgenes/pi-permission-system'

// Permission prompt neposílá `blocked` do vestavěného OSC 7501 reportéru Pi → doplňujeme ho tady.
// Formát bereme z pi-tui, aby záznam odpovídal tomu, co Pi posílá samo.
const openRequests = new Map<string, string>()

function enabled() {
  const override = process.env.PI_PROGRAM_STATUS
  if (override === '0') return false
  return override === '1' || Boolean(process.env.HC_TERMINAL_ID || process.env.REX_SESSION)
}

function promptMessage(event: PermissionUiPromptEvent) {
  const value = event.value?.split(/\r?\n/, 1)[0]?.trim()
  const surface = event.surface ?? event.source
  return value ? `${surface}: ${value}` : surface
}

export default function (pi: ExtensionAPI) {
  if (!enabled()) return

  const write = (status: Parameters<typeof formatProgramStatus>[0]) =>
    process.stdout.write(formatProgramStatus({ ...status, app: 'pi' }))

  // Nejnovější otevřený prompt, stejně jako Pi u vlastních dialogů
  const reportBlocked = () => {
    const message = [...openRequests.values()].at(-1)
    write({ state: 'blocked', kind: 'permission', message })
  }

  // Report nahrazuje celý záznam → vracíme `working` i se session name, jak ho poslalo Pi
  const reportWorking = () => write({ state: 'working', message: pi.getSessionName() })

  pi.events.on('permissions:ui_prompt', (raw) => {
    const event = raw as PermissionUiPromptEvent
    if (typeof event.requestId !== 'string' || !event.requestId || openRequests.has(event.requestId)) return

    openRequests.set(event.requestId, promptMessage(event))
    reportBlocked()
  })

  pi.events.on('permissions:decision', (raw) => {
    const event = raw as PermissionDecisionEvent
    if (typeof event.requestId !== 'string' || !event.requestId) return
    if (!openRequests.delete(event.requestId)) return
    if (openRequests.size > 0) reportBlocked()
    else reportWorking()
  })

  // Prompt zrušený bez decision eventu nesmí zablokovat další hlášení; konečný stav nahlásí Pi
  pi.on('agent_end', async () => {
    openRequests.clear()
  })
  pi.on('session_start', async () => {
    openRequests.clear()
  })
}
