# Changelog

## 0.1.0-beta.3

- Show observed ACP/MCP stages beside the official elapsed clock: preparing, connecting, opening a session, selecting a model, waiting for the model, processing a response and waiting for tool results. This is not a completion percentage.
- Offer explicit continuation or Flash selection followed by continuation for a tracked timeout/disconnect on the selected finished turn. Reuse Harness model selection and session submission; never retry automatically or replay tool calls.
- Check the current session, turn, provider and busy state before continuation. Block duplicate clicks and ambiguous resubmissions within the current browser lifetime. Ask the model to inspect prior results before continuing work.
- Expose only authenticated, read-only temporary stage facts. Stop polling for background tabs and idle sessions. Facts expire after one hour and are not restored after server restart; official conversation history is unchanged.

Validation: 162 regression tests, TypeScript checking, build and package/private-path checks; two isolated official Harness browser flows with controlled timeout injection followed by real local-agy Flash generation. Both continuation paths returned the expected answer without browser errors. Verified on Windows x64, Harness 0.2.2-rc.1 and agy 1.5.0.

Known limits: upstream Argon latency remains unresolved; recovery is not a guarantee against all model side effects or duplicate actions. Stage/recovery UI needs the existing `agy-quota` web component. No new overnight stability or arbitrary third-party plugin compatibility claim is made.

## 0.1.0-beta.2

- Remove redundant tool-schema prose from the prompt while retaining the authenticated MCP tool schemas.
- Scope MCP server names and endpoints per turn and reuse a healthy native process for up to eight fresh sessions. Recycle on failure/cancellation or the session limit.
- Preserve Harness-owned conversation history and permissions. Small read-only benchmarks improved; upstream latency and startup overhead remain.
