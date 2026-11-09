# dsh-agy

把本机 **agy CLI** 接入官方 **DeepSeek Harness 0.2.2-rc.1** 的社区模型插件。使用用户自己的 Google 登录，不需要模型 API Key。

当前为测试版，实测环境是 Windows x64、agy 1.5.0、Harness 0.2.2-rc.1。其他版本和操作系统尚未验证。Argon 曾出现生成等待超时，日常建议优先选择 Flash。它不是 Google 或 DeepSeek 官方插件。

## 安装

在 Harness 的“插件 → 添加插件”中填写仓库链接：

```text
https://github.com/comet9699/dsh-agy
```

仓库包含已经构建好的 JavaScript，不需要自行编译。终端安装时，使用你自己的活动 profile：

```text
dsh plugin --profile desktop add git+https://github.com/comet9699/dsh-agy.git#main
```

安装不会执行构建脚本，不会替你下载 agy。原来装过 `dsh-agy-local-acp` 的用户，请先停用或移除旧包，避免两个插件同时注册同一模型提供方。

## 连接你自己的账号

1. 自行从官方来源安装 agy，并使用自己的 Google 账号登录。浏览器登录流程如要求输入验证码，应在自己电脑上完成。
2. 在本插件 `llm-agy-local-acp` 组件中，把 `command` 设为本机 agy 程序的完整路径，`args` 设为 `["acp"]`。使用自定义登录目录时，追加你原来已有的 `--gemini_dir` 和 `--app_data_dir` 参数。
3. 如果要显示额度，在 `agy-quota` 组件中填写相同的程序路径与参数；不需要额度时可关闭该组件。
4. 重启 Harness，从原有模型选择器中选择 Agy 模型，再选择独立的思考档位。新建会话默认使用 Agy，已有会话保留已保存的模型，也可以正常切回 DeepSeek。

配置示例见 [configuration.md](docs/configuration.md)。插件不包含作者账号、登录目录、聊天、代理订阅或 agy 程序。Windows 上可读取已启用的固定系统代理供子进程使用，不改系统代理设置；PAC 和其他系统可自行填写 `proxyUrl` 或使用既有环境配置。

## 改进与来源

本项目是 [dannndouglas/dsh-antigravity-acp](https://github.com/dannndouglas/dsh-antigravity-acp) v0.3.4 的 MIT 许可衍生版本，保留原作者署名。主要增加 Harness 0.2.2-rc.1 适配、各任务模式的压缩接入、本地 agy 模型与独立档位、额度界面、模型目录刷新，以及移除旧分叉的 256 工具数量硬限制。

文件、浏览器、权限审批、会话和插件管理沿用 Harness 原有功能。没有改写 DeepSeek 本体，也不保证每个第三方插件的 AI 功能都支持 Agy。能力与额度以本机 agy 和账号实际返回为准。

已知限制见 [limitations.md](docs/limitations.md)，开源许可见 [LICENSE](LICENSE)，第三方说明见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
