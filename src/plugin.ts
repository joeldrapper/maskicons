import { closeSync, openSync, readFileSync, readSync } from "node:fs"
import type createPlugin from "tailwindcss/plugin"
import { ICON_SETS, type IconSet } from "./sets"

type PluginAPI = Parameters<Parameters<typeof createPlugin>[0]>[0]

// The build script writes two files per set: `<set>.json`, which maps each icon to the byte offset and length of
// its SVG data URL, and `<set>.txt`, which holds the URLs. Only the small index is read up front (Tailwind and the
// editor need every name); each URL is read on its own when Tailwind generates that icon, so the size of the set
// doesn't affect the build.
type Index = Record<string, [offset: number, length: number]>

function dataFile(file: string): URL {
	return new URL(`./data/${file}`, import.meta.url)
}

function readIndex(set: IconSet): Index {
	return JSON.parse(readFileSync(dataFile(`${set.name}.json`), "utf8"))
}

function readUrl(set: IconSet, [offset, length]: [number, number]): string {
	const buffer = Buffer.alloc(length)
	const fd = openSync(dataFile(`${set.name}.txt`), "r")
	try {
		readSync(fd, buffer, 0, length, offset)
	} finally {
		closeSync(fd)
	}
	return buffer.toString("utf8")
}

// The same rule as the @utility in the CSS files of maskicons 0.x, with its `@apply inline-block overflow-hidden align-[-0.125em]
// select-none cursor-default` written out in the order Tailwind expands it
function iconStyles(set: IconSet, url: string) {
	const base = {
		display: "inline-block",
		cursor: "default",
		overflow: "hidden",
		"vertical-align": "-0.125em",
		"-webkit-user-select": "none",
		"user-select": "none",
		height: "1em",
		"aspect-ratio": set.aspectRatio,
	}

	if (set.colored) {
		return { ":where(&)": { ...base, background: `url("${url}") center / contain no-repeat` } }
	}

	return {
		":where(&)": {
			...base,
			color: "var(--icon-color, currentColor)",
			background: "var(--icon-color, currentColor)",
			mask: `url("${url}") center / contain no-repeat`,
		},
	}
}

function flattenColors(colors: Record<string, unknown>, path: string[] = []): string[] {
	return Object.entries(colors).flatMap(([key, value]) => {
		if (key === "__CSS_VALUES__") return []
		const keyPath = key === "DEFAULT" ? path : [...path, key]
		if (value && typeof value === "object") return flattenColors(value as Record<string, unknown>, keyPath)
		return [keyPath.join("-")]
	})
}

function registerIconColor({ matchUtilities, theme }: PluginAPI) {
	// `--theme()` resolves the same way `--value(--color-*)` does, so `@theme inline` and `theme(reference)` still work.
	const values: Record<string, string> = {}
	for (const key of flattenColors(theme("colors") ?? {})) values[key] = `--theme(--color-${key})`
	const known = new Set(Object.values(values))

	// Only theme colours, like the `icon-*` @utility in 0.x: returning no declarations rejects arbitrary values.
	matchUtilities({ icon: (value) => (known.has(value) ? { "--icon-color": value } : []) }, { values })
}

function registerIcons({ matchUtilities }: PluginAPI, sets: IconSet[]) {
	const prefixes = new Map<string, IconSet[]>()
	for (const set of sets) prefixes.set(set.prefix, [...(prefixes.get(set.prefix) ?? []), set])

	for (const [prefix, prefixSets] of prefixes) {
		const values: Record<string, string> = {}
		const icons = new Map<string, [IconSet, [number, number]]>()

		for (const set of prefixSets) {
			for (const [value, location] of Object.entries(readIndex(set))) {
				values[value] = value
				icons.set(value, [set, location])
			}
		}

		matchUtilities(
			{
				[prefix]: (value) => {
					const icon = icons.get(value)
					if (!icon) return []
					const [set, location] = icon
					return iconStyles(set, readUrl(set, location))
				},
			},
			{ values },
		)
	}
}

// Called by the generated entry points in dist, e.g. `export default maskicons(["bootstrap"], true)`
export function maskicons(setNames: string[], iconColor: boolean) {
	const sets = setNames.map((name) => ICON_SETS.find((set) => set.name === name)!)

	return (api: PluginAPI) => {
		if (iconColor) registerIconColor(api)
		registerIcons(api, sets)
	}
}
