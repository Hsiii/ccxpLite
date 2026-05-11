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
