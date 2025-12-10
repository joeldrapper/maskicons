import { Glob } from "bun"
import * as path from "path"
import * as fs from "fs"
import { optimize } from "svgo"

const SRC_DIR = import.meta.dir
const ICONS_DIR = path.join(SRC_DIR, "icons")
const DIST_DIR = path.join(SRC_DIR, "../dist")

const ICON_SETS: IconSetConfig[] = [
	{
		name: "tabler",
		directory: path.join(ICONS_DIR, "tabler"),
		prefix: "tabler",
	},
	{
		name: "bootstrap",
		directory: path.join(ICONS_DIR, "bootstrap"),
		prefix: "bootstrap",
	},
]

interface IconSetConfig {
	name: string
	directory: string
	prefix: string
}

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

function generateUtility(prefix: string, iconName: string, svgContent: string): string {
	const dataUri = svgToDataUri(svgContent)

	return `@utility ${prefix}-${iconName} {
  :where(&) {
    @apply inline-block size-[1em] overflow-hidden align-[-0.125em] select-none cursor-default;
    color: var(--icon-color, currentColor);
    background: var(--icon-color, currentColor);
    mask: url("${dataUri}") center / contain no-repeat;
  }
}
`
}

async function collectSvgFiles(dir: string): Promise<string[]> {
	const glob = new Glob("**/*.svg")
	const files: string[] = []

	for await (const file of glob.scan({ cwd: dir, absolute: true })) {
		files.push(file)
	}

	return files
}

async function buildIconSet(config: IconSetConfig): Promise<number> {
	const svgFiles = await collectSvgFiles(config.directory)

	if (svgFiles.length === 0) {
		console.log(`No icons found for ${config.name}, skipping...`)
		return 0
	}

	const utilities = await Promise.all(
		svgFiles.map(async (filePath) => {
			const file = Bun.file(filePath)
			const svgContent = await file.text()
			const iconName = iconNameFromPath(filePath, config.directory)
			return generateUtility(config.prefix, iconName, svgContent)
		}),
	)

	const imports = ['@import "./utilities.css";']
	const output = imports.join("\n") + "\n\n" + utilities.join("\n")
	const outputFile = path.join(DIST_DIR, `${config.name}.css`)
	await Bun.write(outputFile, output)

	console.log(`Generated ${outputFile} with ${svgFiles.length} icons`)
	return svgFiles.length
}

function generateUtilitiesCSS(): string {
	return `@utility icon-* {
  --icon-color: --value(--color-*);
}
`
}

async function generateIndexCSS(iconSetNames: string[]): Promise<void> {
	const imports = iconSetNames.map((name) => `@import "./${name}.css";`)

	const output = imports.join("\n") + "\n"
	const outputFile = path.join(DIST_DIR, "index.css")
	await Bun.write(outputFile, output)

	console.log(`Generated ${outputFile}`)
}

async function main(): Promise<void> {
	// Clean and recreate dist directory
	if (fs.existsSync(DIST_DIR)) {
		fs.rmSync(DIST_DIR, { recursive: true })
	}
	fs.mkdirSync(DIST_DIR, { recursive: true })

	// Generate utilities.css
	const utilitiesFile = path.join(DIST_DIR, "utilities.css")
	await Bun.write(utilitiesFile, generateUtilitiesCSS())
	console.log(`Generated ${utilitiesFile}`)

	// Build each icon set
	const builtSets: string[] = []
	let totalIcons = 0

	for (const config of ICON_SETS) {
		const iconCount = await buildIconSet(config)
		if (iconCount > 0) {
			builtSets.push(config.name)
			totalIcons += iconCount
		}
	}

	// Generate index.css that imports all sets
	await generateIndexCSS(builtSets)

	console.log(`\nTotal: ${totalIcons} icons across ${builtSets.length} icon set(s)`)
}

main()
