export function createLoginHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <table>
          <tr>
            <td>
              <form action="select_entry.php">
                <table>
                  <tr>
                    <td>\u5E33\u865F</td>
                    <td><input type="text" name="account" value="" /></td>
                  </tr>
                  <tr>
                    <td>\u5BC6\u78BC <svg id="showPassword"></svg></td>
                    <td><input type="password" name="passwd" value="" /></td>
                  </tr>
                  <tr>
                    <td>\u9A57\u8B49\u78BC</td>
                    <td>
                      <input type="text" name="passwd2" class="inputtext" value="" />
                      <div class="ccxp-lite-captcha-media-row">
                        <img src="auth_img.php?pwdstr=20260428-777" />
                      </div>
                    </td>
                  </tr>
                </table>
                <input type="hidden" name="fnstr" value="20260428-777" />
                <button type="submit">\u767B\u5165</button>
              </form>
            </td>
          </tr>
        </table>
        <ul class="links"><li><strong>\u4E2D\u6587</strong></li></ul>
      </body>
    </html>
  `;
}

export function createOauthLoginHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <form method="post" action="/v1.1/authorize.php">
          <label>
            <span>\u5B78\u865F\u3001\u54E1\u5DE5\u7DE8\u865F</span>
            <input type="text" name="id" value="" />
          </label>
          <label>
            <span>\u5BC6\u78BC</span>
            <input type="password" name="password" value="" />
          </label>
          <label>
            <span>\u9A57\u8B49\u78BC</span>
            <input type="number" name="captcha" value="" />
          </label>
          <div class="oauth-captcha-shell">
            <img alt="CAPTCHA Image" src="captchaimg.php?id=demo-20260511" />
            <a href="#" onclick="securimageRefreshCaptcha('captcha_image', 'captcha_image_audioObj'); return false">
              <img alt="Refresh Image" src="refresh.png" />
            </a>
            <a href="captchaplay.php?id=demo-20260511">
              <img alt="Play CAPTCHA Audio" src="audio.png" />
            </a>
          </div>
          <button type="submit">\u767B\u5165</button>
        </form>
      </body>
    </html>
  `;
}

export function createEnglishLoginAnnouncementHtml(): string {
  return `
    <!doctype html>
    <html lang="en">
      <head></head>
      <body>
        <a href="forget_en.php?lang=E">Cannot sign in?</a>
        <table>
          <tr>
            <td width="60%" style="min-width: 30em;" valign="top" align="center"></td>
            <td width="3%"></td>
            <td width="35%" valign="top">
              <div align="right"><a href="inquire_cpr_en.html" target="_blank">&gt;&gt; <u>Information</u> &lt;&lt;</a></div>
              <table width="95%" border="0" cellpadding="3" cellspacing="0">
                <tr>
                  <td colspan="2" class="board_item">System News</td>
                </tr>
                <tr>
                  <td class="board_subject">Date</td>
                  <td class="board_subject">Subject</td>
                </tr>
                <tr>
                  <td class="board_0">2026/05/11</td>
                  <td class="board_0">English system news item number one</td>
                </tr>
                <tr>
                  <td class="board_1">2026/05/10</td>
                  <td class="board_1">English system news item number two</td>
                </tr>
                <tr>
                  <td class="board_0">2026/05/09</td>
                  <td class="board_0">English system news item number three</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function createEnglishLoginHtml(): string {
  return `
    <!doctype html>
    <html lang="en">
      <head></head>
      <body>
        <a href="forget_en.php?lang=E">Cannot sign in?</a>
        <table>
          <tr>
            <td>
              <form action="select_entry.php">
                <table>
                  <tr>
                    <td>Account</td>
                    <td><input type="text" name="account" value="" /></td>
                  </tr>
                  <tr>
                    <td>Password</td>
                    <td><input type="password" name="passwd" value="" /></td>
                  </tr>
                  <tr>
                    <td>Verification Code</td>
                    <td><input type="text" name="passwd2" class="inputtext" value="" /></td>
                  </tr>
                </table>
                <button type="submit">Login</button>
              </form>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function createChineseLoginAnnouncementHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <table>
          <tr>
            <td width="60%" style="min-width: 30em;" valign="top" align="center"></td>
            <td width="3%"></td>
            <td width="35%" valign="top">
              <div align="right"><a href="inquire_cpr.html" target="_blank">&gt;&gt; <u>\u670D\u52D9\u96FB\u8A71</u> &lt;&lt;</a></div>
              <table width="95%" border="0" cellpadding="3" cellspacing="0">
                <tr>
                  <td colspan="2" class="board_item">\u7CFB\u7D71\u516C\u544A</td>
                </tr>
                <tr>
                  <td class="board_subject">\u65E5\u671F</td>
                  <td class="board_subject">\u4E3B\u984C</td>
                </tr>
                <tr>
                  <td class="board_0">2022/12/03</td>
                  <td class="board_0">\u3010\u7CFB\u7D71\u516C\u544A\u3011 \u9078\u8AB2\u7CFB\u7D71\u7DAD\u8B77\u901A\u77E5</td>
                </tr>
                <tr>
                  <td class="board_1">2022/12/01</td>
                  <td class="board_1">\u4E00\u822C\u516C\u544A\u5167\u5BB9\u66F4\u65B0\u901A\u77E5</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function createChineseLoginAnnouncementWithEmptyBoldHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <table>
          <tr>
            <td width="60%" style="min-width: 30em;" valign="top" align="center"></td>
            <td width="3%"></td>
            <td width="35%" valign="top">
              <div align="right"><a href="inquire_cpr.html" target="_blank">&gt;&gt; <u>\u670D\u52D9\u96FB\u8A71</u> &lt;&lt;</a></div>
              <table width="95%" border="0" cellpadding="3" cellspacing="0">
                <tr>
                  <td colspan="2" class="board_item">\u7CFB\u7D71\u516C\u544A</td>
                </tr>
                <tr>
                  <td class="board_subject">\u65E5\u671F</td>
                  <td class="board_subject">\u4E3B\u984C</td>
                </tr>
                <tr>
                  <td class="board_0">2026/05/11</td>
                  <td class="board_0">
                    \u3010\u8A3B\u518A\u7D44\u516C\u544A\u3011
                    <b style="color:#DD0000;padding:3px;border-bottom:#333333 1px dotted;"></b>
                    <p style="color:#DD0000;">\u8ACB\u66F4\u65B0\u500B\u4EBA\u8CC7\u6599</p>
                  </td>
                </tr>
                <tr>
                  <td class="board_1">2026/05/10</td>
                  <td class="board_1">\u4E00\u822C\u516C\u544A\u5167\u5BB9\u66F4\u65B0\u901A\u77E5</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export function createLoginWithTabsHtml(): string {
  return `
    <!doctype html>
    <html lang="zh">
      <head></head>
      <body>
        <table>
          <tr>
            <td>
              <form action="select_entry.php">
                <table>
                  <tr>
                    <td>\u5E33\u865F</td>
                    <td><input type="text" name="account" value="" /></td>
                  </tr>
                  <tr>
                    <td>\u5BC6\u78BC <svg id="showPassword"></svg></td>
                    <td><input type="password" name="passwd" value="" /></td>
                  </tr>
                  <tr>
                    <td>\u9A57\u8B49\u78BC</td>
                    <td>
                      <input type="text" name="passwd2" class="inputtext" value="" />
                      <div class="ccxp-lite-captcha-media-row">
                        <img src="auth_img.php?pwdstr=20260428-777" />
                      </div>
                    </td>
                  </tr>
                </table>
                <input type="hidden" name="fnstr" value="20260428-777" />
                <button type="submit">\u767B\u5165</button>
              </form>
            </td>
          </tr>
        </table>
        <div class="tab">
          <button class="active">\u5B78\u3000\u751F</button>
          <button>\u6821\u3000\u53CB</button>
          <button>\u6559\u8077\u54E1</button>
          <button>\u53D7\u6B3E\u4EBA(\u5EE0\u5546)</button>
          <button>\u5176\u3000\u4ED6</button>
          <button>\u63D0\u9192\u4E8B\u9805</button>
        </div>
        <div class="tabcontent"><p>legacy student panel</p></div>
        <div class="tabcontent"><p>legacy alumni panel</p></div>
        <div class="tabcontent"><p>legacy staff panel</p></div>
        <div class="tabcontent"><p>legacy vendor panel</p></div>
        <div class="tabcontent"><p>legacy other panel</p></div>
        <div class="tabcontent"><p>legacy reminder panel</p></div>
        <div align="right"><a href="inquire_cpr.html">&gt;&gt; \u670D\u52D9\u96FB\u8A71 &lt;&lt;</a></div>
        <a href="forget.php?lang=zh">\u7121\u6CD5\u767B\u5165</a>
        <ul class="links"><li><strong>\u4E2D\u6587</strong></li></ul>
      </body>
    </html>
  `;
}
