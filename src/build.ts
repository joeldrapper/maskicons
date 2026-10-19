import { Glob } from "bun"
import * as path from "path"
import * as fs from "fs"
import { optimize } from "svgo"
import { ICON_SETS, type IconSet } from "./sets"

const SRC_DIR = import.meta.dir
const ICONS_DIR = path.join(SRC_DIR, "icons")
const DIST_DIR = path.join(SRC_DIR, "../dist")
const DATA_DIR = path.join(DIST_DIR, "data")

function optimizeSvg(svgContent: string): string {
	const result = optimize(svgContent, {
		plugins: ["preset-default", "removeDimensions"],
	})
	return result.data
}

function svgToDataUri(svgContent: string): string {
	// Optimize SVG and remove width/height attributes
	const optimized = optimizeSvg(svgContent)
	// Normalize whitespace and apply minimal encoding for CSS url()
	const normalized = optimized.replace(/\s+/g, " ").trim()
	// Only encode characters that are problematic in CSS url(): #, <, >, and "
	// Use single quotes for attributes to avoid needing to encode double quotes
	const encoded = normalized.replace(/"/g, "'").replace(/#/g, "%23").replace(/</g, "%3c").replace(/>/g, "%3e")

	return `data:image/svg+xml;charset=UTF-8,${encoded}`
}

function iconNameFromPath(filePath: string, baseDir: string): string {
	const relative = path.relative(baseDir, filePath)
	const parts = relative.replace(/\.svg$/, "").split(path.sep)
	return parts.join("-").toLowerCase()
}

async function collectSvgFiles(dir: string): Promise<string[]> {
	const glob = new Glob("**/*.svg")
	const files: string[] = []

	for await (const file of glob.scan({ cwd: dir, absolute: true })) {
		files.push(file)
	}

	return files
}

async function buildIconSet(config: IconSet, classNames: Map<string, string>): Promise<number> {
	const directory = path.join(ICONS_DIR, config.directory)
	const svgFiles = (await collectSvgFiles(directory)).sort()

	if (svgFiles.length === 0) {
		console.log(`No icons found for ${config.name}, skipping...`)
		return 0
	}

	const icons = await Promise.all(
		svgFiles.map(async (filePath) => {
			const svgContent = await Bun.file(filePath).text()
			const iconName = iconNameFromPath(filePath, directory)
			return { iconName, dataUri: svgToDataUri(svgContent) }
		}),
	)

	// Data for the Tailwind plugin: the data URLs, and an index from each utility value (the class name without
	// the prefix) to the byte offset and length of its URL
	const index: Record<string, [number, number]> = {}
	const urls: Buffer[] = []
	let offset = 0
	for (const { iconName, dataUri } of icons) {
		const value = [iconName, config.suffix].filter(Boolean).join("-")
		validateClassName(classNames, `${config.prefix}-${value}`, config.name)
		const url = Buffer.from(dataUri, "utf8")
		index[value] = [offset, url.length]
		urls.push(url)
		offset += url.length
	}
	await Bun.write(path.join(DATA_DIR, `${config.name}.json`), JSON.stringify(index))
	await Bun.write(path.join(DATA_DIR, `${config.name}.txt`), Buffer.concat(urls))

	console.log(`Generated ${config.name} with ${svgFiles.length} icons`)
	return svgFiles.length
}

// The plugin registers one utility per prefix, and Tailwind finds a class's utility by trying each hyphenated
// root of the class name. So a prefix must not be a root of another prefix (`flag` and `flag-square`), or a
// class could match both, and the same class must not come from two sets.
function validateClassName(classNames: Map<string, string>, className: string, setName: string): void {
	const existing = classNames.get(className)
	if (existing) throw new Error(`${className} is in both ${existing} and ${setName}`)
	classNames.set(className, setName)
}

function validatePrefixes(): void {
	const prefixes = new Set(ICON_SETS.map((set) => set.prefix))
	for (const prefix of prefixes) {
		if (!/^[a-z][a-z0-9-]*$/.test(prefix)) throw new Error(`Invalid prefix ${prefix}`)
		if (prefix === "icon") throw new Error("The icon prefix is taken by the icon-* colour utility")
		for (const other of prefixes) {
			if (other.startsWith(`${prefix}-`)) throw new Error(`The prefixes ${prefix} and ${other} are ambiguous`)
		}
	}
}

async function buildPlugin(builtSets: IconSet[]): Promise<void> {
	const result = await Bun.build({
		entrypoints: [path.join(SRC_DIR, "plugin.ts")],
		outdir: DIST_DIR,
		target: "node",
		format: "esm",
		external: ["tailwindcss"],
	})
	if (!result.success) throw new AggregateError(result.logs, "Failed to build plugin.js")

	const entries: [string, IconSet[], boolean][] = [
		["index", builtSets, true],
		["utilities", [], true],
		...builtSets.map((set): [string, IconSet[], boolean] => [set.name, [set], !set.colored]),
	]

	for (const [name, sets, iconColor] of entries) {
		const names = JSON.stringify(sets.map((set) => set.name))
		const outputFile = path.join(DIST_DIR, `${name}.js`)
		await Bun.write(outputFile, `import { maskicons } from "./plugin.js"\n\nexport default maskicons(${names}, ${iconColor})\n`)
		console.log(`Generated ${outputFile}`)
	}
}

async function main(): Promise<void> {
	validatePrefixes()

	// Clean and recreate dist directory
	if (fs.existsSync(DIST_DIR)) {
		fs.rmSync(DIST_DIR, { recursive: true })
	}
	fs.mkdirSync(DATA_DIR, { recursive: true })

	// Build each icon set
	const builtSets: IconSet[] = []
	const classNames = new Map<string, string>()
	let totalIcons = 0

	for (const config of ICON_SETS) {
		const iconCount = await buildIconSet(config, classNames)
		if (iconCount > 0) {
			builtSets.push(config)
			totalIcons += iconCount
		}
	}

	// Generate the Tailwind plugin and its entry points
	await buildPlugin(builtSets)

	console.log(`\nTotal: ${totalIcons} icons across ${builtSets.length} icon set(s)`)
}

main()
