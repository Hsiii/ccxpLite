(() => {
  const runtimeScope = globalThis as typeof globalThis & {
    CCXP_LITE?: CcxpLiteNamespace;
  };
  runtimeScope.CCXP_LITE ??= {};
})();
