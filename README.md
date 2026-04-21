# ccxpLite
A lightweight Chrome extension that enhances usability of the NTHU academic information system ([CCXP]((https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/))) with a cleaner experience.

## Feature
- Restructured login page prioritizing login usability
- Auto decaptcha for login page
- Save favorite functions for quick access
- Categorized sidebar instead of scattered functions
- Saturation and texture suppression for a cleaner look

## Installation
The extension is published on [Google Web Store](https://chromewebstore.google.com/detail/glcnfmnbmknbphfgjgbokbbchahmiakk?utm_source=item-share-cb).

## Demo
### Login Page
| Before | After |
|--------|-------|
| <img src="demo/before/login.png" alt="Login Before" height="240"> | <img src="demo/after/login.png" alt="Login After" height="240"> |

### Menu layout
| Before | After |
|--------|-------|
| <img src="demo/before/menu.png" alt="Menu Before" height="240"> | <img src="demo/after/menu.png" alt="Menu After" height="240"> |
| <img src="demo/before/submenu.png" alt="Submenu Before" height="240"> | <img src="demo/after/submenu.png" alt="Submenu After" height="240"> |

## Decaptcha
The extension bundles the decaptcha model and runs inference locally in the content script.
When `../ccxpDecaptcha/decaptcha/tiny_net.pt` is available, the build regenerates `src/content.decaptcha.model.js` from that checkpoint before packaging.
