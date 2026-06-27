/**
 * Custom Footer Extension
 *
 * Displays a custom footer below the input editor with:
 * - Left: Current directory and git branch
 * - Right: Model and thinking level
 * - Token stats and context window usage
 *
 * Updates in real-time with 1-second debounce.
 */

import type { AssistantMessage } from '@earendil-works/pi-ai'
import type { ExtensionAPI, ExtensionContext } from '@earendil-works/pi-coding-agent'
import { truncateToWidth, visibleWidth } from '@earendil-works/pi-tui'
import { homedir } from 'node:os'

async function getGitBranch(pi: ExtensionAPI, cwd: string): Promise<string | null> {
  try {
    const result = await pi.exec('git', ['-C', cwd, 'branch', '--show-current'], { timeout: 2000 })
    if (result.code !== 0) return null
    return result.stdout.trim() || null
  } catch {
    // git may be unavailable
    return null
  }
}

function formatTokens(n: number): string {
  // Progressive formatting: 12, 55k, 1.2M, 1.5B, etc.
  if (n < 1000) return `${n}`
  if (n < 1_000_000) {
    const k = n / 1000
    return k % 1 === 0 ? `${Math.round(k)}k` : `${k.toFixed(1)}k`
  }
  if (n < 1_000_000_000) {
    const m = n / 1_000_000
    return m % 1 === 0 ? `${Math.round(m)}M` : `${m.toFixed(1)}M`
  }
  const b = n / 1_000_000_000
  return b % 1 === 0 ? `${Math.round(b)}B` : `${b.toFixed(1)}B`
}

// Threshold at which the context bar switches from absolute token count to percentage of context window.
const PHASE1_MAX = 120_000

export default function (pi: ExtensionAPI) {
  let updateTimeout: NodeJS.Timeout | null = null
  let lastUpdate = 0
  let isEnabled = true

  const scheduleUpdate = (ctx: ExtensionContext) => {
    if (updateTimeout) clearTimeout(updateTimeout)
    updateTimeout = setTimeout(
      () => {
        lastUpdate = Date.now()
        void updateFooter(ctx)
      },
      Math.max(0, 1000 - (Date.now() - lastUpdate)),
    )
  }

  const updateFooter = async (ctx: ExtensionContext) => {
    const gitBranch = await getGitBranch(pi, ctx.cwd)

    // Cache token stats here (debounced) instead of inside render() (called every frame).
    // Use getEntries() (not getBranch()) to include pre-compaction history.
    let inputTokens = 0
    let outputTokens = 0
    let totalCacheRead = 0
    let totalCacheWrite = 0
    let totalCost = 0
    let latestCacheHitRate: number | undefined
    try {
      for (const e of ctx.sessionManager.getEntries()) {
        if (e.type === 'message' && e.message.role === 'assistant') {
          const m = e.message as AssistantMessage
          const cacheRead = m.usage?.cacheRead ?? 0
          const cacheWrite = m.usage?.cacheWrite ?? 0
          inputTokens += m.usage?.input ?? 0
          outputTokens += m.usage?.output ?? 0
          totalCacheRead += cacheRead
          totalCacheWrite += cacheWrite
          totalCost += m.usage?.cost?.total ?? 0
          const latestPromptTokens = (m.usage?.input ?? 0) + cacheRead + cacheWrite
          if (latestPromptTokens > 0) {
            latestCacheHitRate = (cacheRead / latestPromptTokens) * 100
          }
        }
      }
    } catch (err) {
      console.error('[custom-footer] failed to read session tokens:', err)
    }

    const cwdShort = ctx.cwd.replace(homedir(), '~')
    const modelId = ctx.model?.id ?? 'no-model'
    const thinkingLevel = pi.getThinkingLevel()
    const contextWindow = ctx.model?.contextWindow ?? 128000
    const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false

    ctx.ui.setFooter((_tui, theme, footerData) => {
      return {
        invalidate() {},
        render(width: number): string[] {
          // Context window usage — two-phase progress bar
          const usedTokens = ctx.getContextUsage()?.tokens ?? 0

          // Line 1: cwd + branch | context bar
          const leftStr = gitBranch ? `${cwdShort} | \uEA68 ${gitBranch}` : cwdShort
          const leftText = theme.fg('dim', leftStr)

          // Phase 1 [square brackets, dim]:  0–PHASE1_MAX, each # = PHASE1_MAX/10 tokens
          // Phase 2 {curly braces, dim/yellow/red}: PHASE1_MAX+, each # = 10% of context window
          const totalSegments = 10
          let contextText: string

          if (usedTokens < PHASE1_MAX) {
            const filled = Math.floor(usedTokens / (PHASE1_MAX / totalSegments))
            const empty = totalSegments - filled
            const barContent = '#'.repeat(filled) + '-'.repeat(empty)
            const bracketColor = filled >= 9 ? 'error' : filled >= 6 ? 'warning' : 'dim'
            contextText =
              theme.fg(bracketColor, '[') +
              theme.fg('dim', barContent) +
              theme.fg(bracketColor, ']') +
              theme.fg(
                'dim',
                ` ${formatTokens(usedTokens)}/${formatTokens(PHASE1_MAX)} (${formatTokens(contextWindow)})`,
              )
          } else {
            const contextPercent = Math.round((usedTokens / contextWindow) * 100)
            const filled = Math.min(totalSegments, Math.floor(contextPercent / 10))
            const empty = totalSegments - filled
            const barContent = '#'.repeat(filled) + '-'.repeat(empty)
            // Bracket color scales with context window fill
            const bracketColor = contextPercent >= 70 ? 'error' : contextPercent >= 50 ? 'warning' : 'dim'
            contextText =
              theme.fg(bracketColor, '{') +
              theme.fg('dim', barContent) +
              theme.fg(bracketColor, '}') +
              theme.fg('dim', ` ${contextPercent}% (${formatTokens(usedTokens)}/${formatTokens(contextWindow)})`)
          }

          // Line 2: token stats | model + thinking
          const parts: string[] = []
          if (inputTokens) parts.push(`↑${formatTokens(inputTokens)}`)
          if (outputTokens) parts.push(`↓${formatTokens(outputTokens)}`)
          if (totalCacheRead) parts.push(`R${formatTokens(totalCacheRead)}`)
          if (totalCacheWrite) parts.push(`W${formatTokens(totalCacheWrite)}`)
          if ((totalCacheRead > 0 || totalCacheWrite > 0) && latestCacheHitRate !== undefined) {
            parts.push(`CH${latestCacheHitRate.toFixed(1)}%`)
          }
          if (totalCost || usingSubscription) {
            parts.push(`$${totalCost.toFixed(3)}${usingSubscription ? ' (sub)' : ''}`)
          }
          const tokenStats = theme.fg('dim', parts.join(' '))
          const rightText = theme.fg('dim', `\uEC19 ${modelId} | ${thinkingLevel}`)

          // Check if both lines fit side-by-side
          const maxLeftWidth = Math.max(visibleWidth(leftText), visibleWidth(tokenStats))
          const maxRightWidth = Math.max(visibleWidth(contextText), visibleWidth(rightText))
          const minSpacing = 4
          const canFitSideBySide = maxLeftWidth + maxRightWidth + minSpacing <= width

          const statuses = Array.from(footerData.getExtensionStatuses().entries())
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([, text]) => text.replace(/[\r\n\t]+/g, ' ').replace(/ +/g, ' ').trim())
            .filter(Boolean)
          const statusLine = statuses.length ? truncateToWidth(statuses.join(' '), width) : null

          if (canFitSideBySide) {
            const buildLine = (left: string, right: string) => {
              const leftVis = visibleWidth(left)
              const rightVis = visibleWidth(right)
              return truncateToWidth(
                `${left}${' '.repeat(Math.max(minSpacing, width - leftVis - rightVis))}${right}`,
                width,
              )
            }
            return statusLine
              ? [buildLine(leftText, contextText), buildLine(tokenStats, rightText), statusLine]
              : [buildLine(leftText, contextText), buildLine(tokenStats, rightText)]
          } else {
            // Stack vertically
            const lines = [
              truncateToWidth(leftText, width),
              truncateToWidth(tokenStats, width),
              truncateToWidth(contextText, width),
              truncateToWidth(rightText, width),
            ]
            if (statusLine) lines.push(statusLine)
            return lines
          }
        },
      }
    })
  }

  pi.on('session_start', async (_event, ctx) => {
    // Restore enabled state from previous session
    let foundState = false
    try {
      for (const entry of ctx.sessionManager.getBranch()) {
        if (entry.type === 'custom' && entry.customType === 'custom-footer-state') {
          isEnabled = entry.data?.enabled ?? true
          foundState = true
        }
      }
    } catch (err) {
      console.error('[custom-footer] failed to restore state:', err)
    }
    if (!foundState) isEnabled = true

    if (isEnabled) {
      await updateFooter(ctx)
    }
  })

  pi.on('agent_end', async (_event, ctx) => {
    if (isEnabled) scheduleUpdate(ctx)
  })

  pi.on('tool_execution_end', async (_event, ctx) => {
    if (isEnabled) scheduleUpdate(ctx)
  })

  pi.on('resources_discover', async (event, ctx) => {
    if (event.reason === 'reload' && isEnabled) scheduleUpdate(ctx)
  })

  pi.on('model_select', async (_event, ctx) => {
    if (isEnabled) void updateFooter(ctx)
  })

  pi.on('thinking_level_select', async (_event, ctx) => {
    if (isEnabled) void updateFooter(ctx)
  })

  pi.on('session_shutdown', async (_event, ctx) => {
    if (updateTimeout) {
      clearTimeout(updateTimeout)
      updateTimeout = null
    }
    if (isEnabled) {
      ctx.ui.setFooter(undefined)
    }
  })

  // Register toggle command
  pi.registerCommand('custom-footer', {
    description: 'Toggle custom footer display',
    handler: async (args, ctx) => {
      const action = args?.toLowerCase().trim()

      if (action === 'on' || action === 'enable') {
        isEnabled = true
      } else if (action === 'off' || action === 'disable') {
        isEnabled = false
        ctx.ui.setFooter(undefined)
      } else {
        // Toggle
        isEnabled = !isEnabled
        if (!isEnabled) {
          ctx.ui.setFooter(undefined)
        }
      }

      // Persist state
      pi.appendEntry('custom-footer-state', { enabled: isEnabled })

      // Update footer if enabled
      if (isEnabled) {
        await updateFooter(ctx)
      }

      const status = isEnabled ? '✓ enabled' : '✗ disabled'
      ctx.ui.notify(`Custom footer ${status}`, 'info')
    },
  })
}
