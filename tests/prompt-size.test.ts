import { expect, it } from 'vitest';
import { buildPrompt } from '../src/prompt.js';
import { resolveConfig } from '../src/config.js';

it('keeps complete conversation text while avoiding a second copy of MCP schemas', () => {
  const options = { provider: 'antigravity-acp', model: 'fake-model', messages: [{ role: 'user' as const, content: [{ type: 'text' as const, text: 'KEEP_MY_CONTEXT' }] }], tools: [{ name: 'read_file', description: 'LONG_SCHEMA_DESCRIPTION'.repeat(500), parameters: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } }] };
  const prompt = buildPrompt(options, resolveConfig(), false, 'dsh-bridge-abcdef123456');
  expect(prompt).toContain('KEEP_MY_CONTEXT');
  expect(prompt).toContain('dsh-bridge-abcdef123456');
  expect(prompt).toContain('read_file');
  expect(prompt).not.toContain('LONG_SCHEMA_DESCRIPTION');
  expect(prompt.length).toBeLessThan(3000);
  expect(options.tools[0]!.parameters.required).toEqual(['path']);
});
