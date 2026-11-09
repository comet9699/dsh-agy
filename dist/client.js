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
var import_react = __toESM(require("react"), 1);
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
function installRunningBrand(doc) {
  const style = doc.createElement("style");
  style.textContent = `[data-agy-running-brand]{display:none}html[data-agy-provider-active] [data-agy-running-original]{display:none!important}html[data-agy-provider-active] [data-agy-running-brand]{display:inline-flex;align-items:center;gap:9px;font-size:14px} [data-agy-running-brand] svg{width:24px;height:24px;flex:none;animation:agy-working-breathe 2.8s ease-in-out infinite;transform-origin:center}@keyframes agy-working-breathe{0%,100%{opacity:.65;transform:scale(.92)}50%{opacity:1;transform:scale(1.06)}}@media(prefers-reduced-motion:reduce){[data-agy-running-brand] svg{animation:none}}`;
  doc.head.append(style);
  let id = 0;
  const rows = /* @__PURE__ */ new Map();
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
      const value = workingLabel(original.textContent ?? "");
      if (label.textContent !== value) label.textContent = value;
    };
    const observer2 = new doc.defaultView.MutationObserver(sync);
    observer2.observe(original, { childList: true, subtree: true, characterData: true });
    sync();
    rows.set(row, () => {
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
  }, dispose: () => {
    observer.disconnect();
    rows.forEach((remove) => remove());
    rows.clear();
    style.remove();
    doc.documentElement.removeAttribute("data-agy-provider-active");
  } };
}

// src/quota-client.jsx
var import_jsx_runtime = require("react/jsx-runtime");
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
  const [data, setData] = (0, import_react.useState)(null), [open, setOpen] = (0, import_react.useState)(false), [loading, setLoading] = (0, import_react.useState)(false);
  const root = (0, import_react.useRef)(null), popup = (0, import_react.useRef)(null), active = (0, import_react.useRef)(null), mounted = (0, import_react.useRef)(true);
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
  (0, import_react.useEffect)(() => {
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
  (0, import_react.useEffect)(() => {
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
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { ref: root, style: { width: "100%" }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("style", { children: css }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", { className: "agy-quota-button", style: { width: "100%", textAlign: "left", padding: "10px 12px" }, title: "\u67E5\u770B agy \u771F\u5B9E\u5269\u4F59\u989D\u5EA6", "aria-label": "Agy \u989D\u5EA6", "aria-expanded": open, onClick: () => setOpen(!open), children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "agy-quota-icon", style: { fontSize: 26 }, children: "\u2726" }),
      wide && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { display: "grid", gap: 3 }, children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: data?.status === "ok" ? "\u5DF2\u8FDE\u63A5 Agy" : "Agy" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { style: { fontSize: 11, opacity: 0.65 }, children: [
          "Gemini \u989D\u5EA6 ",
          primary ? percent(primary.remainingFraction) : loading ? "\u67E5\u8BE2\u4E2D" : "\u6682\u4E0D\u53EF\u7528"
        ] })
      ] })
    ] }),
    open && (0, import_react_dom.createPortal)(/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", { ref: popup, className: "agy-quota-card", role: "dialog", "aria-label": "Agy \u989D\u5EA6\u8BE6\u60C5", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Agy \u989D\u5EA6" }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { disabled: loading, onClick: () => void refresh(true), "aria-label": "\u5237\u65B0\u989D\u5EA6", children: loading ? "\u67E5\u8BE2\u4E2D" : "\u5237\u65B0" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { onClick: () => setOpen(false), "aria-label": "\u5173\u95ED\u989D\u5EA6\u8BE6\u60C5", children: "\xD7" })
        ] })
      ] }),
      data?.groups?.map((group, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agy-quota-group", children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("strong", { children: groupTitle(group.name) }),
        group.buckets.map((bucket, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agy-quota-row", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: title(bucket.name) }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
              percent(bucket.remainingFraction),
              " \u5269\u4F59"
            ] })
          ] }),
          typeof bucket.remainingFraction === "number" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agy-quota-track", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "agy-quota-bar", style: { width: Math.round(bucket.remainingFraction * 100) + "%" } }) }),
          bucket.resetTime && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agy-quota-note", children: [
            "\u91CD\u7F6E\u4E8E ",
            time(bucket.resetTime)
          ] })
        ] }, i))
      ] }, index)),
      !data?.groups?.length && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { children: loading ? "\u6B63\u5728\u67E5\u8BE2 agy \u989D\u5EA6\u2026" : data?.message ?? "\u5C1A\u672A\u53D6\u5F97\u989D\u5EA6\u6570\u636E" }),
      data?.stale && data.groups?.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", { className: "agy-quota-note", children: data.message ?? "\u663E\u793A\u4E0A\u6B21\u6570\u636E" }),
      data?.fetchedAt && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "agy-quota-note", children: [
        "\u66F4\u65B0\u4E8E ",
        time(data.fetchedAt)
      ] }),
      openSettings && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { style: { marginTop: 12, width: "100%", textAlign: "left" }, onClick: () => {
        setOpen(false);
        openSettings();
      }, children: "\u8BBE\u7F6E" })
    ] }), document.body)
  ] });
}
function apply(ctx) {
  ctx.effect(() => ctx.slots.inject("settings.launcher", () => {
    const runningBrand = installRunningBrand(document);
    let remove = null;
    const stop = observeQuotaVisibility(ctx, (visible) => {
      runningBrand.setActive(visible);
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
      runningBrand.dispose();
    };
  }));
}

return module.exports;}});
