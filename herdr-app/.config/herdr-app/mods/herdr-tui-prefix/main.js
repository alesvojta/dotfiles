import { View, div } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { closeOverlay, focused, hc, nextCommand, props, run, theme } from "herdr";

// Herdr TUI defaults, mapped to the app commands available here.
// Only repeatable actions start a timer: the first key after Ctrl+B can take as long as you like.
const REPEAT_MS = 500;
const BINDINGS = [
  ["c", "New tab", "tab.new"],
  ["v", "Split right", "pane.split", { direction: "right" }],
  ["-", "Split down", "pane.split", { direction: "down" }],
  ["x", "Close pane", "pane.close"],
  ["X", "Close tab", "tab.close"],
  ["n", "Next tab", "tab.next"],
  ["p", "Previous tab", "tab.prev"],
  ["T", "Rename tab", "tab.rename"],
  ["N", "New space", "space.new"],
  ["W", "Rename space", "space.rename"],
  ["D", "Close space", "space.close"],
  ["h", "Focus left", "pane.go", { direction: "left" }, true],
  ["j", "Focus down", "pane.go", { direction: "down" }, true],
  ["k", "Focus up", "pane.go", { direction: "up" }, true],
  ["l", "Focus right", "pane.go", { direction: "right" }, true],
  ["left", "Focus left", "pane.go", { direction: "left" }, true],
  ["down", "Focus down", "pane.go", { direction: "down" }, true],
  ["up", "Focus up", "pane.go", { direction: "up" }, true],
  ["right", "Focus right", "pane.go", { direction: "right" }, true],
  ["z", "Zoom pane", "pane.zoom"],
  ["b", "Toggle sidebar", "layout.toggle", { id: "sidebar" }],
  ["s", "Settings", "app.settings"],
  ...Array.from({ length: 9 }, (_, i) => [String(i + 1), `Tab ${i + 1}`, "tab.select", { index: i + 1 }]),
];

function forwardKey(e, key) {
  if (["enter", "tab", "backspace", "left", "right", "up", "down", "space"].includes(e.key)) return e.key;
  if (key === " ") return "space";
  if (/^[A-Z]$/.test(key)) return `shift+${key.toLowerCase()}`;
  if (key.length === 1 && "abcdefghijklmnopqrstuvwxyz0123456789`\\[],=-.';/".includes(key)) return key === "\\" ? "backslash" : key;
  return null;
}

export default class HerdrTuiPrefix extends View {
  init(_props, cx) {
    this.handle = cx.focus_handle();
    this.handle.focus();
    this.repeat = false;
    this.generation = 0;
    this.all = false;
    // The mod-specific key binding beats the global opener while we're open.
    cx.spawn(async (cx) => {
      for (;;) {
        await nextCommand();
        this.sendPrefix(cx);
      }
    });
  }

  dismiss() {
    closeOverlay(props().overlay);
  }

  send(key, cx) {
    this.generation++;
    const terminal = focused()?.terminal;
    if (!terminal) return this.dismiss();
    // hc starts its subprocess at the call, before closing cancels this view's tasks.
    const pending = hc(["keys", terminal, key]);
    cx.spawn(async () => {
      const result = await pending;
      if (result.code !== 0) console.log(`herdr-tui-prefix: ${result.stderr}`);
    });
    this.dismiss();
  }

  sendPrefix(cx) {
    this.send("ctrl+b", cx);
  }

  key(e, cx) {
    cx.stop_propagation();
    const m = e.modifiers;
    if (e.key === "escape") return this.dismiss();
    if (m.control && e.key === "b") return this.sendPrefix(cx);
    const plain = !m.control && !m.alt && !m.platform;
    const key = plain ? (e.key_char ?? (m.shift && e.key.length === 1 ? e.key.toUpperCase() : e.key)) : e.key;
    if (plain && key === "?") {
      this.all = !this.all;
      this.repeat = false;
      this.generation++;
      cx.notify();
      return;
    }
    const binding = plain && BINDINGS.find((b) => b[0] === key);
    if (!binding) {
      const forwarded = this.repeat && plain && forwardKey(e, key);
      if (forwarded) return this.send(forwarded, cx);
      return this.dismiss();
    }
    const [, , command, args = {}, repeatable = false] = binding;
    if (!repeatable) this.dismiss();
    run(command, args);
    if (repeatable) {
      this.repeat = true;
      const generation = ++this.generation;
      cx.timer.after(REPEAT_MS, () => {
        if (this.generation === generation) this.dismiss();
      });
      cx.notify();
    }
  }

  render() {
    const t = theme();
    const rows = this.all ? BINDINGS : BINDINGS.filter(([key]) => !["left", "right", "up", "down"].includes(key) && !/^\d$/.test(key));
    const columnSize = Math.ceil(rows.length / 3);
    const columns = Array.from({ length: 3 }, (_, i) => rows.slice(i * columnSize, (i + 1) * columnSize));
    const shortcut = (key) => div().font_family("JetBrains Mono").text_size(12).text_color(t.accent).child(key);
    const displayKey = (key) => ({ left: "←", right: "→", up: "↑", down: "↓" }[key] ?? (/^[A-Z]$/.test(key) ? `⇧${key}` : key));
    const hint = (label) => div().text_color(t.muted).child(label);
    const shortcutRow = (key, action) => h_flex().w_full().items_center().justify_between()
      .child(shortcut(key)).child(hint(action));
    const card = (title, items) => v_flex().flex_1().min_w(0).h(108).gap(5).p(8).bg(t.surface).rounded(6)
      .child(div().font_semibold().child(title)).children(items);
    return v_flex().id("herdr-tui-prefix").w_full().h_full().track_focus(this.handle)
      .on_key_down((e, cx) => this.key(e, cx))
      .p(14).gap(8).bg(t.popover).text_color(t.foreground).text_size(12)
      .child(h_flex().w_full().items_center().justify_between()
        .child(div().font_semibold().child(this.repeat ? `Repeat · ${REPEAT_MS} ms` : "Waiting for a key"))
        .child(h_flex().items_center().gap(5)
          .child(shortcut("Esc")).child(hint("cancel ·"))
          .child(shortcut("Ctrl+B")).child(hint("send prefix"))))
      .child(h_flex().w_full().items_start().gap(12).children(columns.map((column) =>
        v_flex().flex_1().min_w(0).children(column.map(([key, label, , , repeatable]) => {
          const shownKey = displayKey(key);
          return h_flex().w_full().h(20).flex_none().items_center().gap(8)
            .child(div().w(24).flex_none().whitespace_nowrap().font_family("JetBrains Mono").text_size(12).text_color(t.accent).child(shownKey))
            .child(div().flex_1().min_w(0).whitespace_nowrap().child(label))
            .when(repeatable, (row) => row.child(div().w(40).flex_none().text_right().text_color(t.dim).child("repeat")));
        })))))
      .child(div().flex_1().min_h(0))
      .child(v_flex().w_full().gap(7)
        .child(h_flex().w_full().gap(8)
          .child(card("Tabs", [
            shortcutRow("Ctrl+Tab", "next"),
            shortcutRow("Ctrl+Shift+Tab", "previous"),
            shortcutRow("⌘⇧[ / ]", "previous / next").mb(8),
          ]))
          .child(card("Spaces", [
            shortcutRow("⌘⌥[ / ]", "previous / next"),
            shortcutRow("Ctrl+1–9", "select"),
          ])))
        .child(h_flex().w_full().justify_center().items_center().gap(5)
          .child(hint("TUI:"))
          .child(shortcut("1–9")).child(hint("tabs ·"))
          .child(shortcut("arrows")).child(hint("focus ·"))
          .child(shortcut("?")).child(hint("all bindings"))));
  }
}
