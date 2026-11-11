# dsh-agy

Community **local agy ACP provider for DeepSeek Harness 0.2.2-rc.1**. Uses the locally installed agy CLI and the user's own Google sign-in; this plugin does not require a model API key.

**Beta.** Verified on Windows x64 with agy 1.5.0 and official Harness 0.2.2-rc.1. Other host versions and operating systems are not qualified. Argon requests have occasionally exceeded the configured generation timeout; Flash is the better-tested everyday route. This is not an official Google or DeepSeek product.

[中文说明](README.zh-CN.md)

Observed waiting stages distinguish local connection, upstream-model waiting and tool-result waiting. For a tracked timeout/disconnect, the selected turn offers explicit continuation or Flash selection followed by continuation through Harness's existing APIs. There is no automatic retry; the continuation asks the model to inspect prior results before acting. This does not remove upstream latency. Stage facts are ephemeral; see [limitations](docs/limitations.md).

## Install

In Harness **Plugins → Add plugin**, enter the repository URL:

```text
https://github.com/comet9699/dsh-agy
```

For a terminal installation into your own active profile:

```text
dsh plugin --profile desktop add git+https://github.com/comet9699/dsh-agy.git#main
```

The JavaScript runtime is prebuilt; installation does not run a build script or download agy. Existing users of `dsh-agy-local-acp` should disable or remove that fork before enabling this package: both register the `agy-local-acp` provider.

## Configure your own agy installation

1. Install agy from its official source and sign in with **your own** Google account. Keep any browser verification code on your own computer; it is never part of this package.
2. In the plugin's `llm-agy-local-acp` settings, set `command` to your agy executable's full path, and `args` to `["acp"]`. If your agy uses a custom login directory, add its existing `--gemini_dir` and `--app_data_dir` arguments. Do not point at somebody else's account directory.
3. Set the same `command` and `args` on the `agy-quota` entry for the optional quota view. Leave quota disabled if not needed.
4. Restart Harness to load the provider, then choose an announced Agy model. Models and thinking levels are separate selectors. New chats default to Agy; saved chat selections retain precedence, and you can choose DeepSeek in its normal model picker.

See [configuration examples](docs/configuration.md). No account files, credentials, agy executable, proxy subscription, or local paths are shipped. Fixed Windows system-proxy settings are read for child processes; this plugin does not change global proxy settings. PAC-only or other operating-system setups can use explicit `proxyUrl` or their existing environment.

## What this fork adds

Based on [dannndouglas/dsh-antigravity-acp](https://github.com/dannndouglas/dsh-antigravity-acp), upstream v0.3.4, commit `987fd7f60214e24d6b866776b50425387fc171b3`, under MIT. Original notices are retained.

- Harness **0.2.2-rc.1** peer declarations and compaction wiring across its task presets.
- Local agy family-model selection with a separate thinking-level selector and catalog refresh on host catalog requests.
- Agy quota/account UI that follows the selected provider.
- Standard MCP stdio forwarding to Harness-owned tools, without the fork's former arbitrary 256-tool catalog cap. Per-tool schema validation and Harness permissions remain in force.
- Compaction rejects standalone quota warnings instead of storing them as summaries; failed compaction keeps the prior context.
- Windows fixed-system-proxy discovery for the child process and a pinned, prebuilt runtime.

This package extends the provider path; it does not replace Harness's browser, file editor, sessions, approvals, or plugin manager. See [limitations](docs/limitations.md) and [third-party notices](THIRD_PARTY_NOTICES.md).

## Development

Node.js >=22.19 is required. `npm install`, then `npm run check`. Source is in `src/`; `scripts/build.mjs` bundles third-party JavaScript while keeping the official Harness services external. The checked-in `dist/` is installable without development dependencies. Model access depends on the local agy catalog and the signed-in account's permissions.

License: MIT. Google/DeepSeek names identify integrations and do not imply endorsement.
