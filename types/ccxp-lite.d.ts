export {};

declare global {
  interface Window {
    CCXP_LITE?: any;
    main?: Window;
  }

  interface Error {
    code?: string;
  }

  var CCXP_LITE: any;
  var chrome: any;
}
