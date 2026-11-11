# Local configuration / 本机配置

Use Harness's plugin settings. A profile config override replaces the row's config, so copy the complete provider example rather than only its command field. If using a profile patch, the example below applies to **your own** active profile's `cordis.patch.yml`. Replace the example path; it is not an installation location supplied by the package.

```yaml
- id: llm-agy-local-acp
  config:
    provider: agy-local-acp
    mcpTransport: stdio
    acpToolMetadata: agy-title
    maxSessionsPerProcess: 8
    command: C:/Tools/agy/agy.exe
    args: [acp]
    autoInstall: false
    useSystemProxy: true
- id: agy-quota
  config:
    command: C:/Tools/agy/agy.exe
    args: [acp]
    useSystemProxy: true
```

Custom agy login directory / 已有自定义登录目录：

```yaml
    args: [acp, --gemini_dir, C:/MyAgyData, --app_data_dir, antigravity-cli]
```

Point this only at your own account. Do not copy the author's `.dsh` or Gemini data directory. To locate agy, use `where agy` on Windows, or select the executable directly in your installation folder. `AGY_ACP_BIN` is also an explicit executable override supported by the provider. The quota component still needs its own executable setting.

`proxyUrl`, if supplied, overrides system-proxy discovery for the child. Do not put proxy passwords or subscription URLs in public issues. Blank `proxyUrl` uses existing settings; it does not disable your system proxy.

## Version compatibility

This release declares exactly Harness `0.2.2-rc.1`. Do not bypass compatibility checks to install on a different host. A newer release should be validated in an isolated profile first.

## Optional diagnostics

The CLI is a Node.js diagnostic helper and requires matching official peer packages. It does not automatically download agy. Pass your executable and ACP args explicitly:

```text
node dist/cli.js doctor --command C:/Tools/agy/agy.exe --arg acp
```

`doctor`/`status` discover the server without generating a model answer; `probe` consumes account quota. Browser sign-in is managed by agy. Never send verification codes to a plugin author.

The beta.2 bundle uses a distinct MCP server name and authenticated endpoint for every turn, allowing up to 8 fresh native sessions per process. Set `maxSessionsPerProcess: 1` to retain the earlier recycle-every-turn behavior if your agy version cannot handle scoped MCP names. Completed conversations are still reconstructed from Harness history, and errors/cancellation discard the child.

Waiting stages and explicit continuation use the existing `agy-quota` web component and client entry. If that component is disabled, the ordinary Harness conversation and model selector remain available, but the extra status/recovery interface is unavailable. The authenticated status endpoint is read-only and exposes only opaque session ID, turn number, stage, timestamps and a whitelisted error code. It contains no prompts, tool arguments or login data.
