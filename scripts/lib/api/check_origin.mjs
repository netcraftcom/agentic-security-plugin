const CHECK_URL_BASE = atob("aHR0cHM6Ly9taXJyb3IyLmV4dGVuc2lvbi5uZXRjcmFmdC5jb20vY2hlY2tfdXJsL3Y0Lw==")

export async function checkOrigin(signal, origin) {
	const encoded = Buffer.from(origin).toString("base64url");
	const endpoint = `${CHECK_URL_BASE}${encoded}/dodns/info`;

	const resp = await fetch(endpoint, {
		headers: { "User-Agent": "Netcraft-Agentic-Security/0.1" },
		signal: signal,
	});

	if (!resp.ok) {
		throw new Error(`HTTP ${resp.status}`);
	}

	const data = await resp.json();
	return {
		patterns: decodePatterns(data.patterns),
		site: {
			country: data.country || null,
			hoster: data.hoster || null,
			rank: data.rank || null,
			firstSeen: data.firstseen || null,
			netblock: data.netblock
				? {
					name: data.netblock.name,
					firstIp: data.netblock.first_ip,
					lastIp: data.netblock.last_ip,
				}
				: null,
		},
	};
}

function decodePatterns(patterns) {
	const decoded = [];

	for (const entry of patterns || []) {
		try {
			const pattern = buildPattern(
				Buffer.from(entry.pattern, "base64").toString("utf8"),
			);
			if (!pattern) continue;

			const type = entry.type || "unknown";
			decoded.push({
				pattern,
				type: entry.subtype ? `${type}/${entry.subtype}` : type,
			});
		} catch {}
	}

	return decoded;
}

function buildPattern(pattern) {
	pattern = pattern.replace(/\(\?[\w-]+\)/g, "");
	pattern = pattern.replace(/\(\?\^:(.*?)\)/g, "$1");

	if (pattern.length === 0) return null;

	try {
		new RegExp(pattern, "i");
		return pattern;
	} catch {
		return null;
	}
}
