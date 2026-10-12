#!/usr/bin/env node

import { main } from "./main/url_report.mjs";

main(process.argv).then((exitCode) => {
	process.exitCode = exitCode;
}).catch((err) => {
	console.error(`Error: ${err.message}`);
	process.exitCode = 1;
});
