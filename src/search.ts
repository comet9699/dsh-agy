/** Keyless public web search using Harness's search-provider seam. */
import type { Context } from '@deepseek-ai/cordis';
import { WebError, type WebSearchRequest, type WebSearchResult, type WebSearchSource } from '@deepseek-ai/dsh-web';
import z from '@deepseek-ai/schemastery';
import { fetch, Agent, ProxyAgent } from 'undici';
import { XMLParser, XMLValidator } from 'fast-xml-parser';
import { systemProxy } from './proxy.js';

export const name = 'web-search-agy';
export const inject = ['web'];
export const Config = z.object({ proxyUrl: z.string().default(''), useSystemProxy: z.boolean().default(true) });
type Options = { proxyUrl?: string; useSystemProxy?: boolean };
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
export function parseSearchRss(xml: string): WebSearchResult {
  if (xml.length > 2 * 1024 * 1024 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/^\s*(?:<\?xml[^?]*\?>\s*)?<rss[\s>]/i.test(xml) || XMLValidator.validate(xml) !== true)
    throw new WebError('搜索服务返回了非 RSS 页面，可能需要验证或稍后重试。', 'WEB_SEARCH_RESPONSE_INVALID');
  const parsed: unknown = new XMLParser({ ignoreAttributes: true, parseTagValue: false, processEntities: true }).parse(xml);
  if (record(parsed) && record(parsed.rss) && parsed.rss.channel === '') return { sources: [], truncated: false };
  if (!record(parsed) || !record(parsed.rss) || !record(parsed.rss.channel)) throw new WebError('搜索结果格式异常。', 'WEB_SEARCH_RESPONSE_INVALID');
  const raw = parsed.rss.channel.item;
  const items = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  const sources: WebSearchSource[] = [], seen = new Set<string>();
  const clean = (text: string) => text.replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 1800);
  for (const item of items) {
    if (!record(item) || typeof item.link !== 'string') continue;
    let url: URL; try { url = new URL(item.link); } catch { continue; }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || seen.has(url.href)) continue;
    seen.add(url.href);
    sources.push({ url: url.href, ...(typeof item.title === 'string' ? { title: clean(item.title) } : {}), ...(typeof item.description === 'string' ? { snippet: clean(item.description) } : {}) });
  }
  if (items.length && !sources.length) throw new WebError('搜索服务未返回可用的网页链接。', 'WEB_SEARCH_RESPONSE_INVALID');
  return { sources, truncated: false };
}
export class PublicSearchProvider {
  readonly id = 'agy-public-search';
  constructor(private options: Options = {}, private transport: typeof fetch = fetch) {}
  available(): boolean { return true; }
  async search(request: WebSearchRequest, signal?: AbortSignal): Promise<WebSearchResult> {
    if (!request.query.trim() || request.query.length > 2048) throw new WebError('搜索词为空或过长。', 'WEB_SEARCH_QUERY_INVALID');
    if (signal?.aborted) throw new WebError('搜索已取消。', 'ABORTED');
    const proxy = this.options.proxyUrl || (this.options.useSystemProxy !== false ? systemProxy() : undefined);
    if (proxy && !['http:', 'https:'].includes(new URL(proxy).protocol)) throw new WebError('搜索代理需使用 HTTP / Mixed 端口。', 'WEB_SEARCH_PROXY_INVALID');
    const dispatcher = proxy ? new ProxyAgent(proxy) : new Agent();
    const control = signal ? AbortSignal.any([signal, AbortSignal.timeout(25000)]) : AbortSignal.timeout(25000);
    try {
      const url = new URL('https://www.bing.com/search'); url.searchParams.set('format', 'rss'); url.searchParams.set('q', request.query);
      const response = await this.transport(url, { dispatcher, signal: control, redirect: 'error', headers: { accept: 'application/rss+xml, application/xml, text/xml' } });
      if (!response.ok || !response.body) { await response.body?.cancel(); throw new WebError('搜索服务响应异常（HTTP ' + response.status + '）。', 'WEB_PROVIDER_ERROR'); }
      const reader = response.body.getReader(); let bytes = 0; const chunks: Uint8Array[] = [];
      try { while (true) { const next = await reader.read(); if (next.done) break; bytes += next.value.length;
        if (bytes > 2 * 1024 * 1024) { await reader.cancel(); throw new WebError('搜索响应超过大小限制。', 'WEB_SEARCH_RESPONSE_LIMIT'); } chunks.push(next.value);
      } } finally { reader.releaseLock(); }
      return parseSearchRss(Buffer.concat(chunks).toString('utf8'));
    } catch (error) {
      if (signal?.aborted) throw new WebError('搜索已取消。', 'ABORTED');
      if (error instanceof WebError) throw error;
      throw new WebError('联网搜索未完成，请检查自己的代理和网络后重试；此搜索不需要 DeepSeek API Key。', 'WEB_PROVIDER_ERROR');
    } finally { await dispatcher.close(); }
  }
}
export function apply(ctx: Context, config: Options): void { ctx.web.registerSearchProvider(new PublicSearchProvider(config)); }
