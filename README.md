# maskicons

Tailwind CSS v4 utilities for popular icon sets. This lets you include icons with Tailwind LSP auto-complete and thanks to Tailwind’s tree-shaking, your output CSS will only include the icons you actually use.

## Supported icon sets

- **Bootstrap Icons** — [twbs/icons](https://github.com/twbs/icons)
- **Tabler Icons** — [tabler/tabler-icons](https://github.com/tabler/tabler-icons)

## Installation

```sh
npm install maskicons
```

## Usage

Just import the package in your CSS file after `tailwindcss`:

```css
@import "tailwindcss";
@import "maskicons";
```

You can alternatively import just the icon sets that you need:

```css
@import "tailwindcss";
@import "maskicons/tabler";
@import "maskicons/bootstrap";
```

Then use the CSS classes on `<i>` tags to render icons.

```html
<i class="tabler-outline-heart"></i>
<i class="tabler-filled-star"></i>
<i class="bootstrap-folder"></i>
```

## Sizing

By default, icons are `1em`, which means they scale with the current font size. You can size them using Tailwind's `text-*` utilities:

```html
<i class="tabler-outline-heart text-sm"></i>
<i class="tabler-outline-heart text-base"></i>
<i class="tabler-outline-heart text-2xl"></i>
```

Alternatively, you can use `size-*` utilities for explicit sizing:

```html
<i class="tabler-outline-heart size-4"></i>
<i class="tabler-outline-heart size-6"></i>
<i class="tabler-outline-heart size-8"></i>
```

## Colors

By default, icons inherit the current text color. You can also use the `icon-*` utility to set a specific icon color. This can be applied to a parent element to color all icons inside it:

```html
<div class="icon-blue-500">
  <i class="tabler-outline-heart"></i>
  <i class="tabler-outline-star"></i>
</div>
```

## Positioning

By default, icons are displayed `inline-block` and vertically aligned to look great next to text content. But you can can easily override this with the `block` utility.

## Alternative text

Any text inside the icon element is visually hidden but remains accessible to screen readers. You can use this to provide alternative text:

```html
<button><i class="tabler-outline-trash">Delete</i></button>
```

## Low precedence

The icon utilities use `:where` selectors so they have the lowest precedence. This is why all other utilities such as `size-*` will override the defaults.

## Payload

The Tabler icons are ~687 bytes on average and the Bootstrap icons are ~914 bytes on average. They should compress well due to the duplicated rules. And Tailwind only includes the icons you actually use.

## License

- MIT © Joel Drapper
- Bootstrap Icons are licensed under the [MIT License](https://github.com/twbs/icons/blob/main/LICENSE) © The Bootstrap Authors.
- Tabler Icons are licensed under the [MIT License](https://github.com/tabler/tabler-icons/blob/main/LICENSE) © Paweł Kuna.
