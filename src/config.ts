import z from '@deepseek-ai/schemastery';
import { fileURLToPath } from 'node:url';
export interface Config {
  provider: string;
  command: string;
  proxyUrl: string;
  useSystemProxy: boolean;
  autoInstall: boolean;
  installTimeoutMs: number;
  args: string[];
  auth: 'oauth-personal';
  defaultModel: string;
  models: string[];
  catalogRefreshMs: number;
  toolPolicy: 'bridge' | 'text-only' | 'reject';
  mcpTransport: 'http' | 'stdio';
  stdioForwarder: string;
  acpToolMetadata: 'structured' | 'agy-title';
  toolTimeoutMs: number;
  maxActiveToolSessions: number;
  idleProcessTimeoutMs: number;
  timeoutMs: number;
  requestTimeoutMs: number;
  authTimeoutMs: number;
  cancelGraceMs: number;
  disposeGraceMs: number;
  maxSessionsPerProcess: number;
}
export const Config: z<Config> = z.object({
  provider: z.string().default('antigravity-acp'),
  command: z.string().default(''),
  proxyUrl: z.string().default(''),
  useSystemProxy: z.boolean().default(true),
  autoInstall: z.boolean().default(true),
  installTimeoutMs: z.natural().default(180000),
  args: z.array(z.string()).default([]),
  auth: z.const('oauth-personal').default('oauth-personal'),
  defaultModel: z.string().default(''),
  models: z.array(z.string()).default([]),
  catalogRefreshMs: z.natural().default(60000),
  toolPolicy: z.union(['bridge', 'text-only', 'reject'] as const).default('bridge'),
  mcpTransport: z.union(['http', 'stdio'] as const).default('http'),
  stdioForwarder: z.string().default(fileURLToPath(new URL('./mcp/stdio-forwarder.js', import.meta.url))),
  acpToolMetadata: z.union(['structured', 'agy-title'] as const).default('structured'),
  toolTimeoutMs: z.natural().default(900000),
  maxActiveToolSessions: z.natural().default(16),
  idleProcessTimeoutMs: z.natural().default(300000),
  timeoutMs: z.natural().default(600000),
  requestTimeoutMs: z.natural().default(30000),
  authTimeoutMs: z.natural().default(600000),
  cancelGraceMs: z.natural().default(1500),
  disposeGraceMs: z.natural().default(3000),
  maxSessionsPerProcess: z.natural().default(100),
});
export function resolveConfig(input: Partial<Config> = {}): Config {
  const config = Config(input as Config);
  if (!config.provider.trim()) throw new Error('provider must not be empty');
  if (config.proxyUrl) {
    const proxy = new URL(config.proxyUrl);
    if (!['http:', 'https:'].includes(proxy.protocol)) throw new Error('proxyUrl must use HTTP or HTTPS');
  }
  for (const key of [
    'installTimeoutMs',
    'catalogRefreshMs',
    'timeoutMs',
    'requestTimeoutMs',
    'authTimeoutMs',
    'cancelGraceMs',
    'disposeGraceMs',
    'maxSessionsPerProcess',
    'toolTimeoutMs',
    'maxActiveToolSessions',
    'idleProcessTimeoutMs',
  ] as const) {
    if (!Number.isSafeInteger(config[key]) || config[key] <= 0 || config[key] > 2147483647)
      throw new Error(`${key} must be a positive integer <= 2147483647`);
  }
  return config;
}
