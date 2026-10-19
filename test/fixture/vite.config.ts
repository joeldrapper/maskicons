import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vite"

// Builds one of the fixture's CSS files, e.g. `ENTRY=plugin.css vite build`
const entry = process.env.ENTRY ?? "plugin.css"

export default defineConfig({
	root: import.meta.dirname,
	logLevel: "warn",
	plugins: [tailwindcss()],
	build: {
		outDir: `dist/${entry.replace(/\.css$/, "")}`,
		emptyOutDir: true,
		rollupOptions: { input: entry },
	},
})
