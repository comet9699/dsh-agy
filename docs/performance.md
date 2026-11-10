# beta.2 performance check

The beta.2 provider avoids a second copy of tool descriptions and argument schemas in the conversation prompt. The full schemas remain available through MCP. It gives each fresh native session a separate MCP server name and authenticated endpoint, allowing healthy completed processes to serve up to 8 sessions without reusing a previous turn's tool binding. Error/cancellation cleanup and Harness-owned history are retained.

In one alternating comparison on Windows x64 with Harness 0.2.2-rc.1, local agy 1.5.0 and Flash low, both versions read the same newly generated file in each of three rounds. Every answer was checked against its random marker and an actual Harness `read` call.

| Round | Previous implementation | beta.2 |
|---|---:|---:|
| 1 | 10.696 s | 9.453 s |
| 2 | 22.169 s | 8.048 s |
| 3 | 13.311 s | 8.856 s |
| Mean | 15.392 s | 8.786 s |

This small sample showed about 43% less end-to-end waiting. It is not a latency guarantee or a broad model benchmark. Initial request text was about 40 KB previously and 10 KB after removing the duplicated catalog; this is a byte measurement, not billable-token usage. Completed-process starts across the three rounds were 3 versus 1. Model generation, network variation and long histories still contribute to latency.

`maxSessionsPerProcess: 1` remains available as a compatibility fallback. Reuse is bounded; it does not reuse another chat's history or share its active tool endpoint.
