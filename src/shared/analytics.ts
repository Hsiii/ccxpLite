(function registerCcxpLiteSharedAnalytics(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { sharedConstants, sharedDom } = namespace;
  if (!sharedConstants) {
    return;
  }

  const { GTM } = sharedConstants;
  const DEFAULT_DATA_LAYER_NAME = "dataLayer";
  const GTM_SCRIPT_MARKER = "ccxpLiteGtmScript";
  const GTM_SCRIPT_ATTRIBUTE = "data-ccxp-lite-gtm-script";
  const GTM_NOSCRIPT_MARKER = "ccxpLiteGtmNoscript";
  const GTM_NOSCRIPT_ATTRIBUTE = "data-ccxp-lite-gtm-noscript";
  const GTM_BOOTSTRAP_MARKER = "ccxpLiteGtmBootstrap";
  const PAGE_VIEW_MARKER = "ccxpLiteTrackedPageView";
  const DEFAULT_EVENT_NAME = "ccxp_lite";

  function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  function isArray<T>(value: unknown): value is T[] {
    return value !== null && typeof value === "object" && value.constructor === Array;
  }

  function normalizeDataLayerName(dataLayerName: string | undefined) {
    return typeof dataLayerName === "string" && dataLayerName.trim() !== ""
      ? dataLayerName.trim()
      : DEFAULT_DATA_LAYER_NAME;
  }

  function ensureDataLayer(
    dataLayerName = DEFAULT_DATA_LAYER_NAME,
  ): readonly CcxpLiteDataLayerEvent[] | undefined {
    const normalizedName = normalizeDataLayerName(dataLayerName);
    const existingValue = Reflect.get(runtimeScope, normalizedName) as unknown;
    if (existingValue === undefined) {
      const nextLayer: CcxpLiteDataLayerEvent[] = [];
      Reflect.set(runtimeScope, normalizedName, nextLayer);
      return nextLayer;
    }
    return isArray<CcxpLiteDataLayerEvent>(existingValue) ? existingValue : undefined;
  }

  function compactEventProperties(event: CcxpLiteDataLayerEvent) {
    return Object.fromEntries(
      Object.entries(event).filter(([, value]) => value !== undefined),
    ) as CcxpLiteDataLayerEvent;
  }

  function pushToDataLayer(
    event: CcxpLiteDataLayerEvent,
    options: {
      dataLayerName?: string;
    } = {},
  ) {
    const normalizedDataLayerName = normalizeDataLayerName(options.dataLayerName);
    const existingValue = Reflect.get(runtimeScope, normalizedDataLayerName) as unknown;
    let layer: CcxpLiteDataLayerEvent[];
    if (existingValue === undefined) {
      layer = [];
      Reflect.set(runtimeScope, normalizedDataLayerName, layer);
    } else if (isArray<CcxpLiteDataLayerEvent>(existingValue)) {
      layer = existingValue;
    } else {
      return undefined;
    }
    if (!isRecord(event)) {
      return undefined;
    }
    layer.push(event);
    return event;
  }

  function trackEvent(
    targetDocument: Document,
    payload: CcxpLiteDataLayerEvent,
    options: {
      dataLayerName?: string;
      eventName?: string;
    } = {},
  ) {
    return pushToDataLayer(
      compactEventProperties({
        event: options.eventName ?? DEFAULT_EVENT_NAME,
        page_host: targetDocument.location.hostname,
        page_path: targetDocument.location.pathname,
        page_title: targetDocument.title,
        ...payload,
      }),
      {
        dataLayerName: options.dataLayerName,
      },
    );
  }

  function ensureGoogleTagManager(
    targetDocument: Document,
    options: {
      containerId?: string;
      dataLayerName?: string;
      bootstrapEvent?: CcxpLiteDataLayerEvent;
    } = {},
  ) {
    const normalizedDataLayerName = normalizeDataLayerName(options.dataLayerName);
    const layer = ensureDataLayer(normalizedDataLayerName);
    const containerId =
      typeof options.containerId === "string" && options.containerId.trim() !== ""
        ? options.containerId.trim()
        : GTM.containerId;
    const targetDocumentElement = targetDocument.documentElement;

    if (targetDocumentElement.dataset[GTM_BOOTSTRAP_MARKER] !== "true") {
      pushToDataLayer(
        options.bootstrapEvent ?? {
          "gtm.start": Date.now(),
          event: "gtm.js",
        },
        { dataLayerName: normalizedDataLayerName },
      );
      targetDocumentElement.dataset[GTM_BOOTSTRAP_MARKER] = "true";
    }

    if (containerId === "") {
      return {
        containerId,
        dataLayerName: normalizedDataLayerName,
        dataLayer: layer,
        injected: false,
      };
    }

    const ensureHead =
      sharedDom?.ensureDocumentHead ??
      ((documentToUpdate: Document) => documentToUpdate.querySelector("head") ?? undefined);
    const ensureBody =
      sharedDom?.ensureDocumentBody ??
      ((documentToUpdate: Document) => documentToUpdate.querySelector("body") ?? undefined);
    const head = ensureHead(targetDocument);
    const body = ensureBody(targetDocument);
    if (!head || !body) {
      return {
        containerId,
        dataLayerName: normalizedDataLayerName,
        dataLayer: layer,
        injected: false,
      };
    }

    const existingScript = targetDocument.querySelector<HTMLScriptElement>(
      `[${GTM_SCRIPT_ATTRIBUTE}="true"]`,
    );
    if (!existingScript) {
      const gtmScript = targetDocument.createElement("script");
      const url = new URL("https://www.googletagmanager.com/gtm.js");
      url.searchParams.set("id", containerId);
      if (normalizedDataLayerName !== DEFAULT_DATA_LAYER_NAME) {
        url.searchParams.set("l", normalizedDataLayerName);
      }
      gtmScript.async = true;
      gtmScript.src = url.toString();
      gtmScript.dataset[GTM_SCRIPT_MARKER] = "true";
      head.append(gtmScript);
    }

    const existingNoscript = targetDocument.querySelector<HTMLScriptElement>(
      `[${GTM_NOSCRIPT_ATTRIBUTE}="true"]`,
    );
    if (!existingNoscript) {
      const noscript = targetDocument.createElement("noscript");
      const iframe = targetDocument.createElement("iframe");
      const url = new URL("https://www.googletagmanager.com/ns.html");
      url.searchParams.set("id", containerId);
      iframe.src = url.toString();
      iframe.height = "0";
      iframe.width = "0";
      iframe.style.display = "none";
      iframe.style.visibility = "hidden";
      noscript.dataset[GTM_NOSCRIPT_MARKER] = "true";
      noscript.append(iframe);
      body.prepend(noscript);
    }

    return {
      containerId,
      dataLayerName: normalizedDataLayerName,
      dataLayer: layer,
      injected: true,
    };
  }

  function trackPageView(
    targetDocument: Document,
    payload: CcxpLiteDataLayerEvent = {},
    options: {
      once?: boolean;
      dataLayerName?: string;
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
        eventName: "ccxp_lite_page_view",
        dataLayerName: options.dataLayerName,
      },
    );
  }

  namespace.sharedAnalytics = {
    ensureDataLayer,
    pushToDataLayer,
    trackEvent,
    ensureGoogleTagManager,
    trackPageView,
  };
})(globalThis);
