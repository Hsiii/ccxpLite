export {};

declare global {
  type CcxpLiteLocale = "en" | "zh";

  interface CcxpLiteTensorSource {
    shape?: number[];
    data?: ArrayLike<number>;
  }

  interface CcxpLitePreparedTensor {
    shape: number[];
    data: Float32Array;
  }

  interface CcxpLitePreparedModel {
    digits: number;
    eps: number;
    cropRight: number;
    tensors: Record<string, CcxpLitePreparedTensor>;
  }

  interface CcxpLiteDecaptchaModel {
    digits?: number;
    eps?: number;
    cropRight?: number;
    tensors?: Record<string, CcxpLiteTensorSource>;
    preparedTensors?: Record<string, CcxpLitePreparedTensor>;
  }

  interface CcxpLiteClickLinkArgs {
    name: string;
    url: string;
  }

  interface CcxpLiteSidebarLinkItem {
    id: string;
    legacyId?: string;
    label: string;
    pathSegments?: string[];
    href?: string;
    target?: string;
    clickLinkArgs?: CcxpLiteClickLinkArgs | null;
  }

  interface CcxpLiteSidebarGroup {
    id: string;
    label: string;
    directLinks: CcxpLiteSidebarLinkItem[];
    sections: CcxpLiteSidebarGroup[];
    kind: "group" | "category";
    emptyMessage?: string;
    icon?: string;
    summary?: string;
  }

  interface CcxpLiteSidebarLinkNode {
    id: string;
    label: string;
    linkItem: CcxpLiteSidebarLinkItem;
    kind: "link";
  }

  interface CcxpLiteSidebarSectionNode extends CcxpLiteSidebarGroup {
    kind: "group";
  }

  interface CcxpLiteSidebarCategoryNode extends CcxpLiteSidebarGroup {
    kind: "category";
  }

  type CcxpLiteSidebarTreeNode =
    | CcxpLiteSidebarLinkNode
    | CcxpLiteSidebarSectionNode
    | CcxpLiteSidebarCategoryNode;

  interface CcxpLiteSidebarModel {
    favorites: CcxpLiteSidebarCategoryNode;
    categories: CcxpLiteSidebarCategoryNode[];
  }

  interface CcxpLiteLegacySidebarDocNode {
    desc?: string;
    link?: string;
  }

  interface CcxpLiteLegacySidebarFolderNode extends CcxpLiteLegacySidebarDocNode {
    children: Array<CcxpLiteLegacySidebarFolderNode | CcxpLiteLegacySidebarDocNode>;
  }

  interface CcxpLiteCaptchaField {
    input: HTMLInputElement;
    image: HTMLImageElement;
    mediaRow: HTMLElement;
    scope: ParentNode;
  }

  interface CcxpLiteCaptchaAutofillState extends CcxpLiteCaptchaField {
    lastRequestedSrc: string;
    requestToken: number;
    pendingRequest: Promise<string> | null;
    pendingSrc: string;
    failedSrc: string;
    cachedAnswer: string;
    cachedSrc: string;
    timeoutFlashTimer?: number | null;
  }

  interface CcxpLitePe14dSnapshot {
    actionName: string;
    createdAt: number;
    pathname: string;
    scrollX: number;
    scrollY: number;
    activeName: string;
    activeId: string;
    bodyScrollTop: number;
    formId: string;
  }

  interface CcxpLiteWrappedSubmit {
    (form: HTMLFormElement, actionName?: string, actionValue?: string): unknown;
    __ccxpLiteWrapped?: boolean;
    __ccxpLiteOriginal?: CcxpLiteWrappedSubmit;
  }

  interface Window {
    CCXP_LITE?: {
      decaptchaModel?: CcxpLiteDecaptchaModel;
      [key: string]: any;
    };
    main?: Window;
    toSubmit?: CcxpLiteWrappedSubmit;
  }

  interface Error {
    code?: string;
  }

  var CCXP_LITE: any;
  var module:
    | {
        exports?: unknown;
      }
    | undefined;
}
