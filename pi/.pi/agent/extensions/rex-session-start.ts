// ~/.pi/agent/extensions/rex-session-start.ts
// Náhrada Rex SessionStart hooku pro Pi + synchronizace /name → label session v Rexu.
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);
const TIMEOUT_MS = 3000;

// `--agent opencode` záměrně, není to chyba z kopírování: od `--agent pi` se
// text liší jen odkazem na skill („The rex skill (/skill:rex)“), opencode dává
// agent-neutrální znění. Pojmenování session se řídí nastavením Rexu.
const sessionStartArgs = (naming: boolean) => [
  "__internal",
  "session-start",
  "--agent",
  "opencode",
  `--feature-session-naming=${naming}`,
];

// Upozornění cílí na `rex skill setup`, které hook pro Pi neumí → pryč z promptu
const STALE_SETUP = /setup for this agent is out of date/i;

// Stejný příkaz, jaký Rex ukládá agentovi v textu session-start
const labelArgs = (session: string, label: string) => ["session", "rename", session, label];

// Rex chce label v kebab-case („fix-login-redirect“); /name v Pi je volný text
function toLabel(name: string): string {
  return name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

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

  // Volba „Let agents name sessions“ tak, jak ji Rex eviduje pro Pi
  async function namingEnabled(): Promise<boolean> {
    try {
      const status = JSON.parse((await rex(["skill", "status", "--json"])) ?? "{}");
      const harness = status.harnesses?.find((h: { id: string }) => h.id === "pi");
      return harness?.session_naming === true;
    } catch {
      return false;
    }
  }

  async function loadContext(): Promise<string | undefined> {
    const text = await rex(sessionStartArgs(await namingEnabled()));
    return text
      ?.split(/\n{2,}/)
      .filter((paragraph) => !STALE_SETUP.test(paragraph))
      .join("\n\n");
  }

  async function syncLabel(name: string | undefined) {
    const session = process.env.REX_SESSION;
    const label = name && toLabel(name);
    if (!session || !label) return;
    await rex(labelArgs(session, label));
  }

  pi.on("session_start", async () => {
    // Neblokuje start; text se vyrenderuje jednou na session → stabilní prompt cache
    context = loadContext();
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
