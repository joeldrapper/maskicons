export interface IconSet {
	name: string
	// Path of the SVG directory, relative to src/icons
	directory: string
	prefix: string
	suffix?: string
	colored?: boolean
	aspectRatio: string
}

export const ICON_SETS: IconSet[] = [
	{
		name: "tabler-outline",
		directory: "tabler/outline",
		prefix: "tabler",
		suffix: "outline",
		aspectRatio: "1 / 1",
	},
	{
		name: "tabler-filled",
		directory: "tabler/filled",
		prefix: "tabler",
		suffix: "filled",
		aspectRatio: "1 / 1",
	},
	{
		name: "bootstrap",
		directory: "bootstrap",
		prefix: "bootstrap",
		aspectRatio: "1 / 1",
	},
	{
		name: "flags",
		directory: "flags/4x3",
		prefix: "flag",
		colored: true,
		aspectRatio: "4 / 3",
	},
	{
		name: "flags-square",
		directory: "flags/1x1",
		prefix: "flag",
		suffix: "square",
		colored: true,
		aspectRatio: "1 / 1",
	},
]
