# Netcraft Agentic Security

Protect your AI workflows from phishing, malware, scams, and other malicious links with Netcraft’s trusted cybercrime intelligence.

Automatically check URLs found in prompts, investigate links on demand, and report suspicious sites, all without leaving your AI assistant. Backed by Netcraft’s extensive experience detecting and disrupting online threats, the plugin helps you make safer decisions before visiting, sharing, or acting on a link.

## Protection

| Surface | Claude Code | Cursor IDE |
| --- | --- | --- |
| User prompts | Blocks confirmed malicious URLs; unknown checks add warning context | Blocks confirmed malicious URLs; allowed prompts cannot display warnings |
| Tool arguments | `WebFetch`, `WebSearch`, `Bash`, `PowerShell`, `mcp__.*` | Shell commands and MCP arguments |
| Assistant display | Annotates malicious URL matches in each display batch | No response rewriting hook |
| Manual commands | Check and report skills | Check and report skills |

Tool hooks block confirmed malicious matches. Warnings and denials show the URL defanged (`hxxps://phishing[.]example`) so it cannot be clicked, and Claude's display annotation defangs the rendered URL too. They inspect literal HTTP(S) URLs and recognized bare domains, including nested MCP arguments. Direct `url` fields retain their full value. MCP coverage excludes server-side activity and tool results. Cursor CLI and cloud agents do not run every IDE hook.

CheckURL failures and resource limits **allow with unknown status**, and failed or skipped checks have explicit results. Claude receives warning context; Cursor shell/MCP hooks may display allow warnings, while allowed prompts cannot. Cursor tool hooks use `failClosed`, so a hook crash, missing runtime, or invalid output can block a benign operation.

Claude display annotation changes rendered text, not the model's transcript. Batches are independent: URLs split across batches may be missed or checked as partial strings.

## Install

### Prerequisites

Before you install, make sure you have **Node.js 22+** available on your PATH

### Claude Code

#### Add Netcraft's community marketplace (first time only):

```text
/plugin marketplace add netcraftcom/agentic-security-plugin
```

#### Install the plugin:

```text
/plugin install netcraft@netcraft-agentic-security-marketplace
```

#### Update the plugin:

```text
/plugin marketplace update netcraft-agentic-security-marketplace
/plugin update netcraft@netcraft-agentic-security-marketplace
```

### Cursor

You can install the Netcraft plugin from [Cursor Marketplace](https://cursor.com/marketplace) or directly from Cursor open **Customize → Plugins**, search for **Netcraft**, and select **Install**. Choose a project or user scope when prompted.

## Using Netcraft

### Automatic prompt checks

Include a URL in your prompt as you normally would:

```text
Summarise the documentation at https://example.com/docs.
```

Netcraft checks URLs in your prompts automatically. If a malicious URL is detected, it can warn you and block the assistant from accessing it. Warning and blocking support varies by app; see [Protection](#protection).

### Check a URL

The skill returns Netcraft's verdict for each URL, any available threat classification and supporting context, and a link to the Netcraft site report.

#### Ask the assistant to use the Netcraft check skill

You can prompt:

```text
Use Netcraft to check https://example.com and https://example.org.
```

#### Or you can invoke the skill directly

In Claude Code, you can enter:

```text
/netcraft:check https://example.com https://example.org
```

In Cursor, you can enter:
```text
/check https://example.com https://example.org
```

### Report a suspicious URL

The skill asks you to confirm the URLs and reason before submitting, then returns the submission result and tracking link. Automatic checks do not submit reports.

#### Ask the assistant to use the Netcraft report skill

You can prompt:

```text
Use Netcraft to report https://suspicious.example/login for impersonating our company login page.
```

#### Or you can invoke the skill directly

In Claude Code, you can enter:
```text
/netcraft:report https://suspicious.example/login --reason "Impersonates our company"
```

In Cursor, you can enter:
```text
/report https://suspicious.example/login --reason "Impersonates our company"
```

## Privacy

- Extraction and pattern matching happen locally. URL checks send only the **origin** (scheme, hostname, and port), not the path or query, to Netcraft's CheckURL service.
- User-confirmed reports send the full URLs and reason anonymously to Netcraft's reporting service, without an email address. If no reason is supplied, the plugin sends a default reason.
- There is no telemetry or full prompt/response logging. Origin results are cached locally.

## License

[MIT](LICENSE)
