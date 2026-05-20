# ccxpLite
<img src="demo/sidebar/login.png" alt="ccxpLite demo image" >
A lightweight browser extension that improves the usability and navigation experience of the NTHU Academic Information System (CCXP). 

## Features

* Redesigned login page for improved usability and better announcement readability
* Automatic CAPTCHA solving for both CCXP login and OAuth verification (used in [eLearn](https://elearn.nthu.edu.tw/) and [eeclass](https://eeclass.nthu.edu.tw/)) with 99.95% and 98.79% accuracy respectively
* Faster access to frequently used functions with support for pinned functions and folders
* Two navigation layouts available: redesigned sidebar or full-screen menu
* Reduced visual clutter through saturation and texture suppression

## Installation

- [Google Web Store](https://chromewebstore.google.com/detail/glcnfmnbmknbphfgjgbokbbchahmiakk?utm_source=item-share-cb) 
- [Firebox Add-ons](https://addons.mozilla.org/zh-TW/firefox/addon/ccxplite/)

## Demo

| Screen            | Original                                                                                                   | Sidebar Mode                                                                                                  | Menu Mode                                                                                               |
| ----------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Login             | <img src="demo/original/login.png" alt="Original login screen" height="200">                               | <img src="demo/sidebar/login.png" alt="Sidebar mode login screen" height="200">                               | <img src="demo/menu/login.png" alt="Menu mode login screen" height="200">                               |
| Main              | <img src="demo/original/main.png" alt="Original main screen" height="200">                                 | <img src="demo/sidebar/main.png" alt="Sidebar mode main screen" height="200">                                 | <img src="demo/menu/main.png" alt="Menu mode main screen" height="200">                                 |
| Category Expanded | <img src="demo/original/main-expanded.png" alt="Original expanded main screen" height="200">               | <img src="demo/sidebar/main-expanded.png" alt="Sidebar mode expanded main screen" height="200">               | <img src="demo/menu/main-expanded.png" alt="Menu mode expanded main screen" height="200">               |
| Funtion Selected  | <img src="demo/original/select-courses-selected.png" alt="Original 網路選課 selected screen" height="200"> | <img src="demo/sidebar/select-courses-selected.png" alt="Sidebar mode 網路選課 selected screen" height="200"> | <img src="demo/menu/select-courses-selected.png" alt="Menu mode 網路選課 selected screen" height="200"> |

## Decaptcha

The extension bundles decaptcha models from [ccxpDecaptcha](https://github.com/Hsiii/ccxpDecaptcha) and runs inference locally in the content script.
