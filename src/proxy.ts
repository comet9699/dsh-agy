/** Read Windows' enabled fixed proxy without changing user or system settings. */
import { execFileSync } from 'node:child_process';
export function parseSystemProxy(output: string): string | undefined {
  if (!/^\s*ProxyEnable\s+REG_DWORD\s+0x1\s*$/imu.test(output)) return undefined;
  const value = /^\s*ProxyServer\s+REG_SZ\s+(.+)$/imu.exec(output)?.[1]?.trim();
  if (!value) return undefined;
  const endpoint = value.includes('=') ? /(?:^|;)\s*https=([^;]+)/iu.exec(value)?.[1]?.trim()
    ?? /(?:^|;)\s*http=([^;]+)/iu.exec(value)?.[1]?.trim() : value;
  if (!endpoint) return undefined;
  try { const url = new URL(endpoint.includes('://') ? endpoint : `http://${endpoint}`);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch (error) { return undefined; /* A malformed proxy is not a valid routing instruction. */ }
}
export function systemProxy(): string | undefined {
  if (process.platform !== 'win32') return undefined;
  try { return parseSystemProxy(execFileSync('reg.exe', ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings'],
    { encoding: 'utf8', windowsHide: true, timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch (error) { return undefined; /* Explicit proxy configuration remains available. */ }
}
