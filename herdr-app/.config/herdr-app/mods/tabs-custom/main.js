import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { spaces, panes, run, openOverlay, theme, window, shared, layout, exec } from "herdr";

function parseSystem(output, memoryOutput) {
  const cpu = output.match(/CPU usage:\s*[\d.]+%\s*user,\s*[\d.]+%\s*sys,\s*([\d.]+)%\s*idle/i);
  const memory = memoryOutput.match(/System-wide memory free percentage:\s*([\d.]+)%/i);
  if (!cpu || !memory) return null;
  const idle = Number(cpu[1]), free = Number(memory[1]);
  return Number.isFinite(idle) && idle >= 0 && idle <= 100 && Number.isFinite(free) && free >= 0 && free <= 100
    ? { cpu: 100 - idle, memory: 100 - free }
    : null;
}

const HISTORY = 16;
const SPARK_HEIGHT = 11;

function sparkline(t, history) {
  const slots = [...Array(HISTORY - history.length).fill(null), ...history];
  return h_flex().flex_none().items_end().gap(1).h(SPARK_HEIGHT)
    .children(slots.map(value => {
      if (value === null) return div().w(2).h(1).rounded(0.5).bg(t.hover);
      const color = value >= 90 ? t.ansi1 : value >= 75 ? t.ansi3 : t.muted;
      return div().w(2).h(Math.max(1, (SPARK_HEIGHT * value) / 100)).rounded(0.5).bg(color);
    }));
}

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

export default class Tabs extends View {
  init(_props, cx) {
    this.stats = null;
    this.cpuHistory = [];
    this.sampling = false;
    const sample = cx => this.sample(cx);
    sample(cx);
    cx.timer.every(2000, sample);
    this.pressed = null;
    this.dropTarget = null;
    this.machineHover = false;
    this.panels = JSON.parse(localStorage.getItem("panels") ?? "{}");
  }

  sample(cx) {
    if (this.sampling) return;
    this.sampling = true;
    cx.spawn(async cx => {
      try {
        const [top, memory] = await Promise.all([
          exec("top", ["-l", "1", "-n", "0"]),
          exec("memory_pressure", ["-Q"]),
        ]);
        this.stats = parseSystem(top.stdout, memory.stdout);
        if (this.stats) this.cpuHistory = [...this.cpuHistory, this.stats.cpu].slice(-HISTORY);
      } catch {
        this.stats = null;
      } finally {
        this.sampling = false;
        cx.notify();
      }
    });
  }

  // The side panel is remembered per space: switching shows that space's choice
  // (closed if it never had one), and opening or closing it records it.
  syncPanel(space, panel, body, enabled) {
    if (!space || !panel) return;
    const now = panel.hidden ? null : body?.active ?? null;
    if (space.id !== this.space) {
      const first = this.space === undefined;
      this.space = space.id; this.pending = null;
      if (!(first && !(space.id in this.panels))) {
        const stored = this.panels[space.id] ?? null, want = enabled.includes(stored) ? stored : null;
        if (want !== now) {
          this.pending = { want, until: Date.now() + 1000 };
          if (want) { run("layout.select", { stack: "panel-body", child: want }); run("layout.show", { id: "panel" }); }
          else run("layout.hide", { id: "panel" });
          return;
        }
      }
    }
    // Until the restore lands (or something else won), the old state isn't a choice.
    if (this.pending) {
      if (this.pending.want !== now && Date.now() < this.pending.until) return;
      this.pending = null;
    }
    if (this.panels[space.id] === now) return;
    this.panels[space.id] = now;
    localStorage.setItem("panels", JSON.stringify(this.panels));
  }

  render() {
    const t = theme();
    const space = spaces().find(p => p.active);
    const metric = (label, value, warning, graph = false) => {
      const color = value >= 90 ? t.ansi1 : value >= warning ? t.ansi3 : t.muted;
      return h_flex().flex_none().items_center().gap(4)
        .child(div().text_color(t.muted).child(label))
        .child(graph ? sparkline(t, this.cpuHistory) : div().w(26).h(4).flex_none().rounded_full().overflow_hidden().bg(t.hover)
          .child(div().h_full().w((26 * value) / 100).rounded_full().bg(color)))
        .child(div().min_w(26).text_color(color).child(`${Math.round(value)}%`));
    };
    const shown = space?.tabs ?? [];
    const stop = (_e, cx) => cx.stop_propagation();
    const button = (id, label, action) => div().id(id).size(26).h(24).flex_none().flex().items_center().justify_center().rounded(6).text_color(t.dim).hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", stop).on_click(action).child(label);
    const item = (c, i) => {
      const program = panes().find(p => p.tab === c.id && p.program?.agent)?.program ?? panes().find(p => p.tab === c.id)?.program;
      const name = /^tb\d+$/.test(c.name) ? program?.name ?? "Terminal" : c.name;
      return h_flex().id(`tab-${c.id}`).relative().h(24).px(8).gap(5).rounded(4).items_center().flex_none().cursor_pointer().text_size(11.8)
        .when(this.pressed !== null, el => el.cursor_grabbing())
        .border(1).border_color(c.active ? t.border : t.chrome).bg(c.active ? t.raised : t.chrome).text_color(c.active ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover))
        .on_hover((hovered, cx) => {
          if (hovered && this.pressed !== null && this.dropTarget !== i) { this.dropTarget = i; cx.notify(); }
        })
        .on_mouse_down("left", (e, cx) => {
          cx.stop_propagation();
          this.pressed = i;
          this.dropTarget = i;
          cx.notify();
          if (e.click_count === 2) run("tab.rename", { id: c.id });
        })
        .on_mouse_up("left", (_e, cx) => {
          const from = this.pressed;
          this.pressed = null; this.dropTarget = null; cx.notify();
          if (from !== null && from !== i) run("tab.move", { id: shown[from].id, index: space.tabs.findIndex(x => x.id === c.id) + 1 });
          else run("tab.select", { id: c.id });
        })
        .on_mouse_down("middle", (_e, cx) => { cx.stop_propagation(); run("tab.close", { id: c.id }); })
        .on_mouse_down("right", () => openOverlay({ mod: "menu", kind: "popup", width: 200, props: { tab: "tab", target: { id: c.id, space: space.id } } }))
        .when(Boolean(program?.icon), el => el.child(program.tint ? svg(program.icon).size(12).text_color(t.muted) : image(program.icon).size(12)))
        .child(div().max_w(135).truncate().child(c.zoomed ? `${name} Z` : name))
        .when(c.status === "working", el => el.child(svg("mods/workspace-chrome/spinner.svg").size(10).flex_none().text_color(t.working).spin(900)))
        .when(c.status === "blocked" || c.status === "done", el => el.child(div().size(5).rounded(3).bg(t[c.status])));
    };
    const markerAt = this.pressed !== null && this.dropTarget !== null && this.pressed !== this.dropTarget
      ? (this.pressed > this.dropTarget ? this.dropTarget : this.dropTarget + 1)
      : -1;
    const marker = div().id("tab-drop-indicator").w(2).h(24).flex_none().rounded(2).bg(t.accent);
    const tabs = shown.length > 1 ? shown.flatMap((c, i) => [
      ...(markerAt === i ? [marker] : []),
      item(c, i),
    ]) : [];
    if (shown.length > 1 && markerAt === shown.length) tabs.push(marker);
    const root = layout();
    const panel = find(root, "panel"), body = find(root, "panel-body");
    const enabled = shared("workspace.panels") ?? ["files", "changes"];
    this.syncPanel(space, panel, body, enabled);
    const machine = h_flex().h(24).gap(6).items_center().px(8).flex_none().text_size(11.8).text_color(t.muted)
      .on_hover((hovered, cx) => { this.machineHover = hovered; cx.notify(); })
      .child(svg(`mods/workspace-chrome/${space?.machine ? "server" : "monitor"}.svg`).size(13))
      .child(space?.machine ?? "This computer")
      .child(div().w(this.machineHover ? 26 : 0).h(24).flex_none().overflow_hidden().opacity(this.machineHover ? 1 : 0)
        .transition("width", { duration: 180, easing: "ease-out" }).transition("opacity", { duration: 140 })
        .child(button("machine-add", svg("mods/workspace-chrome/plus.svg").size(14), () => run("mod.open", { name: "machine-add" })).cursor_pointer().tooltip("Add machine")));
    const panelButton = (id, label, icon) => {
      const on = panel && !panel.hidden && body?.active === id;
      return h_flex().id(`panel-${id}`).h(26).px(8).gap(5).flex_none().items_center().rounded(6)
        .text_size(12).bg(on ? t.selected : t.chrome).text_color(on ? t.foreground : t.muted)
        .hover(s => s.bg(t.hover)).on_mouse_down("left", stop)
        .on_click(() => {
          if (on) run("layout.hide", { id: "panel" });
          else { run("layout.select", { stack: "panel-body", child: id }); run("layout.show", { id: "panel" }); }
        }).child(svg(icon).size(14)).child(label);
    };
    return h_flex().size_full().min_w(0).pl(8).pr(0).gap(3).items_start().bg(t.chrome)
      .on_mouse_up("left", (_e, cx) => { if (this.pressed !== null) { this.pressed = null; this.dropTarget = null; cx.notify(); } })
      .on_scroll_wheel(e => { if (Math.abs(e.delta.y) >= 1) run(e.delta.y > 0 ? "tab.prev" : "tab.next"); })
      .child(h_flex().id("tab-scroll").flex_1().min_w(0).h_full().items_start().gap(3).overflow_x_scrollbar()
        .children([...tabs, button("tab-new", svg("mods/workspace-chrome/plus.svg").size(14), () => run("tab.new")).cursor_pointer().tooltip("New tab")]))
      .when(enabled.includes("files"), el => el.child(panelButton("files", "Files", "mods/files/file.svg")))
      .when(enabled.includes("changes"), el => el.child(panelButton("changes", "Changes", "mods/changes/changes.svg")))
      .when(this.stats, el => el.child(h_flex().id("system-usage").h(24).text_size(11).px(6).gap(10).flex_none().items_center()
        .child(metric("CPU", this.stats.cpu, 75, true)).child(metric("MEM", this.stats.memory, 80))))
      .child(machine)
      .when(window()?.buttons, el => el.child(button("minimize", "−", () => run("window.minimize")))
        .child(button("maximize", "□", () => run("window.maximize")))
        .child(button("close-window", svg("mods/pane/close.svg").size(13), () => run("window.close"))));
  }
}
