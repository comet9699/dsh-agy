/** Local test adaptation: expose the authenticated loopback bridge over MCP stdio. */
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const rawUrl = process.env.DSH_ACP_BRIDGE_URL;
const auth = process.env.DSH_ACP_BRIDGE_AUTH;
delete process.env.DSH_ACP_BRIDGE_URL;
delete process.env.DSH_ACP_BRIDGE_AUTH;
if (!rawUrl || !auth) throw new Error('Missing private bridge environment.');
const url = new URL(rawUrl);
if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' || url.pathname !== '/mcp' || url.username || url.password)
  throw new Error('The bridge must be the private loopback MCP endpoint.');
const client = new Client({ name: 'agy-local-stdio-forwarder', version: '0.1.0' });
const server = new Server({ name: 'dsh-bridge', version: '0.1.0' }, { capabilities: { tools: {} } });
let closing: Promise<void> | undefined;
const close = () => closing ??= (async () => { await server.close(); await client.close(); })();
server.setRequestHandler(ListToolsRequestSchema, (request, extra) => client.listTools(request.params, { signal: extra.signal }));
server.setRequestHandler(CallToolRequestSchema, (request, extra) => client.callTool(request.params, undefined, { signal: extra.signal }));
process.stdin.once('end', () => { void close().catch(() => { process.exitCode = 1; }); });
process.once('SIGTERM', () => { void close().catch(() => { process.exitCode = 1; }); });
try {
  await client.connect(new StreamableHTTPClientTransport(url, { requestInit: { headers: { Authorization: auth } } }));
  await server.connect(new StdioServerTransport());
} catch (error) {
  await close();
  // Endpoint and authentication are intentionally excluded from diagnostics.
  console.error('Private MCP stdio bridge failed.');
  process.exitCode = 1;
}
