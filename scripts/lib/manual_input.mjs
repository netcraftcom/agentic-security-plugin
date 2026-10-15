export function normalizeCheckUrl(value) {
	if (typeof value !== "string" || !value || (/[\s]/u.test(value) || [...value].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))) {
		throw new Error("Invalid URL: expected a non-empty URL without whitespace");
	}
	if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
		throw new Error("Invalid URL: only HTTP and HTTPS are supported");
	}
	const normalized = /^https?:\/\//i.test(value) ? value : `http://${value}`;
	try {
		const parsed = new URL(normalized);
		if (!parsed.hostname || !["http:", "https:"].includes(parsed.protocol)) throw new Error();
	} catch {
		throw new Error(`Invalid URL: ${value}`);
	}
	return normalized;
}

// Display form for warnings: hxxps://phishing[.]example/login. Only the scheme and
// hostname change, so the result is exactly what the reporter accepts.
export function defangUrl(value) {
	const match = /^(?:(https?):\/\/)?([^/?#]+)([\s\S]*)$/i.exec(value);
	if (!match) return value;
	const scheme = match[1] ? match[1].replace(/tt/i, (tt) => (tt === "TT" ? "XX" : "xx")) + "://" : "";
	return scheme + match[2].replace(/[.。．｡]/g, "[.]") + match[3];
}
