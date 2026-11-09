import { describe, expect, it } from 'vitest';
import { parseSystemProxy } from '../src/proxy.js';
describe('read-only system proxy discovery', () => {
  it('uses an enabled shared HTTP endpoint', () => expect(parseSystemProxy('ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ 127.0.0.1:10808')).toBe('http://127.0.0.1:10808/'));
  it('selects the HTTPS endpoint from per-protocol settings', () => expect(parseSystemProxy('ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ http=127.0.0.1:1;https=127.0.0.1:2')).toBe('http://127.0.0.1:2/'));
  it('does not activate a disabled proxy', () => expect(parseSystemProxy('ProxyEnable REG_DWORD 0x0\nProxyServer REG_SZ 127.0.0.1:10808')).toBeUndefined());
  it('does not treat PAC-only settings as a fixed proxy', () => expect(parseSystemProxy('ProxyEnable REG_DWORD 0x1\nAutoConfigURL REG_SZ https://example.test/config.pac')).toBeUndefined());
  it('rejects unsupported proxy schemes', () => expect(parseSystemProxy('ProxyEnable REG_DWORD 0x1\nProxyServer REG_SZ file:///proxy')).toBeUndefined());
});
