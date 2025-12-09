# maskicons

Tailwind CSS v4 utilities for popular icon sets. Thanks to Tailwind’s tree-shaking, your output CSS will only include the icons you actually use.

## Supported Icon Sets

- **Bootstrap Icons** — [twbs/icons](https://github.com/twbs/icons)
- **Tabler Icons** — [tabler/tabler-icons](https://github.com/tabler/tabler-icons)

## Installation

```sh
npm install maskicons
```

## Usage

Import the package in your CSS:

```css
@import "tailwindcss";
@import "maskicons";
```

```html
<i class="tabler-outline-heart"></i>
<i class="tabler-filled-star"></i>
<i class="bootstrap-folder"></i>
```

Icons are rendered as masks and inherit the current text color:

```html
<i class="tabler-outline-heart text-red-500"></i>
```

## Sizing Icons

By default, icons are `1em`, which means they scale with the current text size. You can size them using Tailwind's `text-*` utilities:

```html
<i class="tabler-outline-heart text-sm"></i>
<i class="tabler-outline-heart text-base"></i>
<i class="tabler-outline-heart text-2xl"></i>
```

You can also use `size-*` utilities for explicit sizing:

```html
<i class="tabler-outline-heart size-4"></i>
<i class="tabler-outline-heart size-6"></i>
<i class="tabler-outline-heart size-8"></i>
```

## Icon Colors

By default, icons inherit the current text color. You can also use the `icon-*` utility to set a specific icon color. This can be applied to a parent element to color all icons within it:

```html
<div class="icon-blue-500">
  <i class="tabler-outline-heart"></i>
  <i class="tabler-outline-star"></i>
</div>
```

## Accessibility

Any text inside the icon element is visually hidden but remains accessible to screen readers. You can use this to provide alternative text:

```html
<button><i class="tabler-outline-trash">Delete</i></button>
```

## License

MIT © Joel Drapper

Bootstrap Icons are licensed under the [MIT License](https://github.com/twbs/icons/blob/main/LICENSE) © The Bootstrap Authors.

Tabler Icons are licensed under the [MIT License](https://github.com/tabler/tabler-icons/blob/main/LICENSE) © Paweł Kuna.
