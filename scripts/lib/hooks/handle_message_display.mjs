import { checkFromText } from "../check_urls.mjs";
import { defangUrl } from "../manual_input.mjs";

/**
 * Each display batch is independent; URLs split across batches are not reconstructed.
 * @param {string} delta
 * @returns {Promise<string | undefined>}
 */
export async function handleMessageDisplay(delta, cache) {
	const checked = await checkFromText(delta, cache);
	if (!checked) return;

	const { malicious, urlMatches } = checked;
	const warning = checked.checkFailureWarning ? ` [${checked.checkFailureWarning}]` : "";
	if (malicious.length === 0) return delta + warning;

	// Each malicious URL is rendered defanged with an annotation; the transcript keeps the original.
	const edits = [];
	for (const result of malicious) {
		const types = "threatTypes" in result ? result.threatTypes.join(", ") : "";
		for (const { index, length } of urlMatches[result.url]) {
			const end = index + length;
			const originalURL = delta.slice(index, end);
			const annotated = `${defangUrl(originalURL)} [⚠️ MALICIOUS: ${types}]`;
			edits.push({ start: index, end, text: annotated });
		}
	}

	// Replace from right to left so earlier positions remain valid.
	let displayContent = delta;
	for (const { start, end, text } of edits.sort((a, b) => b.start - a.start)) {
		displayContent = displayContent.slice(0, start) + text + displayContent.slice(end);
	}

	return displayContent + warning;
}
