import { reportUrls } from "../lib/api/report_urls.mjs";

const SOURCES = new Map([
	["claude", "B6oRHNhiYo93L2CfYb50t9KZ5E0SnKSA"],
	["cursor", "mN1JhWkEBo162BRUWFUtJTIU5nH7DmIj"],
]);

function usage() {
	return 'Usage: url_report.mjs --agent <claude|cursor> <url> [url...] [--reason "reason text"]';
}

export async function cliCheck(args) {
	const urls = [];
	let reason = "";
	let agent;
	let i = 0;

	while (i < args.length) {
		if (args[i] === "--agent") {
			agent = args[i + 1];
			i += 2;
		} else if (args[i] === "--reason" && i + 1 < args.length) {
			reason = args[i + 1];
			i += 2;
		} else {
			urls.push(args[i]);
			i++;
		}
	}

	if (urls.length === 0) throw new Error(usage());

	const source = SOURCES.get(agent);
	if (!source) {
		throw new Error("Specify the reporting agent: claude or cursor (--agent on the CLI, agent in JSON input)");
	}

	return reportUrls(urls, reason, source);
}

export async function main(argv) {
	if (argv.length > 0) {
		const { success, output } = await cliCheck(argv.slice(2));
		const stream = success ? process.stdout : process.stderr;
		stream.write(`${output}\n`);
		return success ? 0 : 1;
	} 
	throw new Error(usage())
}
