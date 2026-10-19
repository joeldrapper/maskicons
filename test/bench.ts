// Times a Vite production build of each fixture CSS file, each in a fresh process, pinned to one CPU core when
// `taskset` is available. Run with `bun run build && node test/bench.ts [runs]`.
import { execFileSync, spawnSync } from "node:child_process"
import * as path from "node:path"

const FIXTURE_DIR = path.join(import.meta.dirname, "fixture")
const VITE = path.join(import.meta.dirname, "../node_modules/vite/bin/vite.js")
const RUNS = Number(process.argv[2] ?? 5)
const ENTRIES = ["none.css", "release.css", "release-sets.css", "plugin.css", "plugin-sets.css"]

const taskset = spawnSync("taskset", ["--version"]).status === 0
const command = taskset ? ["taskset", "-c", "0", process.execPath] : [process.execPath]

function median(values: number[]): number {
	const sorted = [...values].sort((a, b) => a - b)
	return sorted[Math.floor(sorted.length / 2)]
}

console.log(`${RUNS} runs each${taskset ? ", on one CPU core" : ""}\n`)

for (const entry of ENTRIES) {
	const times: number[] = []
	for (let run = 0; run < RUNS; run++) {
		const start = performance.now()
		execFileSync(command[0], [...command.slice(1), VITE, "build"], {
			cwd: FIXTURE_DIR,
			env: { ...process.env, ENTRY: entry },
			stdio: "ignore",
		})
		times.push(performance.now() - start)
	}
	console.log(`${entry.padEnd(18)} ${(median(times) / 1000).toFixed(2)}s`)
}
