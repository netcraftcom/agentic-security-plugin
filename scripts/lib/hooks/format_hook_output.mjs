import { PLATFORM_CLAUDE, PLATFORM_CURSOR } from "./parse_hook_input.mjs";

/**
 * @typedef {import("./handle_user_prompt_submit.mjs").UserPromptResult} UserPromptResult
 * @typedef {import("./handle_pre_tool_use.mjs").PreToolUseResult} PreToolUseResult
 */

/**
 * @param {UserPromptResult | null} result
 * @param {string} platform
 * @param {boolean} [skipBlock]
 */
export function formatUserPromptOutput(result, platform, skipBlock) {
	// https://code.claude.com/docs/en/hooks#userpromptsubmit-decision-control
	if (platform === PLATFORM_CLAUDE) {
		if (result == null) return null;

		if (!result.userMessage || skipBlock) {
			return {
				hookSpecificOutput: {
					hookEventName: "UserPromptSubmit",
					additionalContext: result.agentMessage,
				},
			};
		}

		return {
			decision: "block",
			reason: result.userMessage,
			hookSpecificOutput: {
				hookEventName: "UserPromptSubmit",
				additionalContext: result.agentMessage,
			},
		};
	}

	// Cursor only shows user_message when the prompt is blocked.
	// https://cursor.com/docs/hooks#beforesubmitprompt
	if (platform === PLATFORM_CURSOR) {
		if (!result?.userMessage || skipBlock) return { continue: true };

		return {
			continue: false,
			user_message: result.userMessage,
		};
	}

	return null;
}

/**
 * @param {PreToolUseResult | null} result
 * @param {string} platform
 */
export function formatPreToolUseOutput(result, platform) {
	// https://code.claude.com/docs/en/hooks#pretooluse-decision-control
	if (platform === PLATFORM_CLAUDE) {
		if (result == null) return null;

		if (!result.block) {
			return {
				hookSpecificOutput: {
					hookEventName: "PreToolUse",
					additionalContext: result.agentMessage,
				},
			};
		}

		return {
			hookSpecificOutput: {
				hookEventName: "PreToolUse",
				permissionDecision: "deny",
				permissionDecisionReason: result.userMessage,
				additionalContext: result.agentMessage,
			},
		};
	}

	// Cursor shell and MCP hooks accept this permission output shape.
	// https://cursor.com/docs/hooks#beforeshellexecution--beforemcpexecution
	if (platform === PLATFORM_CURSOR) {
		if (result == null) return { permission: "allow" };

		if (!result.userMessage) return {
			permission: "allow",
			agent_message: result.agentMessage,
		}

		return {
			permission: "deny",
			user_message: result.userMessage,
			agent_message: result.agentMessage,
		};
	}

	return null;
}

/**
 * @param {string | undefined} result
 * @param {string} platform
 */
export function formatMessageDisplayOutput(result, platform) {
	if (result == null || platform !== PLATFORM_CLAUDE) return null;

	// https://code.claude.com/docs/en/hooks#messagedisplay-output
	return {
		hookSpecificOutput: {
			hookEventName: "MessageDisplay",
			displayContent: result,
		},
	};
}
