export function createLandingLoginHtml() {
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
                    <td>帳號</td>
                    <td><input type="text" name="account" value="" /></td>
                  </tr>
                  <tr>
                    <td>密碼 <svg id="showPassword"></svg></td>
                    <td><input type="password" name="passwd" value="" /></td>
                  </tr>
                  <tr>
                    <td>驗證碼</td>
                    <td>
                      <input type="text" name="passwd2" class="inputtext" value="" />
                      <div class="ccxp-lite-captcha-media-row">
                        <img src="auth_img.php?pwdstr=20260428-777" />
                      </div>
                    </td>
                  </tr>
                </table>
                <input type="hidden" name="fnstr" value="20260428-777" />
                <button type="submit">登入</button>
              </form>
            </td>
          </tr>
        </table>
        <ul class="links"><li><strong>中文</strong></li></ul>
      </body>
    </html>
  `;
}
