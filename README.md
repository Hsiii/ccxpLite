# ccxpLite

A lightweight Chrome extension that enhances usability of the NTHU academic information system ([CCXP](<(https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/)>)) with a cleaner experience.

## Feature

- Restructured login page prioritizing login usability
- Auto decaptcha for login page (99.95% accuracy)
- Save favorite functions for quick access
- Categorized sidebar menu for better navigation
- Saturation and texture suppression for a cleaner look

## Download & Installation

The extension is published on [Google Web Store](https://chromewebstore.google.com/detail/glcnfmnbmknbphfgjgbokbbchahmiakk?utm_source=item-share-cb).

## Development

This repo uses Bun for local development and project tooling.

```bash
bun install
bun run lint
bun run typecheck
bun test
bun run build
```

Git hooks are managed by Husky, with staged-file linting and formatting on commit plus a full project check on push.

## Demo

### Login Page

| Before                                                            | After                                                           |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| <img src="demo/before/login.png" alt="Login Before" height="240"> | <img src="demo/after/login.png" alt="Login After" height="240"> |

### Menu layout

| Before                                                                | After                                                               |
| --------------------------------------------------------------------- | ------------------------------------------------------------------- |
| <img src="demo/before/menu.png" alt="Menu Before" height="240">       | <img src="demo/after/menu.png" alt="Menu After" height="240">       |
| <img src="demo/before/submenu.png" alt="Submenu Before" height="240"> | <img src="demo/after/submenu.png" alt="Submenu After" height="240"> |

## Decaptcha

The extension bundles a decaptcha model from [ccxpDecaptcha](https://github.com/Hsiii/ccxpDecaptcha) and runs inference locally in the content script.
