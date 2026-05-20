# ccxpLite

A lightweight browser extension that enhances usability of the NTHU academic information system ([CCXP](<(https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/)>)) with a cleaner experience.

## Feature

- Restructured login page prioritizing login usability
- Auto decaptcha for login page (99.95% accuracy) and OAuth page (98.79% accuracy)
- Save favorite functions for quick access
- Categorized full-screen menu for better navigation (optional)
- Saturation and texture suppression for a cleaner look
- Broader English support

## Download & Installation

We provide both [Google Web Store](https://chromewebstore.google.com/detail/glcnfmnbmknbphfgjgbokbbchahmiakk?utm_source=item-share-cb) and [Firebox Add-ons](https://addons.mozilla.org/zh-TW/firefox/addon/ccxplite/) support.

## Demo

| Screen            | Original                                                                                                   | Sidebar Mode                                                                                                  | Menu Mode                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Login             | <img src="demo/original/login.png" alt="Original login screen" height="200">                               | <img src="demo/sidebar/login.png" alt="Sidebar mode login screen" height="200">                               | <img src="demo/menu/login.png" alt="Menu mode login screen" height="200">                               |
| Main              | <img src="demo/original/main.png" alt="Original main screen" height="200">                                 | <img src="demo/sidebar/main.png" alt="Sidebar mode main screen" height="200">                                 | <img src="demo/menu/main.png" alt="Menu mode main screen" height="200">                                 |
| Category Expanded | <img src="demo/original/main-expanded.png" alt="Original expanded main screen" height="200">               | <img src="demo/sidebar/main-expanded.png" alt="Sidebar mode expanded main screen" height="200">               | <img src="demo/menu/main-expanded.png" alt="Menu mode expanded main screen" height="200">               |
| Funtion Selected  | <img src="demo/original/select-courses-selected.png" alt="Original 網路選課 selected screen" height="200"> | <img src="demo/sidebar/select-courses-selected.png" alt="Sidebar mode 網路選課 selected screen" height="200"> | <img src="demo/menu/select-courses-selected.png" alt="Menu mode 網路選課 selected screen" height="200"> |

## Decaptcha

The extension bundles decaptcha models from [ccxpDecaptcha](https://github.com/Hsiii/ccxpDecaptcha) and runs inference locally in the content script.
