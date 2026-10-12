import { readFileSync } from "node:fs";
import { formatCheckFailureWarning } from "./formatting.mjs";
import { checkOrigin } from "./api/check_origin.mjs";
import { mapWithConcurrency } from "./concurrency.mjs";

const CACHE_TTL_SAFE_MS = 5 * 60 * 1000;
const CACHE_TTL_MALICIOUS_MS = 30 * 60 * 1000;
const MAX_URLS_PER_CHECK = 25;
const MAX_ORIGINS_PER_CHECK = 10;
const ORIGIN_CONCURRENCY = 4;
const HTTP_URL_REGEX = /https?:\/\/[^\s"'<>\])}`]+/gi;
// Unicode letters, marks, numbers, non-ASCII symbols, format characters, middle dot, and hyphen but not emojis.
const DOMAIN_CHARACTER = String.raw`[\p{L}\p{M}\p{N}\p{Cf}\u00b7\-]`;
// Label separators: ASCII dot, ideographic, fullwidth, and halfwidth dots.
const DOMAIN_DOT = String.raw`[.\u3002\uff0e\uff61]`;
const BARE_DOMAIN_REGEX = new RegExp(
	// Block partial matches like cher.de or her.de in bücher.de because a domain character precedes them.
	String.raw`(?<!${DOMAIN_CHARACTER}|${DOMAIN_DOT}|[@:\/_])` +
	// Keep leading underscores and hyphens outside the domain capture, e.g. _--evil.com.
	String.raw`[_\-]*` +
	// Prevent backtracking from moving a leading hyphen into the domain capture.
	String.raw`(?<domain>(?![_\-])` +
	// One or more labels followed by a dot, then the final label (the TLD).
	// Avoid matching a single label like localhost.
	String.raw`(?:${DOMAIN_CHARACTER}+${DOMAIN_DOT})+${DOMAIN_CHARACTER}+` +
	// Reject example.com_suffix without backtracking to example.co.
	String.raw`(?!${DOMAIN_CHARACTER}|_)` +
	// Optionally include a numeric port, e.g. :8083.
	String.raw`(?::\d+)?` +
	// Start an optional path (/), query (?), or fragment (#).
	String.raw`(?:[\/?#]` +
	// Stop at whitespace, quotes, angle brackets, ], ), }, or a backtick (\x60).
	String.raw`[^\s"'<>\]\)\}\x60]*)?)`,
	// Capture indices, global, case-insensitive, and Unicode set notation.
	"dgiv",
);

// Bundled IANA snapshot: no network lookup is needed to recognize a domain.
// Fetched from https://data.iana.org/TLD/tlds-alpha-by-domain.txt
const BARE_DOMAIN_TLDS = new Set(readFileSync(new URL("./iana-tlds.txt", import.meta.url), "utf8")
	.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((line) => line.toLowerCase()));

export async function checkFromText(text, cache) {
	const urlMatches = extractUrlMatches(text);
	if (Object.keys(urlMatches).length === 0) return null;

	const results = await checkUrls(Object.keys(urlMatches), cache);
	return {
		urlMatches,
		results,
		malicious: results.filter((r) => r.malicious),
		checkFailureWarning: formatCheckFailureWarning(results),
	};
}

export function extractUrlMatches(text) {
	const matches = {}
	if (!text) return matches;

	// Find http(s) or bare domain matches
	const httpMatches = text.matchAll(HTTP_URL_REGEX);
	const httpMatchesArr = [...httpMatches]
	const bareDomainMatches = text.matchAll(BARE_DOMAIN_REGEX);

	for (const match of httpMatchesArr) {
		// Remove any trailing . , ; )
		const url = match[0].replace(/[.),;]+$/, "")
		
		if (!(url in matches)) {
			matches[url] = []
		}
		matches[url].push({ index: match.index, length: url.length })
	}

	for (const match of bareDomainMatches) {
		// Remove any trailing . , ; )
		const bareDomain = match.groups.domain.replace(/[.),;]+$/, "");
		const index = match.indices.groups.domain[0]
		const length = bareDomain.length

		// Skip bare domains within http matches
		if (httpMatchesArr.some(httpMatch => 
			httpMatch.index <= index && 
			index + length <= httpMatch.index + httpMatch[0].length
		)) {
			continue
		}

		// Bare domains should be prepended with http://
		// Reasoning is browser will usually redirect http to https if
		// it's available. This will follow use flows can cover our bases
		const url = "http://"+bareDomain

		// Skip if the url cannot be parsed or doesn't have a valid tld
		try {
			const parsedURL = new URL(url)
			const tld = parsedURL.hostname.split('.').pop();
			if (!BARE_DOMAIN_TLDS.has(tld)) continue 
		} catch {
			continue
		}

		if (!(url in matches)) {
			matches[url] = []
		}
		matches[url].push({ index, length })
	}

	return matches
}



export async function checkUrls(urls, cache, { timeoutMs = 6000 } = {}) {
	const { toCheckUrls, skippedUrlResults } = prepareUrls(urls)
	let { toFetchOrigins, skippedOrigins, inCacheOrigins } = prepareOrigins(cache, toCheckUrls)

	// Fetch origins in batches, successful fetch will result in cache being
	// updated whilst any error occurred will add to skippedOrigins with reason
	const output = await batchFetchOrigins(cache, toFetchOrigins, skippedOrigins, timeoutMs)
	cache = output.cache
	skippedOrigins = output.skippedOrigins

	const foundOrigins = {...inCacheOrigins, ...output.fetchedOrigins}

	const results = [];
	for (const { url, origin } of toCheckUrls) {
		if (origin in skippedOrigins) {
			const reason = skippedOrigins[origin]
			results.push({
				origin,
				url,
				malicious: false,
				error: reason
			});
			continue;
		}

		// This ideally should not happen, foundOrigins contains
		// cache and fetched origins so it should be there
		if (!(origin in foundOrigins)) {
			continue
		}

		const siteData = foundOrigins[origin]
		const result = evaluateUrl(url, origin, siteData);

		results.push(result);
		if (result.malicious) {
			cache.set(origin, {
				siteData: siteData,
				expires: Date.now() + CACHE_TTL_MALICIOUS_MS,
			});
		}
	}

	cache.flush();
	return [...results, ...skippedUrlResults];
}

function shouldSkipOrigin(parsed) {
	const host = parsed.hostname.toLowerCase().replace(/\.$/, "");

	// IPv6 loopback refers to the local machine; the URL parser normalizes expanded forms.
	if (host === "[::1]") return true;

	// Single-label names usually resolve within the local network (e.g. intranet).
	// IPv6 literals contain colons but no dots; do not treat them as single-label names.
	if (!host.includes(".") && !host.includes(":")) return true;

	// Reserved local suffixes and common internal naming conventions can expose
	// private service names to the external reputation service.
	if (/(^|\.)(localhost|local|internal|lan|corp|localdomain)$/.test(host)) return true;

	// home.arpa and its subdomains name devices on residential networks.
	if (/(^|\.)home\.arpa$/.test(host)) return true;

	// These IPv4 ranges identify local or shared networks, so do not disclose them.
	// The URL parser normalizes alternate spellings (e.g. 127.1) before this check.
	if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) {
		const [a, b] = host.split(".").map(Number);
		return (
			a === 0 ||                              // 0/8: addresses on the current network
			a === 10 ||                             // Private network addresses
			a === 127 ||                            // 127/8: the local machine
			(a === 169 && b === 254) ||             // 169.254/16: the local link
			(a === 172 && b >= 16 && b <= 31) ||    // Private network addresses
			(a === 192 && b === 168) ||             // Private network addresses
			(a === 100 && b >= 64 && b <= 127)      // Carrier-shared addresses, not public hosts
		);
	}
	return false;
}

function prepareUrls(urls) {
	const uniqueUrls = [...new Set(urls)];
	const toCheckUrls = [];
	const skippedUrlResults = [];

	for (const url of uniqueUrls) {
		if (toCheckUrls.length >= MAX_URLS_PER_CHECK) {
			skippedUrlResults.push({
				url,
				malicious: false,
				error: `Skipped: more than ${MAX_URLS_PER_CHECK} URLs in one check`
			});
			continue;
		}
		try {
			const parsed = new URL(url);
			if (shouldSkipOrigin(parsed)) {
				skippedUrlResults.push({ url, malicious: false, skipped: "internal or excluded host" });
				continue;
			}
			toCheckUrls.push({ url, origin: parsed.origin });
		} catch (err) {
			skippedUrlResults.push({ 
				url, 
				malicious: false,
				error: err.message 
			});
		}
	}

	return { toCheckUrls, skippedUrlResults }
}

function prepareOrigins(cache, toCheckUrls) {
	const uniqueOrigins = new Set()
	toCheckUrls.map(u => uniqueOrigins.add(u.origin))

	const inCacheOrigins = {};
	const uncachedOrigins = [];

	([...uniqueOrigins]).map(origin => {
		const cached = cache.get(origin)
		if (cached) {
			inCacheOrigins[origin] = cached.siteData
		} else {
			uncachedOrigins.push(origin)
		}
	})

	const toFetchOrigins = uncachedOrigins.slice(0, MAX_ORIGINS_PER_CHECK);
	
	// SkippedOrigins will be a map with reason as value for easier checking
	const skippedOrigins = {}
	uncachedOrigins.slice(MAX_ORIGINS_PER_CHECK).map(origin => {
		skippedOrigins[origin] = `Skipped: more than ${MAX_ORIGINS_PER_CHECK} Origins in one check`
	})

	return {toFetchOrigins, skippedOrigins, inCacheOrigins}
}

async function batchFetchOrigins(cache, toFetchOrigins, skippedOrigins, timeoutMs) {
	const fetchedOrigins = {}

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	// Batch fetch origins with timer on total operation
	await mapWithConcurrency(
		toFetchOrigins,
		ORIGIN_CONCURRENCY,
		async (origin) => {
			try {
				const siteData = await checkOrigin(controller.signal, origin);
				fetchedOrigins[origin] = siteData
				cache.set(origin, {
					siteData,
					expires: Date.now() + CACHE_TTL_SAFE_MS,
				});
			} catch (err) {
				skippedOrigins[origin] = controller.signal.aborted
					? "Deadline exceeded"
					: err
			}
		},
	);
	clearTimeout(timer)

	return { cache, fetchedOrigins, skippedOrigins }
}

function evaluateUrl(url, origin, siteData) {
	const parsed = new URL(url);
	parsed.hash = "";
	const urlToTest = parsed.toString();
	const matchedTypes = [];

	for (const entry of siteData.patterns || []) {
		try {
			if (new RegExp(entry.pattern, "i").test(urlToTest)) {
				matchedTypes.push(entry.type);
			}
		} catch {}
	}

	const threatTypes = [...new Set(matchedTypes)];
	return {
		origin,
		url,
		malicious: threatTypes.length > 0,
		threatTypes,
		site: siteData.site,
	};
}
