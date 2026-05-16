(function registerCcxpLiteSharedAnalytics(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  runtimeScope.CCXP_LITE ??= {};
  const namespace = runtimeScope.CCXP_LITE;
  const { sharedDom } = namespace;

  const DEFAULT_EVENT_NAME = "ccxp_lite";
  const PAGE_VIEW_EVENT_NAME = "ccxp_lite_page_view";
  const PAGE_VIEW_MARKER = "ccxpLiteTrackedPageView";
  const MESSAGE_TYPE = "ccxp-lite:analytics-event";

  function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  function compactEventProperties(event: CcxpLiteAnalyticsParams) {
    return Object.fromEntries(
      Object.entries(event).filter(([, value]) => value !== undefined),
    ) as CcxpLiteAnalyticsParams;
  }

  function sendAnalyticsMessage(message: CcxpLiteAnalyticsMessage) {
    const runtime = sharedDom?.getRuntimeSafely();
    if (!runtime) {
      return false;
    }
    try {
      chrome.runtime.sendMessage(message, () => undefined);
      return true;
    } catch {
      sharedDom?.ensureContextValid();
      return false;
    }
  }

  function trackEvent(
    targetDocument: Document,
    payload: CcxpLiteAnalyticsParams,
    options: {
      eventName?: string;
    } = {},
  ) {
    if (!isRecord(payload)) {
      return undefined;
    }
    const params = compactEventProperties({
      page_host: targetDocument.location.hostname,
      page_path: targetDocument.location.pathname,
      page_title: targetDocument.title,
      page_location: targetDocument.location.href,
      ...payload,
    });
    const message: CcxpLiteAnalyticsMessage = {
      type: MESSAGE_TYPE,
      name: options.eventName ?? DEFAULT_EVENT_NAME,
      params,
    };
    sendAnalyticsMessage(message);
    return message;
  }

  function trackPageView(
    targetDocument: Document,
    payload: CcxpLiteAnalyticsParams = {},
    options: {
      once?: boolean;
    } = {},
  ) {
    const targetDocumentElement = targetDocument.documentElement;
    if (options.once !== false && targetDocumentElement.dataset[PAGE_VIEW_MARKER] === "true") {
      return undefined;
    }
    if (options.once !== false) {
      targetDocumentElement.dataset[PAGE_VIEW_MARKER] = "true";
    }
    return trackEvent(
      targetDocument,
      compactEventProperties({
        feature: "page",
        action: "view",
        ...payload,
      }),
      {
        eventName: PAGE_VIEW_EVENT_NAME,
      },
    );
  }

  namespace.sharedAnalytics = {
    trackEvent,
    trackPageView,
  };
  if (namespace.shared) {
    namespace.shared.trackEvent = trackEvent;
    namespace.shared.trackPageView = trackPageView;
  }
})(globalThis);
