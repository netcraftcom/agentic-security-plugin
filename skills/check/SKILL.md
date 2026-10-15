---
name: check
description: Check one or more URLs with Netcraft and return the verdict and supporting context.
---

# Netcraft URL Check

Check URLs with Netcraft.

## Usage

The user provides one or more URLs to check. Run the check script and present the results.

## Replace `<plugin-root>`
For platforms that doesn't define a plugin root environment, commands below will have `<plugin-root>` in path. The `<plugin-root>` is this skill file's path with `skills/check/SKILL.md` removed.

For example if this file is `/path/to/plugin/skills/check/SKILL.md`, the plugin root is `/path/to/plugin`

If your platform does not provide a plugin root variable, replace `<plugin-root>` in the commands below with the absolute path to the plugin root.

## Steps

1. Extract the URL(s) from the user's message.
2. Run the check script

   In Claude Code:
      ```bash
      node "${CLAUDE_PLUGIN_ROOT}/scripts/url_check.mjs" --check '<url1>' '<url2>' '[url3...]'
      ```
   In Cursor:
      ```bash
      node "<plugin-root>/scripts/url_check.mjs" --check '<url1>' '<url2>' '[url3...]'
      ```

   Each url MUST be contained in single quotes
3. Present the results to the user in a clear format. For each URL, show:
   - Whether it is safe or malicious
   - If malicious: the threat classification shown by the script
   - Any supporting context returned by the script
   - A link to the full Netcraft site report

## Example

User: `/netcraft:check 'https://example.com'`

In Claude Code:
   ```bash
   node "${CLAUDE_PLUGIN_ROOT}/scripts/url_check.mjs" --check 'https://example.com'
   ```
In Cursor:
   ```bash
   node "<plugin-root>/scripts/url_check.mjs" --check 'https://example.com'
   ```

Present the output directly to the user.
