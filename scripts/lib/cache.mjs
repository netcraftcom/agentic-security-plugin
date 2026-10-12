import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export class Cache {
	constructor() {
		// Claude Code and Codex set CLAUDE_PLUGIN_DATA; other hosts fall back to the home directory.
		this._dir = process.env.CLAUDE_PLUGIN_DATA || join(homedir(), ".netcraft-agentic-security");
		this._path = join(this._dir, "url_cache.json");
		this.data = this._load();
		this.dirty = false;
	}

	_load() {
		try {
			if (existsSync(this._path)) {
				const raw = JSON.parse(readFileSync(this._path, "utf8"));
				const now = Date.now();
				const cleaned = {};
				for (const [key, entry] of Object.entries(raw)) {
					if (entry.expires > now) cleaned[key] = entry;
				}
				return cleaned;
			}
		} catch {}
		return {};
	}

	get(key) {
		return this.data[key];
	}

	set(key, value) {
		this.data[key] = value;
		this.dirty = true;
	}

	flush() {
		if (!this.dirty) return;
		try {
			mkdirSync(this._dir, { recursive: true });
			writeFileSync(this._path, JSON.stringify(this.data), "utf8");
		} catch {}
	}
}
