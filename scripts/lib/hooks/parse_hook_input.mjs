import { extractUrlMatches } from "../check_urls.mjs";
import { isNetcraftSkillCommand } from "./is_netcraft_skill.mjs";

export const HOOK_USER_PROMPT = "HOOK_USER_PROMPT";
export const HOOK_PRE_TOOL_USE = "HOOK_PRE_TOOL_USE";
export const HOOK_MESSAGE_DISPLAY = "HOOK_MESSAGE_DISPLAY";
export const PLATFORM_CLAUDE = "PLATFORM_CLAUDE";
export const PLATFORM_CURSOR = "PLATFORM_CURSOR";

// Normalize each platform's payload before passing it to a handler.
// https://code.claude.com/docs/en/hooks#hook-input-and-output
// https://cursor.com/docs/hooks#reference
export function parseHookInput(input) {
	switch (input?.hook_event_name) {
		// Claude: prompt text submitted by the user.
		// https://code.claude.com/docs/en/hooks#userpromptsubmit-input
		case "UserPromptSubmit":
			return {
				event: HOOK_USER_PROMPT,
				platform: PLATFORM_CLAUDE,
				prompt: input.prompt,
			};

		// Cursor: prompt text before submission.
		// https://cursor.com/docs/hooks#beforesubmitprompt
		case "beforeSubmitPrompt":
			return {
				event: HOOK_USER_PROMPT,
				platform: PLATFORM_CURSOR,
				prompt: input.prompt,
			};

		// Claude: URL or shell command nested in tool_input.
		// PreToolUse matches tool names; claude-hooks.json selects WebFetch|WebSearch|Bash|PowerShell|mcp__.*.
		// https://code.claude.com/docs/en/hooks#matcher-patterns
		// https://code.claude.com/docs/en/hooks#pretooluse-input
		case "PreToolUse":
			return {
				event: HOOK_PRE_TOOL_USE,
				platform: PLATFORM_CLAUDE,
				urls: claudeToolUrls(input),
			};

		// Cursor: shell command is a top-level field for this event.
		// No matcher: bare domains in curl args must still be checked.
		// https://cursor.com/docs/hooks#beforeshellexecution--beforemcpexecution
		case "beforeShellExecution":
			return {
				event: HOOK_PRE_TOOL_USE,
				platform: PLATFORM_CURSOR,
				urls: isNetcraftSkillCommand(input.command) ? [] : Object.keys(extractUrlMatches(input.command)),
			};

		// Cursor: MCP tool_input is a JSON params string.
		// https://cursor.com/docs/hooks#beforeshellexecution--beforemcpexecution
		case "beforeMCPExecution":
			return {
				event: HOOK_PRE_TOOL_USE,
				platform: PLATFORM_CURSOR,
				urls: findUrlsInObject(JSON.parse(input.tool_input)),
			};

		// Claude: assistant text ready to be displayed.
		// https://code.claude.com/docs/en/hooks#messagedisplay-input
		case "MessageDisplay":
			return {
				event: HOOK_MESSAGE_DISPLAY,
				platform: PLATFORM_CLAUDE,
				delta: input.delta,
			};

		default:
			return;
	}
}

// Input: https://code.claude.com/docs/en/hooks#pretooluse-input
function claudeToolUrls(input) {
	const args = input.tool_input ?? {};

	if (input.tool_name === "WebFetch") {
		return args.url ? [args.url] : [];
	}

	if (input.tool_name === "Bash") {
		return isNetcraftSkillCommand(args.command) ? [] : Object.keys(extractUrlMatches(args.command));
	}

	if (input.tool_name === "PowerShell") {
		return Object.keys(extractUrlMatches(args.command));
	}

	if (input.tool_name === "WebSearch") {
		return Object.keys(extractUrlMatches(args.query));
	}

	if (input.tool_name.startsWith("mcp__")) {
		return findUrlsInObject(args);
	}

	return [];
}

// Inspect decoded strings so JSON escapes do not become part of a URL.
function findUrlsInObject(value) {
	if (typeof value === "string") return Object.keys(extractUrlMatches(value));
	if (!value || typeof value !== "object") return [];

	return [...new Set(Object.values(value).flatMap(findUrlsInObject))];
}
