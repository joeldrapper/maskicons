import { execFileSync } from "node:child_process"
import * as fs from "node:fs"
import * as path from "node:path"
import { optimize } from "svgo"
import { ICON_SETS, type IconSet } from "./sets.ts"

const SRC_DIR = import.meta.dirname
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

function collectSvgFiles(dir: string): string[] {
	return fs
		.readdirSync(dir, { recursive: true, encoding: "utf8" })
		.filter((file) => file.endsWith(".svg"))
		.map((file) => path.join(dir, file))
}

async function buildIconSet(config: IconSet, classNames: Map<string, string>): Promise<number> {
	const directory = path.join(ICONS_DIR, config.directory)
	const svgFiles = collectSvgFiles(directory).sort()

	if (svgFiles.length === 0) {
		console.log(`No icons found for ${config.name}, skipping...`)
		return 0
	}

	const icons = await Promise.all(
		svgFiles.map(async (filePath) => {
			const svgContent = await fs.promises.readFile(filePath, "utf8")
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
	await fs.promises.writeFile(path.join(DATA_DIR, `${config.name}.json`), JSON.stringify(index))
	await fs.promises.writeFile(path.join(DATA_DIR, `${config.name}.txt`), Buffer.concat(urls))

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
	// Compiles src/plugin.ts and src/sets.ts to dist
	execFileSync(path.join(SRC_DIR, "../node_modules/.bin/tsc"), ["-p", path.join(SRC_DIR, "../tsconfig.build.json")], {
		stdio: "inherit",
	})

	const entries: [string, IconSet[], boolean][] = [
		["index", builtSets, true],
		["utilities", [], true],
		...builtSets.map((set): [string, IconSet[], boolean] => [set.name, [set], !set.colored]),
	]

	for (const [name, sets, iconColor] of entries) {
		const names = JSON.stringify(sets.map((set) => set.name))
		const outputFile = path.join(DIST_DIR, `${name}.js`)
		await fs.promises.writeFile(outputFile, `import { maskicons } from "./plugin.js"\n\nexport default maskicons(${names}, ${iconColor})\n`)
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
