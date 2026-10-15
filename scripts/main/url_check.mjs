import { readFileSync } from "node:fs";
import { handleUserPromptSubmit } from "../lib/hooks/handle_user_prompt_submit.mjs";
import { checkUrls } from "../lib/check_urls.mjs";
import { normalizeCheckUrl } from "../lib/manual_input.mjs";
import { formatSiteInfo } from "../lib/formatting.mjs";
import { handlePreToolUse } from "../lib/hooks/handle_pre_tool_use.mjs";
import { handleMessageDisplay } from "../lib/hooks/handle_message_display.mjs";
import { formatUserPromptOutput, formatPreToolUseOutput, formatMessageDisplayOutput } from "../lib/hooks/format_hook_output.mjs";
import { Cache } from "../lib/cache.mjs";
import { isNetcraftSkillPrompt } from "../lib/hooks/is_netcraft_skill.mjs";
import { HOOK_MESSAGE_DISPLAY, HOOK_PRE_TOOL_USE, HOOK_USER_PROMPT, parseHookInput } from "../lib/hooks/parse_hook_input.mjs";

function usage() {
	return "Usage: url_check.mjs --check <url> [url...]"
}

export async function cliCheck(urls, cache) {
	if (urls.length === 0) throw new Error(usage());
	
	const normalizedUrls = urls.map(normalizeCheckUrl)
	const results = await checkUrls(normalizedUrls, cache);
	return {
		success: !results.some((result) => "error" in result),
		output: results.map((result) => `${formatSiteInfo(result)}\n\n`).join(""),
	};
}

export async function hookCheck(input, cache) {
	const hook = parseHookInput(input);
	if (!hook) return null;
	switch (hook.event) {
		case HOOK_USER_PROMPT: {
			const result = await handleUserPromptSubmit(hook.prompt, cache);
			return formatUserPromptOutput(result, hook.platform, isNetcraftSkillPrompt(hook.prompt));
		}
		case HOOK_PRE_TOOL_USE:
			return formatPreToolUseOutput(await handlePreToolUse(hook.urls, cache), hook.platform);
		case HOOK_MESSAGE_DISPLAY:
			return formatMessageDisplayOutput(await handleMessageDisplay(hook.delta, cache), hook.platform);
	}
	return null;
}

export async function main(argv) {
	const args = argv.slice(2);
	if (args.length) {
		if (args[0] !== "--check") throw new Error(usage());
		const { success, output } = await cliCheck(args.slice(1), new Cache());
		const stream = success ? process.stdout : process.stderr;
		stream.write(output);
		return success ? 0 : 1;
	}
	const output = await hookCheck(JSON.parse(readFileSync(0, "utf8")), new Cache());
	if (output) process.stdout.write(JSON.stringify(output));
	return 0;
}
