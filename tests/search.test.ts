import { describe, it, expect } from 'vitest';
import { Context } from '@deepseek-ai/cordis';
import WebRuntime from '@deepseek-ai/dsh-web';
import { parseSearchRss, PublicSearchProvider, apply } from '../src/search.js';
const rss = '<rss><channel><item><title>Python docs</title><link>https://docs.python.org/3/</link><description>Official documentation</description></item></channel></rss>';
describe('keyless public search', () => {
  it('normalizes actual source links and snippets without a model API key', () => {
    expect(parseSearchRss(rss).sources).toEqual([{ url: 'https://docs.python.org/3/', title: 'Python docs', snippet: 'Official documentation' }]);
  });
  it.each(['<html>captcha</html>', '<rss><channel>', '<!DOCTYPE rss><rss><channel/></rss>'])('rejects blocked or malformed responses: %s', xml => {
    expect(() => parseSearchRss(xml)).toThrow();
  });
  it('drops non-web and duplicate URLs', () => {
    const xml = rss.replace('</channel>', '<item><link>javascript:alert(1)</link></item><item><link>https://docs.python.org/3/</link></item></channel>');
    expect(parseSearchRss(xml).sources).toHaveLength(1);
  });
  it('distinguishes valid empty results from invalid responses', () => {
    expect(parseSearchRss('<rss><channel/></rss>')).toEqual({ sources: [], truncated: false });
  });
  it('honors cancellation before any network access', async () => {
    const control = new AbortController(); control.abort();
    await expect(new PublicSearchProvider().search({ query: 'test' }, control.signal)).rejects.toMatchObject({ code: 'ABORTED' });
  });
  it('rejects empty queries before network access', async () => {
    await expect(new PublicSearchProvider().search({ query: ' ' })).rejects.toMatchObject({ code: 'WEB_SEARCH_QUERY_INVALID' });
  });
  it('registers through the official provider seam and unregisters on disposal', async () => {
    const ctx = new Context();
    try { await ctx.plugin(WebRuntime, { searchProvider: 'agy-public-search' }); const fiber = await ctx.plugin({ apply, inject: ['web'] }, { useSystemProxy: false });
      await expect(ctx.web.search({ query: ' ' })).rejects.toMatchObject({ code: 'WEB_SEARCH_QUERY_INVALID' });
      await fiber.dispose();
      await expect(ctx.web.search({ query: 'test' })).rejects.toMatchObject({ code: 'WEB_PROVIDER_CONFIGURED_MISSING' });
    } finally { await ctx.fiber.dispose(); }
  });
});
