import { defangUrl } from "./manual_input.mjs";

// Malicious URLs are shown defanged so no message offers a live link.
export function formatWarning(result) {
	const types = result.threatTypes.join(", ");
	let warning = `WARNING: ${defangUrl(result.url)} is classified as malicious (${types}).`;
	if (result.site.country) warning += ` Country: ${result.site.country}.`;
	if (result.site.hoster) warning += ` Hoster: ${result.site.hoster}.`;
	return warning;
}

export function formatCheckFailureWarning(results) {
	const failures = results.filter((r) => r.error);
	if (failures.length === 0) return null;

	const reasons = [...new Set(failures.map((r) => r.error))].join("; ");
	return `Netcraft could not check ${failures.length} URL(s): ${reasons}. These URLs have unknown status; the operation is allowed.`;
}

export function formatSiteInfo(result) {
	const lines = [];
	lines.push(`URL: ${result.malicious ? defangUrl(result.url) : result.url}`);
	if (result.error) {
		lines.push(`Status: Unknown (${result.error})`);
		return lines.join("\n");
	}
	if (result.skipped) {
		lines.push(`Status: Skipped (${result.skipped})`);
		return lines.join("\n");
	}

	lines.push(`Status: ${result.malicious ? "MALICIOUS" : "Safe"}`);
	if (result.malicious) {
		lines.push(`Threat types: ${result.threatTypes.join(", ")}`);
	}
	if (result.site.country) lines.push(`Country: ${result.site.country}`);
	if (result.site.hoster) lines.push(`Hoster: ${result.site.hoster}`);
	if (result.site.rank) lines.push(`Rank: ${result.site.rank}`);
	if (result.site.firstSeen) lines.push(`First seen: ${result.site.firstSeen}`);
	if (result.site.netblock) {
		lines.push(
			`Netblock: ${result.site.netblock.name} (${result.site.netblock.firstIp} - ${result.site.netblock.lastIp})`,
		);
	}
	lines.push(
		`Site report: https://sitereport.netcraft.com/?url=${encodeURIComponent(result.origin)}`,
	);
	return lines.join("\n");
}
