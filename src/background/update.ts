(function registerCcxpLiteUpdateWorker() {
  const RELOAD_MATCH_PATTERNS = [
    "https://www.ccxp.nthu.edu.tw/ccxp/INQUIRE/*",
    "https://ccxp.nthu.edu.tw/ccxp/INQUIRE/*",
    "https://oauth.ccxp.nthu.edu.tw/v1.1/authorize.php*",
  ] as const;

  async function reloadMatchingTabs() {
    const tabs = await chrome.tabs.query({ url: [...RELOAD_MATCH_PATTERNS] });
    await Promise.allSettled(
      tabs.flatMap((tab) =>
        tab.id === undefined ? [] : [chrome.tabs.reload(tab.id, { bypassCache: true })],
      ),
    );
  }

  chrome.runtime.onInstalled.addListener((details: Readonly<chrome.runtime.InstalledDetails>) => {
    if (details.reason !== "update") {
      return;
    }

    reloadMatchingTabs().catch(() => {
      // Ignore transient reload/query failures during extension update.
    });
  });
})();
