import { checkFromText } from "../check_urls.mjs";
import { formatWarning } from "../formatting.mjs";
import { defangUrl } from "../manual_input.mjs";

/**
 * @typedef {Object} UserPromptResult
 * @property {string | null} userMessage null when there are only check-failure warnings.
 * @property {string} agentMessage
 */

/**
 * @param {string} prompt
 * @returns {Promise<UserPromptResult | null>}
 */
export async function handleUserPromptSubmit(prompt, cache) {
	const checked = await checkFromText(prompt, cache);
	if (!checked) return null;

	const { malicious, checkFailureWarning } = checked;
	if (malicious.length === 0 && !checkFailureWarning) return null;

	const warnings = malicious.map(formatWarning).join("\n");
	const context = `Netcraft URL threat intelligence:\n${[warnings, checkFailureWarning].filter(Boolean).join("\n")}\n${malicious.length ? "The user's prompt contains URLs classified as malicious. Proceed with caution and inform the user." : "Some URLs could not be checked; their status is unknown."}`;
  
	const types = malicious.length && "threatTypes" in malicious[0] ? malicious[0].threatTypes.join(", ") : "";
	return {
		userMessage: malicious.length
			? `⚠️ Netcraft: ${malicious.map((r) => defangUrl(r.url)).join(", ")} detected as malicious (${types})`
			: null,
		agentMessage: context,
	};
}
