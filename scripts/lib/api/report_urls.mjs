const REPORT_API = "https://report.netcraft.com/api/v3/report/urls";
const DEFAULT_REASON = "Reported via Netcraft Agentic Security plugin";
const MAX_URLS = 1000;
const MAX_REASON_LENGTH = 10000;

export async function reportUrls(urls, reason, source) {
	const safeReason = validateReason(reason);
	const reportUrls = buildReportUrls(urls, safeReason);
	const body = {
		is_anonymous: true,
		source,
		urls: reportUrls,
		reason: safeReason || DEFAULT_REASON,
	};

	let resp
	try {
		resp = await fetch(REPORT_API, {
			method: "POST",
			headers: { "Content-Type": "application/json;charset=utf-8" },
			body: JSON.stringify(body),
			signal: AbortSignal.timeout(10000),
		})
	} catch (err) {
		return { success: false, output: `Report failed: ${err.message}` };
	}

	const data = await resp.json().catch(() => null);
	if (!resp.ok) {
		const lines = [`Report failed (HTTP ${resp.status}): ${data?.error || data?.message || "Unknown error"}`];
		for (const detail of data?.details || []) {
			lines.push(`  - ${detail}`);
		}
		return { success: false, output: lines.join("\n") };
	}

	const lines = [
		`Successfully reported ${reportUrls.length} URL(s) to Netcraft.`,
		...reportUrls.map(({ url }) => `  - ${url}`),
	];
	if (data?.uuid) {
		lines.push(`Track: https://report.netcraft.com/submission/${encodeURIComponent(data.uuid)}`);
	}
	return { success: true, output: lines.join("\n") };
}

function validateReason(reason) {
	if (!reason) return "";
	if (reason.length > MAX_REASON_LENGTH) {
		throw new Error(`Reason must be ${MAX_REASON_LENGTH} characters or fewer`);
	}
	return reason;
}

function normalizeUrl(value) {
	const rawUrl = typeof value === "string" ? value : value?.url;
	if (typeof rawUrl !== "string" || !rawUrl.trim()) {
		throw new Error(
			"Each reported URL must be a non-empty string",
		);
	}

	// Prepend http for bare domain
	const withHttp = /^https?:\/\//i.test(rawUrl)
		? rawUrl
		: `http://${rawUrl}`;

	
	// Bare minimum check that new URL parses
	try {
		new URL(withHttp);
	} catch {
		throw new Error(`Invalid URL: ${withHttp}`);
	}

	return rawUrl;
}

function buildReportUrls(urls, reason) {
	if (!Array.isArray(urls) || urls.length === 0) {
		throw new Error("At least one URL is required");
	}

	if (urls.length > MAX_URLS) {
		throw new Error(`At most ${MAX_URLS} URLs can be reported at once`);
	}

	return urls.map((url) => {
		const normalized = normalizeUrl(url);
		const urlReason =
			typeof url === "object" && url?.reason
				? validateReason(url.reason)
				: reason;
		return {
			url: normalized,
			...(urlReason ? { reason: urlReason } : {}),
		};
	});
}
