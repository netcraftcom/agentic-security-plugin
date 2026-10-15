#!/usr/bin/env node
import { main } from "./main/url_check.mjs";

main(process.argv).then((code) => {
	process.exitCode = code;
}).catch((err) => {
	console.error(`Netcraft check failed: ${err.message}`);
	process.exitCode = 1;
});
