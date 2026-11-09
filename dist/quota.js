import {createRequire as __agyCreateRequire} from 'node:module'; const require=__agyCreateRequire(import.meta.url);

// src/quota.mjs
import z from "@deepseek-ai/schemastery";

// src/quota-core.mjs
import { execFile } from "node:child_process";
function parseQuota(output) {
  const start = output.indexOf("{");
  if (start < 0) throw Error("Invalid quota response");
  const parsed = JSON.parse(output.slice(start)), data = parsed.command?.data ?? parsed;
  if (!Array.isArray(data.groups)) throw Error("Missing quota groups");
  const groups = data.groups.filter((g) => g && typeof g === "object").map((g) => ({ name: typeof g.name === "string" ? g.name : "Models", buckets: (Array.isArray(g.buckets) ? g.buckets : []).filter((b) => b && typeof b === "object").map((b) => ({
    name: typeof b.name === "string" ? b.name : "\u989D\u5EA6",
    remainingFraction: typeof b.remaining_fraction === "number" && Number.isFinite(b.remaining_fraction) && b.remaining_fraction >= 0 && b.remaining_fraction <= 1 ? b.remaining_fraction : null,
    resetTime: typeof b.reset_time === "string" && Number.isFinite(Date.parse(b.reset_time)) ? b.reset_time : null
  })) })).filter((g) => g.buckets.length);
  if (!groups.length) throw Error("Empty quota groups");
  return { groups, fetchedAt: Date.now(), status: "ok", stale: false };
}
function quotaArgs(acpArgs) {
  const result = [];
  for (let i = 0; i < acpArgs.length; i++) {
    const value = acpArgs[i];
    if (/^--(?:gemini[_-]dir|app[_-]data[_-]dir)=/.test(value)) result.push(value);
    else if (/^--(?:gemini[_-]dir|app[_-]data[_-]dir)$/.test(value) && typeof acpArgs[i + 1] === "string") result.push(value + "=" + acpArgs[++i]);
  }
  return [...result, "--output-format", "json", "-p=/usage"];
}
var QuotaReader = class {
  constructor({ command, args, env, busy = () => false, run, clock = Date.now }) {
    this.options = { command, args, env, busy, run, clock };
    this.cache = null;
    this.flight = null;
    this.controller = null;
    this.lastAttempt = 0;
    this.disposed = false;
  }
  async get(force = false) {
    const { clock, busy } = this.options, now = clock();
    if (this.disposed) return this.fallback("\u989D\u5EA6\u670D\u52A1\u5DF2\u5173\u95ED\u3002");
    if (busy()) return this.fallback("\u4EFB\u52A1\u8FDB\u884C\u4E2D\uFF0C\u6682\u65F6\u663E\u793A\u4E0A\u6B21\u989D\u5EA6\uFF1B\u7A7A\u95F2\u540E\u5237\u65B0\u3002");
    if (this.flight) return this.flight;
    if (this.cache && (now - this.cache.fetchedAt < 6e4 && !force || now - this.lastAttempt < 1e4)) return this.cache;
    if (!this.cache && now - this.lastAttempt < 1e4) return this.fallback("\u8BF7\u7A0D\u540E\u518D\u5237\u65B0\u989D\u5EA6\u3002");
    this.lastAttempt = now;
    this.controller = new AbortController();
    this.flight = this.read(this.controller.signal).then((result) => {
      this.cache = result;
      return result;
    }, () => this.fallback("\u989D\u5EA6\u5237\u65B0\u6682\u672A\u5B8C\u6210\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\uFF1B\u5FC5\u8981\u65F6\u68C0\u67E5\u767B\u5F55\u548C\u4EE3\u7406\u3002"));
    try {
      return await this.flight;
    } finally {
      this.flight = null;
      this.controller = null;
    }
  }
  fallback(message) {
    return this.cache ? { ...this.cache, stale: true, message } : { status: "unavailable", groups: [], fetchedAt: null, stale: true, message };
  }
  async read(signal) {
    const { command, args, env, run, clock } = this.options;
    const stdout = run ? await run(signal) : await new Promise((resolve, reject) => execFile(command, quotaArgs(args), { windowsHide: true, env, timeout: 18e3, maxBuffer: 1024 * 1024, signal }, (error, stdout2) => error ? reject(error) : resolve(stdout2)));
    if (signal.aborted) throw Error("cancelled");
    const snapshot = parseQuota(stdout);
    snapshot.fetchedAt = clock();
    return snapshot;
  }
  interrupt() {
    this.controller?.abort();
  }
  async dispose() {
    this.disposed = true;
    this.interrupt();
    await this.flight;
  }
};

// src/proxy.ts
import { execFileSync } from "node:child_process";
function parseSystemProxy(output) {
  if (!/^\s*ProxyEnable\s+REG_DWORD\s+0x1\s*$/imu.test(output)) return void 0;
  const value = /^\s*ProxyServer\s+REG_SZ\s+(.+)$/imu.exec(output)?.[1]?.trim();
  if (!value) return void 0;
  const endpoint = value.includes("=") ? /(?:^|;)\s*https=([^;]+)/iu.exec(value)?.[1]?.trim() ?? /(?:^|;)\s*http=([^;]+)/iu.exec(value)?.[1]?.trim() : value;
  if (!endpoint) return void 0;
  try {
    const url = new URL(endpoint.includes("://") ? endpoint : `http://${endpoint}`);
    return ["http:", "https:"].includes(url.protocol) ? url.href : void 0;
  } catch (error) {
    return void 0;
  }
}
function systemProxy() {
  if (process.platform !== "win32") return void 0;
  try {
    return parseSystemProxy(execFileSync(
      "reg.exe",
      ["query", "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings"],
      { encoding: "utf8", windowsHide: true, timeout: 3e3, stdio: ["ignore", "pipe", "ignore"] }
    ));
  } catch (error) {
    return void 0;
  }
}

// src/quota.mjs
var name = "agy-quota";
var inject = ["webServer", "connection", "agents"];
var Config = z.object({ command: z.string().default(""), args: z.array(z.string()).default([]), proxyUrl: z.string().default(""), useSystemProxy: z.boolean().default(true) });
function apply(ctx, config) {
  const proxy = config.proxyUrl || (config.useSystemProxy !== false ? systemProxy() : void 0);
  const env = { ...process.env, ...proxy ? { HTTP_PROXY: proxy, HTTPS_PROXY: proxy, NO_PROXY: "127.0.0.1,localhost,::1" } : {} };
  for (const key of Object.keys(env)) if (/^ANTIGRAVITY_(AGENT|CONVERSATION_ID|LS_ADDRESS|CSRF_TOKEN|TRAJECTORY_ID|SOURCE_METADATA|CLI_ALIAS)$/.test(key)) delete env[key];
  const reader = new QuotaReader({ command: config.command, args: config.args, env, busy: () => ctx.agents.roots().some((a) => a.status === "running") });
  ctx.on("session/event", (_session, event) => {
    if (event.type === "turn/start") reader.interrupt();
  });
  ctx.effect(() => () => reader.dispose());
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path: "/agy-local/quota", handler: async (req, res) => {
    const write = (status, data) => {
      res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" });
      res.end(JSON.stringify(data));
    };
    const rejection = ctx.connection.requestRejection(req);
    if (rejection !== void 0) {
      write(rejection, { status: "forbidden" });
      return;
    }
    if (req.method !== "GET") {
      write(405, { status: "method-not-allowed" });
      return;
    }
    const force = new URL(req.url ?? "/", "http://dsh.internal").searchParams.get("refresh") === "1";
    try {
      write(200, await reader.get(force));
    } catch {
      write(200, { status: "unavailable", groups: [], stale: true, message: "\u989D\u5EA6\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5\u3002" });
    }
  } }));
}
export {
  Config,
  apply,
  inject,
  name
};
