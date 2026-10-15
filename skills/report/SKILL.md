---
name: report
description: Report suspicious or malicious URLs to Netcraft for investigation and takedown.
---

# Netcraft URL Report

Report suspicious URLs to Netcraft's threat intelligence team for investigation.

## Usage

The user provides one or more URLs to report, optionally with a reason.

## Replace `<plugin-root>`
For platforms that doesn't define a plugin root environment, commands below will have `<plugin-root>` in path. The `<plugin-root>` is this skill file's path with `skills/report/SKILL.md` removed.

For example if this file is `/path/to/plugin/skills/report/SKILL.md`, the plugin root is `/path/to/plugin`

If your platform does not provide a plugin root variable, replace `<plugin-root>` in the commands below with the absolute path to the plugin root.

## Steps

1. Extract the URL(s) and any reason from the user's message.
2. Confirm with the user before submitting: "I'll report these URLs to Netcraft: [urls]. Reason: [reason]. Proceed?"
3. Once confirmed, run the report script for the agent you are running in. 

In Claude Code:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/url_report.mjs" --agent claude --reason 'reason text' '<url1>' '[url2...]'
   ```
In Cursor:
   ```bash
   node "<plugin-root>/scripts/url_report.mjs" --agent cursor --reason 'reason text' '<url1>' '[url2...]'
   ```
Each url and reason MUST be contained in single quotes
If the user does not provide a reason, pass an empty reason: `--reason ''`.
4. Present the results to the user, including the submission tracking link.

## Example

User: `/netcraft:report --reason 'Impersonating our company login page' 'https://phishing-site.example.com'`

Confirm with user, then 
In Claude Code:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/url_report.mjs" --agent claude --reason 'Impersonating our company login page' 'https://phishing-site.example.com'
```
In Cursor:
```bash
node "<plugin-root>/scripts/url_report.mjs" --agent cursor --reason 'Impersonating our company login page' 'https://phishing-site.example.com'
```

## Notes

- Reports are submitted anonymously to Netcraft
- Report submissions send the full reported URL(s) and optional reason, but no email address
- Always confirm with the user before submitting a report
