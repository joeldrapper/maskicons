// Compiles the fixture with the last release's CSS files and with the plugin, and checks they produce the same
// rules. Run with `aube run test`.
import { compile } from "@tailwindcss/node"
import { Scanner } from "@tailwindcss/oxide"
import * as assert from "node:assert/strict"
import * as fs from "node:fs"
import * as path from "node:path"

const FIXTURE_DIR = path.join(import.meta.dirname, "fixture")

const scanner = new Scanner({ sources: [{ base: FIXTURE_DIR, pattern: "markup.html", negated: false }] })
const candidates = scanner.scan()

async function build(entry: string): Promise<string> {
	const css = fs.readFileSync(path.join(FIXTURE_DIR, entry), "utf8")
	const compiler = await compile(css, { base: FIXTURE_DIR, onDependency() {} })
	return compiler.build(candidates)
}

// The icon and `icon-*` rules, as "selector { declarations }" with whitespace normalised
function iconRules(css: string): string[] {
	const rules: string[] = []
	for (const [, selector, body] of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)) {
		if (!/^(:where\(\.|\.icon-)/.test(selector.trim())) continue
		const declarations = body
			.split(/;\s*\n/)
			.map((declaration) => declaration.trim().replace(/;$/, "").replace(/\s+/g, " "))
			.filter(Boolean)
		rules.push(`${selector.trim()} { ${declarations.join("; ")} }`)
	}
	return rules
}

const iconClasses = fs
	.readFileSync(path.join(FIXTURE_DIR, "markup.html"), "utf8")
	.match(/\b(tabler|bootstrap|flag)-[a-z0-9-]+/g)!

for (const [release, plugin] of [
	["release.css", "plugin.css"],
	["release-sets.css", "plugin-sets.css"],
]) {
	const expected = iconRules(await build(release))
	assert.equal(expected.length, iconClasses.length + 3, `${release} should have a rule per icon and icon-* class`)
	const actual = iconRules(await build(plugin))

	assert.deepEqual([...actual].sort(), [...expected].sort(), `${plugin} should produce the same rules as ${release}`)
	assert.equal(new Set(actual).size, actual.length, `${plugin} should not repeat a rule`)

	// Only the icons in the markup, so nothing unused
	const selectors = actual.filter((rule) => rule.startsWith(":where(")).map((rule) => rule.match(/^:where\(\.([^)]+)\)/)![1])
	assert.deepEqual(selectors.sort(), [...iconClasses].sort(), `${plugin} should only contain the icons in markup.html`)

	console.log(`${plugin}: ${actual.length} rules match ${release}`)
}

// Unknown names and arbitrary values produce nothing, like the @utility version
{
	const css = fs.readFileSync(path.join(FIXTURE_DIR, "plugin.css"), "utf8")
	const compiler = await compile(css, { base: FIXTURE_DIR, onDependency() {} })
	const output = compiler.build(["tabler-nope-outline", "tabler-[x]", "flag-fr-outline", "icon-[red]", "icon-nope"])
	assert.deepEqual(iconRules(output), [])
	console.log("plugin.css: unknown and arbitrary classes produce no rules")
}

// No prefix may also be the root of a Tailwind utility, or its classes would produce that utility's CSS too
{
	const css = fs.readFileSync(path.join(FIXTURE_DIR, "none.css"), "utf8")
	const compiler = await compile(css, { base: FIXTURE_DIR, onDependency() {} })
	const output = compiler.build(iconClasses)
	assert.doesNotMatch(output, /^[.:]/m, "No Tailwind utility should match an icon class")
	console.log("none.css: no Tailwind utility matches an icon class")
}
