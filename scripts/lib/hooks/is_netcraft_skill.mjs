import { fileURLToPath } from "node:url";
import { normalizeCheckUrl } from "../manual_input.mjs";

const escapeRegex = (value) =>
	value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const rootDirectory = escapeRegex(fileURLToPath(new URL(`../../../`, import.meta.url)))

export function isNetcraftSkillPrompt(prompt) {
	return typeof prompt === "string" && /^\/(?:netcraft:)?(?:check|report)(?=\s|$)/u.test(prompt);
}

export function isNetcraftSkillCommand(command) {
	if (typeof command !== "string") return false;

	return isUrlCheck(command) || isUrlReport(command)
}

function isUrlCheck(command) {
	const prefix = new RegExp(`^node "${rootDirectory}/?scripts/url_check\\.mjs" --check `).exec(command)

	if (!prefix) return false

	const tail = command.slice(prefix[0].length)
	const urls = tail.split(" ")

	return urls.every(validUrlArg)
}

function isUrlReport(command) {
	const prefix = new RegExp(
		`^node "${rootDirectory}/?scripts/url_report\\.mjs" --agent (?:claude|cursor) --reason '[^']*' `,
	).exec(command);


	if (!prefix) return false

	const tail = command.slice(prefix[0].length)
	const urls = tail.split(" ")

	return urls.every(validUrlArg)
}

function validUrlArg(arg) {
	// Require single quotes around the entire argument.
	if (!arg.startsWith("'") || !arg.endsWith("'")) {
		return false;
	}
	const url = arg.slice(1, -1);

	// Reject embedded quotes, whitespace, substitutions, and escapes.
	if (!url || /['\s]/.test(url)) return false;


	try {
		normalizeCheckUrl(url)
		return true
	} catch {
		return false
	}
}
