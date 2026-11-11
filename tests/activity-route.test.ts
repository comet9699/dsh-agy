import { it, expect, vi } from 'vitest';
// @ts-expect-error Private runtime module.
import { apply } from '../src/quota.mjs';
it('authenticates status reads, rejects writes and returns no conversation contents', async () => {
  const routes: any[] = []; let denial: number | undefined = 403;
  const get = vi.fn(() => ({ sessionId: 'one', turn: 2, stage: 'failed', failureCode: 'ACP_TIMEOUT' }));
  apply({ effect: (fn: any) => fn(), webServer: { register: (route: any) => { routes.push(route); return () => {}; } }, connection: { requestRejection: () => denial }, get: () => ({ get }), on: vi.fn(), agents: { roots: () => [] } }, { useSystemProxy: false, args: [] });
  const route = routes.find(r => r.path === '/agy-local/activity');
  async function request(method = 'GET', url = '/agy-local/activity?sessionId=one') {
    const res = { writeHead: vi.fn(), end: vi.fn() }; await route.handler({ method, url }, res); return res;
  }
  expect((await request()).writeHead.mock.calls[0]?.[0]).toBe(403); expect(get).not.toHaveBeenCalled();
  denial = undefined;
  expect((await request('POST')).writeHead.mock.calls[0]?.[0]).toBe(405); expect(get).not.toHaveBeenCalled();
  expect((await request('GET', '/agy-local/activity')).writeHead.mock.calls[0]?.[0]).toBe(400);
  const response = await request(); expect(response.writeHead.mock.calls[0]?.[0]).toBe(200);
  expect(JSON.parse(response.end.mock.calls[0]?.[0])).toEqual({ activity: { sessionId: 'one', turn: 2, stage: 'failed', failureCode: 'ACP_TIMEOUT' } });
});
