import { checkUrls } from "../check_urls.mjs";
import { formatCheckFailureWarning } from "../formatting.mjs";
import { defangUrl } from "../manual_input.mjs";

/**
 * A denial includes both messages; a check-failure warning only adds context.
 * @typedef {{ block: true, userMessage: string, agentMessage: string }
 *   | { block: false, agentMessage: string, userMessage?: never }} PreToolUseResult
 */

/**
 * @param {string[]} urls
 * @returns {Promise<PreToolUseResult | null>}
 */
export async function handlePreToolUse(urls, cache) {
	if (urls.length === 0) return null;

	const results = await checkUrls(urls, cache);
	const malicious = results.filter((r) => r.malicious);
	const checkFailureWarning = formatCheckFailureWarning(results);

	if (malicious.length === 0) {
		return checkFailureWarning
			? { block: false, agentMessage: checkFailureWarning }
			: null;
	}

	const types = "threatTypes" in malicious[0] ? malicious[0].threatTypes.join(", ") : "";
	const reason = `Blocked by Netcraft: ${defangUrl(malicious[0].url)} is classified as malicious (${types}). See https://sitereport.netcraft.com/?url=${encodeURIComponent(malicious[0].origin)}`;
	return {
		block: true,
		userMessage: reason,
		agentMessage: reason,
	};
}
