window.__ModuleLoader__.load({id:"dsh-agy",factory:(require)=>{const module={exports:{}};const exports=module.exports;
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/quota-client.jsx
var quota_client_exports = {};
__export(quota_client_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(quota_client_exports);
var import_react2 = __toESM(require("react"), 1);
var import_react_dom = require("react-dom");

// src/quota-visibility.mjs
function observeQuotaVisibility(ctx, notify) {
  const screen = ctx.sidebarRight?.mounted;
  if (!screen?.subscribe || !screen?.getSnapshot) {
    notify(false);
    return () => {
    };
  }
  let detach = () => {
  };
  const bind = () => {
    detach();
    detach = () => {
    };
    const id = screen.getSnapshot();
    if (id === void 0) {
      notify(false);
      return;
    }
    try {
      const directory = ctx.modelDirectories.directoryFor(id);
      const sync = () => {
        const state = directory.store.getSnapshot();
        const provider = (state.pending ?? state.current)?.provider;
        notify(provider === "agy-local-acp" || provider === "antigravity-acp");
      };
      detach = directory.store.subscribe(sync);
      sync();
    } catch (error) {
      console.warn("Agy quota selection unavailable:", error.message);
      notify(false);
    }
  };
  const off = screen.subscribe(bind);
  bind();
  return () => {
    off();
    detach();
  };
}

// src/running-brand.mjs
function workingLabel(text) {
  let seconds = 0, found = false;
  for (const match of text.matchAll(/(\d+)\s*(小时|分钟|分|秒|hours?|minutes?|seconds?|hrs?|mins?|secs?|h|m|s)/giu)) {
    const unit = match[2].toLowerCase();
    seconds += Number(match[1]) * (/小时|^h/.test(unit) ? 3600 : /分|^m/.test(unit) ? 60 : 1);
    found = true;
  }
  if (!found) return "Working\u2026";
  const h = Math.floor(seconds / 3600), m = Math.floor(seconds % 3600 / 60), s = seconds % 60;
  return "Working for " + [h ? `${h}h` : "", m ? `${m}m` : "", s || !h && !m ? `${s}s` : ""].filter(Boolean).join(" ");
}
function phaseLabel(state) {
  return { "preparing": "\u6574\u7406\u4E0A\u4E0B\u6587", "connecting": "\u8FDE\u63A5 Agy", "opening-session": "\u51C6\u5907\u4F1A\u8BDD", "selecting-model": "\u9009\u62E9\u6A21\u578B", "waiting-model": "\u7B49\u5F85\u6A21\u578B", "responding": "\u6A21\u578B\u5904\u7406\u4E2D", "waiting-tool": "\u7B49\u5F85\u5DE5\u5177\u7ED3\u679C" }[state?.stage] ?? "";
}
function installRunningBrand(doc) {
  const style = doc.createElement("style");
  style.textContent = `[data-agy-running-brand]{display:none}html[data-agy-provider-active] [data-agy-running-original]{display:none!important}html[data-agy-provider-active] [data-agy-running-brand]{display:inline-flex;align-items:center;gap:9px;font-size:14px} [data-agy-running-brand] svg{width:24px;height:24px;flex:none;animation:agy-working-breathe 2.8s ease-in-out infinite;transform-origin:center}@keyframes agy-working-breathe{0%,100%{opacity:.65;transform:scale(.92)}50%{opacity:1;transform:scale(1.06)}}@media(prefers-reduced-motion:reduce){[data-agy-running-brand] svg{animation:none}}`;
  doc.head.append(style);
  let id = 0, progress = null;
  const rows = /* @__PURE__ */ new Map(), syncs = /* @__PURE__ */ new Set();
  const attach = (row) => {
    if (rows.has(row)) return;
    const original = row.lastElementChild;
    if (!original || original.hasAttribute("data-agy-running-brand")) return;
    const wrapper = doc.createElement("span");
    wrapper.setAttribute("data-agy-running-brand", "");
    const gradient = "agy-working-" + ++id;
    wrapper.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none"><defs><linearGradient id="${gradient}" x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse"><stop stop-color="#26C485"/><stop offset=".38" stop-color="#35A8F5"/><stop offset=".65" stop-color="#7B61FF"/><stop offset=".84" stop-color="#F36BA8"/><stop offset="1" stop-color="#FFAF53"/></linearGradient></defs><path d="M12 2C12.55 7.2 16.8 11.45 22 12C16.8 12.55 12.55 16.8 12 22C11.45 16.8 7.2 12.55 2 12C7.2 11.45 11.45 7.2 12 2Z" fill="url(#${gradient})"/></svg>`;
    const label = doc.createElement("span");
    wrapper.append(label);
    original.setAttribute("data-agy-running-original", "");
    row.append(wrapper);
    const sync = () => {
      const phase = phaseLabel(progress), value = workingLabel(original.textContent ?? "") + (phase ? " \xB7 " + phase : "");
      if (label.textContent !== value) label.textContent = value;
      wrapper.title = progress?.stage === "waiting-model" ? "\u6B63\u5728\u7B49\u5F85 Agy \u8FD4\u56DE\u6A21\u578B\u5185\u5BB9\uFF1B\u53EF\u4EE5\u4F7F\u7528\u539F\u6709\u505C\u6B62\u6309\u94AE\u4E2D\u65AD\u3002" : "";
    };
    const observer2 = new doc.defaultView.MutationObserver(sync);
    observer2.observe(original, { childList: true, subtree: true, characterData: true });
    sync();
    syncs.add(sync);
    rows.set(row, () => {
      syncs.delete(sync);
      observer2.disconnect();
      wrapper.remove();
      original.removeAttribute("data-agy-running-original");
    });
  };
  doc.querySelectorAll("[data-chat-running]").forEach(attach);
  const observer = new doc.defaultView.MutationObserver((records) => {
    for (const record of records) for (const node of record.addedNodes) if (node.nodeType === 1) {
      if (node.matches("[data-chat-running]")) attach(node);
      node.querySelectorAll("[data-chat-running]").forEach(attach);
    }
    for (const [row, remove] of rows) if (!row.isConnected) {
      remove();
      rows.delete(row);
    }
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  return { setActive: (value) => {
    doc.documentElement.toggleAttribute("data-agy-provider-active", value);
  }, setProgress: (value) => {
    progress = value;
    syncs.forEach((sync) => sync());
  }, dispose: () => {
    observer.disconnect();
    rows.forEach((remove) => remove());
    rows.clear();
    syncs.clear();
    style.remove();
    doc.documentElement.removeAttribute("data-agy-provider-active");
  } };
}

// src/activity-client.mjs
function createActivityClient(ctx, onChange, { fetcher = globalThis.fetch, doc = globalThis.document, interval = 1500 } = {}) {
  let selected = null, value = null, timer = null, flight = null, disposed = false, generation = 0, lastRunning = false;
  const listeners = /* @__PURE__ */ new Set();
  const publish = (next) => {
    if (JSON.stringify(value) === JSON.stringify(next)) return;
    value = next;
    onChange(next);
    listeners.forEach((fn) => fn());
  };
  const running = () => !!selected && ctx.sessions.list.getSnapshot().byId[selected]?.running === true;
  const schedule = () => {
    clearTimeout(timer);
    if (!disposed && selected && running() && doc.visibilityState !== "hidden") timer = setTimeout(() => void refresh(), interval);
  };
  const refresh = async () => {
    if (disposed || !selected || doc.visibilityState === "hidden") return null;
    if (flight) return flight.promise;
    const id = selected, token = generation, controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const promise = (async () => {
      try {
        const base = new URL(doc.baseURI);
        base.search = "";
        base.hash = "";
        if (!base.pathname.endsWith("/")) base.pathname += "/";
        const url = new URL("agy-local/activity", base);
        url.searchParams.set("sessionId", id);
        const response = await fetcher(url, { credentials: "same-origin", signal: controller.signal });
        if (!response.ok) throw Error("Status unavailable");
        const data = (await response.json()).activity;
        const next = data && data.sessionId === id ? { sessionId: id, turn: data.turn, stage: data.stage, failureCode: data.failureCode } : null;
        if (!disposed && generation === token) {
          publish(next);
          return next;
        }
        return null;
      } catch {
        if (!disposed && generation === token) publish(null);
        return null;
      } finally {
        clearTimeout(timeout);
        if (flight?.controller === controller) flight = null;
        if (generation === token) schedule();
      }
    })();
    flight = { controller, promise };
    return promise;
  };
  const select = (id) => {
    if (selected === id) return;
    generation++;
    selected = id;
    flight?.controller.abort();
    flight = null;
    clearTimeout(timer);
    publish(null);
    lastRunning = running();
    if (selected) void refresh();
  };
  const sync = () => {
    const next = running();
    if (next !== lastRunning) {
      lastRunning = next;
      void refresh();
    }
  };
  const stop = ctx.sessions.list.subscribe(sync), visible = () => {
    if (doc.visibilityState === "hidden") {
      clearTimeout(timer);
      flight?.controller.abort();
    } else if (selected) void refresh();
  };
  doc.addEventListener("visibilitychange", visible);
  return { select, refresh, getSelectedId: () => selected, getSnapshot: () => value, subscribe: (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, dispose: () => {
    disposed = true;
    generation++;
    clearTimeout(timer);
    flight?.controller.abort();
    stop();
    doc.removeEventListener("visibilitychange", visible);
    listeners.clear();
  } };
}

// src/recovery-client.jsx
var import_react = __toESM(require("react"), 1);

// src/recovery-core.mjs
var CONTINUE_MESSAGE = "\u4E0A\u4E00\u8F6E\u56E0\u8FDE\u63A5\u6216\u7B49\u5F85\u8D85\u65F6\u4E2D\u65AD\u3002\u8BF7\u5148\u6839\u636E\u5DF2\u6709\u5BF9\u8BDD\u3001\u5DE5\u5177\u7ED3\u679C\u548C\u5F53\u524D\u72B6\u6001\u6838\u5BF9\u54EA\u4E9B\u5DE5\u4F5C\u5DF2\u7ECF\u5B8C\u6210\uFF0C\u518D\u7EE7\u7EED\u539F\u4EFB\u52A1\u4E2D\u5C1A\u672A\u5B8C\u6210\u7684\u90E8\u5206\u3002\u4E0D\u8981\u76F4\u63A5\u91CD\u590D\u5DF2\u7ECF\u6210\u529F\u7684\u5199\u6587\u4EF6\u3001\u547D\u4EE4\u3001\u63D0\u4EA4\u6216\u5176\u4ED6\u5916\u90E8\u64CD\u4F5C\uFF1B\u65E0\u6CD5\u786E\u5B9A\u662F\u5426\u5B8C\u6210\u65F6\uFF0C\u5148\u68C0\u67E5\u518D\u51B3\u5B9A\u3002";
var isAgy = (provider) => provider === "agy-local-acp" || provider === "antigravity-acp";
var recoverable = (state) => state?.stage === "failed" && ["ACP_TIMEOUT", "ACP_DISCONNECTED"].includes(state.failureCode);
function flashSelection(directory) {
  const current = directory.current;
  for (const group of directory.groups ?? []) if (group.id === current?.provider) {
    const model = group.models.find((m) => /^gemini.*flash/i.test(m.id) || /^gemini.*flash/i.test(m.name));
    if (!model) continue;
    const efforts = model.reasoning?.efforts ?? [], effort = efforts.some((e) => e.id === current.reasoningEffort) ? current.reasoningEffort : efforts.some((e) => e.id === "low") ? "low" : model.reasoning?.defaultEffort;
    return { provider: group.id, model: model.id, ...effort ? { reasoningEffort: effort } : {} };
  }
  throw Error("\u5F53\u524D Agy \u76EE\u5F55\u6CA1\u6709\u53EF\u7528\u7684 Flash\uFF0C\u8BF7\u4ECE\u539F\u6709\u6A21\u578B\u9009\u62E9\u5668\u9009\u62E9\u3002");
}
function createRecoveryAction(ctx, activity) {
  const pending = /* @__PURE__ */ new Set(), accepted = /* @__PURE__ */ new Set();
  return async (sessionId, turn, flash = false) => {
    const key = sessionId + ":" + turn;
    if (pending.has(sessionId) || accepted.has(key)) throw Error("\u8BE5\u6062\u590D\u8BF7\u6C42\u5DF2\u63D0\u4EA4\u6216\u6B63\u5728\u63D0\u4EA4\u3002");
    pending.add(sessionId);
    try {
      if (activity.getSelectedId() !== sessionId) throw Error("\u5F53\u524D\u4F1A\u8BDD\u5DF2\u6539\u53D8\uFF0C\u8BF7\u91CD\u65B0\u9009\u62E9\u3002");
      const status = await activity.refresh();
      if (!recoverable(status) || status.turn !== turn || status.sessionId !== sessionId) throw Error("\u672C\u8F6E\u72B6\u6001\u5DF2\u6539\u53D8\uFF0C\u8BF7\u67E5\u770B\u5F53\u524D\u4EFB\u52A1\u3002");
      return await ctx.sessions.using(sessionId, { source: "controllerOperation" }, async ({ binding }) => {
        const session = binding.session, check = () => {
          const s = session.getSnapshot();
          if (s.running || s.removed || s.pendingSubmissions.length || s.awaitingFirstTurn) throw Error("\u5F53\u524D\u4F1A\u8BDD\u5DF2\u6709\u4EFB\u52A1\uFF0C\u8BF7\u7B49\u5F85\u5B8C\u6210\u3002");
          if (activity.getSelectedId() !== sessionId) throw Error("\u5F53\u524D\u4F1A\u8BDD\u5DF2\u6539\u53D8\u3002");
        };
        check();
        const directory = ctx.modelDirectories.directoryFor(sessionId);
        if (!isAgy(directory.store.getSnapshot().current?.provider)) throw Error("\u8BF7\u5728 Agy \u4F1A\u8BDD\u4E2D\u4F7F\u7528\u6B64\u64CD\u4F5C\u3002");
        if (flash) {
          const selection = flashSelection(await directory.load());
          const result = await directory.select(selection);
          if (!result.ok) throw Error(result.error.message || "\u6A21\u578B\u5207\u6362\u672A\u6210\u529F\uFF0C\u5C1A\u672A\u7EE7\u7EED\u4EFB\u52A1\u3002");
        }
        check();
        if (!isAgy(directory.store.getSnapshot().current?.provider)) throw Error("\u6A21\u578B\u9009\u62E9\u5DF2\u6539\u53D8\uFF0C\u5C1A\u672A\u7EE7\u7EED\u4EFB\u52A1\u3002");
        const submission = session.beginSubmission({ mode: "queue", text: CONTINUE_MESSAGE, attachments: [] });
        accepted.add(key);
        while (accepted.size > 128) accepted.delete(accepted.values().next().value);
        try {
          const result = await session.prompt([{ type: "text", text: CONTINUE_MESSAGE }], "queue", void 0, submission.requestId);
          if (!result.ok) throw Error(result.error.message || "\u7EE7\u7EED\u8BF7\u6C42\u672A\u88AB\u63A5\u53D7\uFF0C\u8BF7\u5148\u67E5\u770B\u4F1A\u8BDD\u72B6\u6001\u3002");
          return true;
        } catch (error) {
          submission.abandon();
          throw Error("\u7EE7\u7EED\u8BF7\u6C42\u7ED3\u679C\u5C1A\u672A\u786E\u8BA4\uFF0C\u8BF7\u5148\u67E5\u770B\u4F1A\u8BDD\u72B6\u6001\uFF0C\u907F\u514D\u91CD\u590D\u63D0\u4EA4\u3002");
        }
      });
    } finally {
      pending.delete(sessionId);
    }
  };
}

// src/recovery-client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
function RecoveryTail({ turn, sessionId, activity, recover, useAgyModel }) {
  const status = (0, import_react.useSyncExternalStore)(activity.subscribe, activity.getSnapshot), provider = useAgyModel((s) => (s.pending ?? s.current)?.provider), [busy, setBusy] = (0, import_react.useState)(false), [sent, setSent] = (0, import_react.useState)(false), [error, setError] = (0, import_react.useState)("");
  if (!isAgy(provider) || !recoverable(status) || status.sessionId !== sessionId || status.turn !== turn.turn || !turn.end || sent) return null;
  const act = async (flash) => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await recover(sessionId, turn.turn, flash);
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { "aria-label": "Agy \u4EFB\u52A1\u6062\u590D", style: { fontSize: 12, lineHeight: 1.6, color: "inherit", padding: "8px 0" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { opacity: 0.75 }, children: "\u672C\u8F6E\u7B49\u5F85\u5DF2\u4E2D\u65AD\uFF0C\u5BF9\u8BDD\u4ECD\u4FDD\u7559\u3002\u7EE7\u7EED\u65F6\u4F1A\u5148\u6838\u5BF9\u5DF2\u6709\u64CD\u4F5C\u3002" }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 8, marginTop: 7 }, children: [[false, "\u7EE7\u7EED\u4EFB\u52A1"], [true, "\u5207\u6362 Flash \u540E\u7EE7\u7EED"]].map(([flash, label]) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: busy, onClick: () => void act(flash), style: { font: "inherit", color: "inherit", background: "transparent", border: "1px solid rgba(128,128,128,.25)", borderRadius: 8, padding: "5px 10px", cursor: busy ? "wait" : "pointer" }, children: busy ? "\u5904\u7406\u4E2D\u2026" : label }, label)) }),
    error && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { role: "alert", style: { marginTop: 6, color: "#b54c36" }, children: error })
  ] });
}
function installRecovery(ctx, activity) {
  const recover = createRecoveryAction(ctx, activity);
  return ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({ name: "conversation.chat.turnTail", id: "agy-local-recovery", inject: (sessionId) => ({ sessionId, activity, recover, hooks: { agyModel: ctx.modelDirectories.directoryFor(sessionId).store } }) }, RecoveryTail));
}

// src/quota-client.jsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var inject = ["slots", "sidebarRight", "modelDirectories", "sessions", "remote", "remote.session"];
var css = `.agy-quota-button{border:0;background:transparent;color:inherit;display:flex;align-items:center;gap:7px;padding:8px 10px;border-radius:9px;cursor:pointer;font:inherit;font-size:13px}.agy-quota-button:hover{background:rgba(128,128,128,.1)}.agy-quota-card{position:fixed;left:16px;bottom:64px;width:min(330px,calc(100vw - 32px));max-height:min(650px,75vh);overflow:auto;padding:18px;background:var(--background,#fff);color:var(--foreground,#252932);border:1px solid rgba(128,128,128,.2);border-radius:16px;box-shadow:0 12px 45px rgba(0,0,0,.13);z-index:10000;font-size:13px;font-family:inherit}.agy-quota-card header{display:flex;align-items:center;justify-content:space-between;font-size:15px;font-weight:600}.agy-quota-card button{border:0;border-radius:7px;padding:5px 8px;background:transparent;color:inherit;cursor:pointer}.agy-quota-card button:hover{background:rgba(128,128,128,.1)}.agy-quota-group{margin-top:18px}.agy-quota-row{display:flex;justify-content:space-between;gap:12px;margin:12px 0 6px}.agy-quota-track{height:5px;border-radius:5px;background:rgba(128,128,128,.16);overflow:hidden}.agy-quota-bar{height:100%;border-radius:5px;background:linear-gradient(90deg,#5689ed,#56b5cf)}.agy-quota-note{font-size:11px;opacity:.62;line-height:1.6;margin-top:5px}.agy-quota-icon{font-size:20px;background:linear-gradient(135deg,#4285f4,#a76cdd,#5abec5);background-clip:text;-webkit-text-fill-color:transparent}`;
var title = (name) => /weekly/i.test(name) ? "\u6BCF\u5468\u989D\u5EA6" : /five.*hour/i.test(name) ? "5 \u5C0F\u65F6\u989D\u5EA6" : name;
var groupTitle = (name) => name === "Gemini Models" ? "Gemini \u901A\u7528\u989D\u5EA6" : name === "Claude and GPT models" ? "Claude / GPT" : name;
var percent = (value) => typeof value === "number" ? Math.round(value * 100) + "%" : "\u672A\u77E5";
var time = (value) => {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return "\u672A\u77E5";
  }
};
function Footer({ wide = true, openSettings }) {
  const [data, setData] = (0, import_react2.useState)(null), [open, setOpen] = (0, import_react2.useState)(false), [loading, setLoading] = (0, import_react2.useState)(false);
  const root = (0, import_react2.useRef)(null), popup = (0, import_react2.useRef)(null), active = (0, import_react2.useRef)(null), mounted = (0, import_react2.useRef)(true);
  const refresh = async (force = false) => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    const timer = setTimeout(() => controller.abort(), 25e3);
    try {
      const base = new URL(document.baseURI);
      base.search = "";
      base.hash = "";
      if (!base.pathname.endsWith("/")) base.pathname += "/";
      const url = new URL("agy-local/quota" + (force ? "?refresh=1" : ""), base);
      const response = await fetch(url, { signal: controller.signal, credentials: "same-origin" });
      if (!response.ok) throw Error("quota unavailable");
      const next = await response.json();
      if (!next || !Array.isArray(next.groups)) throw Error("invalid quota");
      if (mounted.current && active.current === controller) setData(next);
    } catch {
      if (mounted.current && active.current === controller) setData((previous) => ({ ...previous, status: previous?.groups?.length ? "ok" : "unavailable", groups: previous?.groups ?? [], stale: true, message: "\u989D\u5EA6\u6682\u672A\u66F4\u65B0\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" }));
    } finally {
      clearTimeout(timer);
      if (active.current === controller) {
        active.current = null;
        if (mounted.current) setLoading(false);
      }
    }
  };
  (0, import_react2.useEffect)(() => {
    mounted.current = true;
    void refresh();
    const timer = setInterval(() => {
      if (document.visibilityState !== "hidden") void refresh();
    }, 12e4);
    return () => {
      mounted.current = false;
      clearInterval(timer);
      active.current?.abort();
      active.current = null;
    };
  }, []);
  (0, import_react2.useEffect)(() => {
    if (!open) return;
    const close = (e) => {
      if (!root.current?.contains(e.target) && !popup.current?.contains(e.target)) setOpen(false);
    };
    const escape = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);
  const primary = data?.groups?.find((g) => g.name === "Gemini Models")?.buckets?.[0];
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { ref: root, style: { width: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("style", { children: css }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("button", { className: "agy-quota-button", style: { width: "100%", textAlign: "left", padding: "10px 12px" }, title: "\u67E5\u770B agy \u771F\u5B9E\u5269\u4F59\u989D\u5EA6", "aria-label": "Agy \u989D\u5EA6", "aria-expanded": open, onClick: () => setOpen(!open), children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "agy-quota-icon", style: { fontSize: 26 }, children: "\u2726" }),
      wide && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { display: "grid", gap: 3 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: data?.status === "ok" ? "\u5DF2\u8FDE\u63A5 Agy" : "Agy" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { style: { fontSize: 11, opacity: 0.65 }, children: [
          "Gemini \u989D\u5EA6 ",
          primary ? percent(primary.remainingFraction) : loading ? "\u67E5\u8BE2\u4E2D" : "\u6682\u4E0D\u53EF\u7528"
        ] })
      ] })
    ] }),
    open && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("section", { ref: popup, className: "agy-quota-card", role: "dialog", "aria-label": "Agy \u989D\u5EA6\u8BE6\u60C5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: "Agy \u989D\u5EA6" }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { disabled: loading, onClick: () => void refresh(true), "aria-label": "\u5237\u65B0\u989D\u5EA6", children: loading ? "\u67E5\u8BE2\u4E2D" : "\u5237\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { onClick: () => setOpen(false), "aria-label": "\u5173\u95ED\u989D\u5EA6\u8BE6\u60C5", children: "\xD7" })
        ] })
      ] }),
      data?.groups?.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agy-quota-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("strong", { children: groupTitle(group.name) }),
        group.buckets.map((bucket, i) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agy-quota-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: title(bucket.name) }),
            /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("span", { children: [
              percent(bucket.remainingFraction),
              " \u5269\u4F59"
            ] })
          ] }),
          typeof bucket.remainingFraction === "number" && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agy-quota-track", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "agy-quota-bar", style: { width: Math.round(bucket.remainingFraction * 100) + "%" } }) }),
          bucket.resetTime && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agy-quota-note", children: [
            "\u91CD\u7F6E\u4E8E ",
            time(bucket.resetTime)
          ] })
        ] }, i))
      ] }, index)),
      !data?.groups?.length && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { children: loading ? "\u6B63\u5728\u67E5\u8BE2 agy \u989D\u5EA6\u2026" : data?.message ?? "\u5C1A\u672A\u53D6\u5F97\u989D\u5EA6\u6570\u636E" }),
      data?.stale && data.groups?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "agy-quota-note", children: data.message ?? "\u663E\u793A\u4E0A\u6B21\u6570\u636E" }),
      data?.fetchedAt && /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "agy-quota-note", children: [
        "\u66F4\u65B0\u4E8E ",
        time(data.fetchedAt)
      ] }),
      openSettings && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { style: { marginTop: 12, width: "100%", textAlign: "left" }, onClick: () => {
        setOpen(false);
        openSettings();
      }, children: "\u8BBE\u7F6E" })
    ] }), document.body)
  ] });
}
function apply(ctx) {
  ctx.effect(() => ctx.slots.inject("settings.launcher", () => {
    const runningBrand = installRunningBrand(document);
    const activity = createActivityClient(ctx, (snapshot) => runningBrand.setProgress(snapshot));
    const recovery = installRecovery(ctx, activity);
    let remove = null;
    const stop = observeQuotaVisibility(ctx, (visible) => {
      runningBrand.setActive(visible);
      activity.select(visible ? ctx.sidebarRight.mounted.getSnapshot() : null);
      if (visible) {
        remove ??= ctx.slots.register({ name: "settings.launcher", id: "agy-local-account", priority: -100 }, Footer);
      } else {
        remove?.();
        remove = null;
      }
    });
    return () => {
      stop();
      remove?.();
      recovery?.();
      activity.dispose();
      runningBrand.dispose();
    };
  }));
}

return module.exports;}});
