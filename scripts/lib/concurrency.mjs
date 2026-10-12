/**
 * @param {string[]} items
 * @param {number} limit
 * @param {(arg0: any, arg1: number) => any} mapper
 */
export async function mapWithConcurrency(items, limit, mapper) {
	const results = new Array(items.length);
	let next = 0;

	async function worker() {
		while (next < items.length) {
			const current = next++;
			results[current] = await mapper(items[current], current);
		}
	}

	const workers = Array.from({ length: Math.min(limit, items.length) }, () =>
		worker(),
	);
	await Promise.all(workers);
	return results;
}