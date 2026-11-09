# Third-party notices

## Upstream implementation

This repository is a derived work of **dannndouglas/dsh-antigravity-acp**, v0.3.4, commit `987fd7f60214e24d6b866776b50425387fc171b3`, licensed under MIT:

https://github.com/dannndouglas/dsh-antigravity-acp

The original MIT license and copyright notice remain in `LICENSE`. The upstream ACP provider, installer, transport and MCP bridging implementation are retained and adapted; this fork does **not** claim that those components were independently written here. Local adaptations include the 0.2.2-rc.1 target, quota UI, model/thinking-level handling, compaction guards, proxy integration and tool-catalog behavior described in the README.

## Bundled JavaScript

The prebuilt runtime bundles `@agentclientprotocol/sdk` (1.4.0), `@modelcontextprotocol/sdk` (1.32.2), `ajv` (8.20.0), `yauzl` (3.4.0), `undici` (7.29.1), `fast-xml-parser` (5.11.1), and their imported transitive JavaScript dependencies. The exact build dependency inventory is in `dist/third-party.json`. Their notices are retained in `dist/licenses/` and adjacent `*.LEGAL.txt` files. Official `@deepseek-ai/*` services remain external and are provided by the compatible host; they are not republished as a replacement Harness installation.

React is supplied by the host's browser module loader and is not bundled into the browser entry. The package contains no Google binary, user credentials, login directory, chat history or model API key.

Google Antigravity/agy and its server are governed by their own licenses and terms. Google, Gemini and DeepSeek names identify integrations; this is an independent community fork and does not imply endorsement.
