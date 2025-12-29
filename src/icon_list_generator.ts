import { Glob } from "bun";
import * as path from "path";
import * as fs from "fs";

const SRC_DIR = import.meta.dir;
const ICONS_DIR = path.join(SRC_DIR, "icons");
const OUTPUT_DIR = path.join(SRC_DIR, "../docs/icons");

// This matches your existing set configuration
const ICON_SETS = [
	{
		name: "tabler-outline",
		directory: path.join(ICONS_DIR, "tabler/outline"),
		prefix: "tabler",
		suffix: "outline",
	},
	{
		name: "tabler-filled",
		directory: path.join(ICONS_DIR, "tabler/filled"),
		prefix: "tabler",
		suffix: "filled",
	},
	{
		name: "bootstrap",
		directory: path.join(ICONS_DIR, "bootstrap"),
		prefix: "bootstrap",
	},
	{
		name: "flags",
		directory: path.join(ICONS_DIR, "flags/4x3"),
		prefix: "flag",
	},
	{
		name: "flags-square",
		directory: path.join(ICONS_DIR, "flags/1x1"),
		prefix: "flag",
		suffix: "square",
	},
];

async function generateIconLists() {
	// Create output directory if it doesn't exist
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const glob = new Glob("**/*.svg");

	for (const set of ICON_SETS) {
		let markdown = `# ${set.name.toUpperCase()} Icons\n\n`;
		markdown += `Available utility classes for the \`${set.name}\` set:\n\n`;
		
		const files: string[] = [];

		if (!fs.existsSync(set.directory)) {
			console.warn(`⚠️  Directory not found: ${set.directory}`);
			continue;
		}

		for await (const file of glob.scan({ cwd: set.directory })) {
			// Extract name and handle nested paths (e.g. brand/github.svg -> brand-github)
			const iconName = file.replace(/\.svg$/, "").replace(/\//g, "-").toLowerCase();
			const utilityName = [set.prefix, iconName, set.suffix].filter(Boolean).join("-");
			files.push(`- \`${utilityName}\``);
		}

		if (files.length > 0) {
			markdown += files.sort().join("\n") + "\n";
			const fileName = `${set.name}.md`;
			const filePath = path.join(OUTPUT_DIR, fileName);
			
			await Bun.write(filePath, markdown);
			console.log(`✅ Generated: ${fileName} (${files.length} icons)`);
		}
	}
}

generateIconLists();
