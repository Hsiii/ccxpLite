(function bootstrapCcxpLiteGa4Analytics() {
  const GA_ENDPOINT = "https://www.google-analytics.com/mp/collect";
  const CLIENT_ID_STORAGE_KEY = "ccxp-lite-ga4-client-id";
  const SESSION_STORAGE_KEY = "ccxp-lite-ga4-session";
  const SESSION_EXPIRATION_MS = 30 * 60 * 1000;
  const DEFAULT_ENGAGEMENT_TIME_MSEC = 100;
  const MESSAGE_TYPE = "ccxp-lite:analytics-event";

  interface Ga4Config {
    measurementId: string;
    apiSecret: string;
  }

  interface SessionState {
    id: string;
    lastActivityAt: number;
  }

  interface FavoriteStorageEnvelope {
    version: 1;
    updatedAt: number;
    ids: string[];
  }

  interface FavoriteStorageMessage {
    type: "ccxp-lite:favorites-get" | "ccxp-lite:favorites-set";
    key: string;
    value?: FavoriteStorageEnvelope;
  }

  let hasShownConfigWarning = false;

  function getGa4Config(): Ga4Config {
    return {
      measurementId: "G-Z6QQ37YNZP",
      apiSecret: "",
    };
  }

  function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === "object";
  }

  function getStorageArea() {
    try {
      return chrome.storage.local;
    } catch {
      return undefined;
    }
  }

  async function getStoredValue<T>(key: string) {
    const storageArea = getStorageArea();
    if (!storageArea) {
      return undefined;
    }
    return await new Promise<T | undefined>((resolve) => {
      storageArea.get([key], (result) => {
        resolve(result[key] as T | undefined);
      });
    });
  }

  async function setStoredValue(key: string, value: unknown) {
    const storageArea = getStorageArea();
    if (!storageArea) {
      return;
    }
    await new Promise<void>((resolve) => {
      storageArea.set({ [key]: value }, () => {
        resolve();
      });
    });
  }

  function createClientId() {
    const randomValue = Math.floor(Math.random() * 10_000_000_000);
    const unixTimestampSeconds = Math.floor(Date.now() / 1000);
    return `${randomValue}.${unixTimestampSeconds}`;
  }

  async function getOrCreateClientId() {
    const existingClientId = await getStoredValue<string>(CLIENT_ID_STORAGE_KEY);
    if (typeof existingClientId === "string" && existingClientId !== "") {
      return existingClientId;
    }
    const nextClientId = createClientId();
    await setStoredValue(CLIENT_ID_STORAGE_KEY, nextClientId);
    return nextClientId;
  }

  async function getOrCreateSession(now: number) {
    const existingSession = await getStoredValue<SessionState>(SESSION_STORAGE_KEY);
    if (
      existingSession &&
      typeof existingSession.id === "string" &&
      typeof existingSession.lastActivityAt === "number" &&
      now - existingSession.lastActivityAt < SESSION_EXPIRATION_MS
    ) {
      return existingSession;
    }
    const nextSession = {
      id: String(now),
      lastActivityAt: now,
    };
    await setStoredValue(SESSION_STORAGE_KEY, nextSession);
    return nextSession;
  }

  function normalizeParameterValue(value: unknown) {
    if (typeof value === "string") {
      return value;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "boolean") {
      return value ? "true" : "false";
    }
    return undefined;
  }

  function normalizeEventParams(params: CcxpLiteAnalyticsParams) {
    const entries = Object.entries(params)
      .map(([key, value]) => [key, normalizeParameterValue(value)] as const)
      .filter((entry): entry is readonly [string, string | number] => entry[1] !== undefined);
    return Object.fromEntries(entries) as Record<string, string | number>;
  }

  function isAnalyticsMessage(message: unknown): message is CcxpLiteAnalyticsMessage {
    return (
      isRecord(message) &&
      message.type === MESSAGE_TYPE &&
      typeof message.name === "string" &&
      isRecord(message.params)
    );
  }

  function isFavoriteStorageMessage(message: unknown): message is FavoriteStorageMessage {
    return (
      isRecord(message) &&
      (message.type === "ccxp-lite:favorites-get" || message.type === "ccxp-lite:favorites-set") &&
      typeof message.key === "string"
    );
  }

  async function postEvent(message: CcxpLiteAnalyticsMessage) {
    const { measurementId, apiSecret } = getGa4Config();
    if (measurementId === "" || apiSecret === "") {
      if (!hasShownConfigWarning) {
        hasShownConfigWarning = true;
        console.warn(
          "[ccxp-lite] GA4 analytics is disabled because MEASUREMENT_ID or API_SECRET is missing.",
        );
      }
      return;
    }

    const now = Date.now();
    const clientId = await getOrCreateClientId();
    const session = await getOrCreateSession(now);
    const engagementTimeMsec = Math.max(
      DEFAULT_ENGAGEMENT_TIME_MSEC,
      Math.min(now - session.lastActivityAt, SESSION_EXPIRATION_MS),
    );
    await setStoredValue(SESSION_STORAGE_KEY, {
      id: session.id,
      lastActivityAt: now,
    } satisfies SessionState);

    const payload = {
      client_id: clientId,
      events: [
        {
          name: message.name,
          params: {
            session_id: session.id,
            engagement_time_msec: engagementTimeMsec,
            ...normalizeEventParams(message.params),
          },
        },
      ],
    };

    const url = new URL(GA_ENDPOINT);
    url.searchParams.set("measurement_id", measurementId);
    url.searchParams.set("api_secret", apiSecret);

    try {
      await fetch(url.toString(), {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn("[ccxp-lite] Failed to send GA4 analytics event.", error);
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!isAnalyticsMessage(message)) {
      return;
    }
    postEvent(message).catch((error: unknown) => {
      console.warn("[ccxp-lite] Failed to process GA4 analytics event.", error);
    });
  });

  function favoriteMessageListener(
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void,
  ): boolean | undefined {
    if (!isFavoriteStorageMessage(message)) {
      return undefined;
    }
    if (message.type === "ccxp-lite:favorites-get") {
      getStoredValue<unknown>(message.key)
        .then((value) => {
          sendResponse(value);
        })
        .catch(() => {
          sendResponse(undefined);
        });
      return true;
    }
    setStoredValue(message.key, message.value)
      .then(() => {
        sendResponse(undefined);
      })
      .catch(() => {
        sendResponse(undefined);
      });
    return true;
  }
  chrome.runtime.onMessage.addListener(
    favoriteMessageListener as unknown as Parameters<
      typeof chrome.runtime.onMessage.addListener
    >[0],
  );
})();
