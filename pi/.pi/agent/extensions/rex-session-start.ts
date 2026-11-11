// ~/.pi/agent/extensions/rex-session-start.ts
// Náhrada Rex SessionStart hooku pro Pi + synchronizace /name → label session v Rexu.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const TIMEOUT_MS = 3000;

// Agent-neutrální znění; text už obsahuje i instrukci k pojmenování session
const SESSION_START_ARGS = ["__internal", "session-start", "--agent", "opencode"];

// Stejný příkaz, jaký Rex ukládá agentovi v textu session-start
const LABEL_ARGS: ((name: string) => string[]) | null = (name) => [
  "session",
  "rename",
  process.env.REX_SESSION ?? "",
  name,
];

export default function (pi: ExtensionAPI) {
  let context: Promise<string | undefined> = Promise.resolve(undefined);

  // Fail-open: mimo Rex, bez `rex` nebo při chybě/timeoutu nic neudělá
  async function rex(args: string[]): Promise<string | undefined> {
    if (!process.env.REX_SESSION) return undefined;
    try {
      const { stdout } = await exec("rex", ["--autostart=false", ...args], {
        timeout: TIMEOUT_MS,
      });
      return stdout.trim() || undefined;
    } catch {
      return undefined;
    }
  }

  async function syncLabel(name: string | undefined) {
    if (!name || !LABEL_ARGS) return;
    await rex(LABEL_ARGS(name));
  }

  pi.on("session_start", async () => {
    // Neblokuje start; text se vyrenderuje jednou na session → stabilní prompt cache
    context = rex(SESSION_START_ARGS);
    void syncLabel(pi.getSessionName()); // resume pojmenované session
  });

  pi.on("before_agent_start", async (event) => {
    const text = await context;
    if (!text) return undefined;
    return { systemPrompt: `${event.systemPrompt}\n\n${text}` };
  });

  // name je undefined při smazání názvu → label v Rexu se nemění
  pi.on("session_info_changed", async (event) => {
    await syncLabel(event.name);
  });
}
