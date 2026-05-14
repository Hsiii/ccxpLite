(function registerCcxpLiteLoginUi(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  const { loginLocale, loginSupport } = namespace;
  const { loginTabs } = namespace;
  if (!shared || !loginLocale || !loginSupport || !loginTabs) {
    return;
  }
  const loginTabsLib = loginTabs;
  const { getLocalizedStrings, moveChildNodes, removeNode } = shared;
  const { resolveLoginLocale, getLoginForm } = loginLocale;
  const { findLoginSourceCell } = loginSupport;
  function enhancePasswordVisibilityToggle(targetDocument: Document, rootNode: ParentNode) {
    const passwordFields = [
      ...rootNode.querySelectorAll<HTMLInputElement>(
        "input[name='passwd'], input[type='password']:not([name='passwd2'])",
      ),
    ];
    const seen = new Set<HTMLInputElement>();
    const strings = getLandingStrings(targetDocument);
    for (const field of passwordFields) {
      if (seen.has(field) || field.dataset.ccxpLitePasswordToggle === "true") {
        continue;
      }
      seen.add(field);
      field.type = "password";
      removeRedundantPasswordLabelEyeIcon(field);
      const wrapper = targetDocument.createElement("span");
      wrapper.className = "ccxp-lite-password-field";
      if (!field.parentNode) {
        continue;
      }
      field.parentNode.insertBefore(wrapper, field);
      wrapper.append(field);
      const toggleButton = targetDocument.createElement("button");
      toggleButton.type = "button";
      toggleButton.className = "ccxp-lite-password-toggle";
      toggleButton.setAttribute("aria-label", strings.showPassword);
      toggleButton.append(createPasswordVisibilityIcon(targetDocument, false));
      toggleButton.addEventListener("click", () => {
        const isHidden = field.type !== "text";
        field.type = isHidden ? "text" : "password";
        toggleButton.setAttribute(
          "aria-label",
          isHidden ? strings.hidePassword : strings.showPassword,
        );
        toggleButton.replaceChildren(createPasswordVisibilityIcon(targetDocument, isHidden));
      });
      wrapper.append(toggleButton);
      field.dataset.ccxpLitePasswordToggle = "true";
    }
  }

  function removeRedundantPasswordLabelEyeIcon(passwordField: HTMLInputElement) {
    const inlineScope = passwordField.closest("form") ?? passwordField.parentElement;
    if (inlineScope) {
      const legacyInlineToggles = [
        ...inlineScope.querySelectorAll(
          "svg#showPassword, svg#hidePassword, svg[onclick*='togglePassword']",
        ),
      ];
      for (const node of legacyInlineToggles) {
        const relation = node.compareDocumentPosition(passwordField);
        const beforeFieldRelations = new Set([
          Node.DOCUMENT_POSITION_FOLLOWING,
          Node.DOCUMENT_POSITION_FOLLOWING + Node.DOCUMENT_POSITION_CONTAINED_BY,
        ]);
        const isBeforeField = beforeFieldRelations.has(relation);
        if (isBeforeField) {
          node.remove();
        }
      }
    }
    const row = passwordField.closest("tr");
    if (!row || row.dataset.ccxpLitePasswordLabelCleaned === "true") {
      return;
    }
    const labelCell = row.querySelector("th, td");
    if (!labelCell) {
      return;
    }
    const labelText = labelCell.textContent.replaceAll(/\s+/g, " ").trim();
    const isPasswordLabel = /(\u5BC6\u78BC|password)/i.test(labelText);
    if (isPasswordLabel) {
      for (const node of labelCell.querySelectorAll("svg")) {
        node.remove();
      }
      for (const node of labelCell.querySelectorAll("a, button, span, i")) {
        const text = node.textContent.replaceAll(/\s+/g, " ").trim();
        const hasOnlyIconChild = node.querySelector("svg, img, i") !== null;
        if (text === "" && hasOnlyIconChild) {
          node.remove();
        }
      }
    }
    const eyePattern =
      /(eye|show|hide|visible|visibility|view|\u986F\u793A|\u96B1\u85CF|\u5BC6\u78BC)/i;
    const candidates = [...labelCell.querySelectorAll("img, svg, i, span, a, button")];
    for (const node of candidates) {
      const hints = [
        node.getAttribute("alt"),
        node.getAttribute("title"),
        node.getAttribute("aria-label"),
        node.getAttribute("class"),
        node.getAttribute("src"),
        node.textContent,
      ]
        .map((value) => (value ?? "").toLowerCase())
        .join(" ");
      if (hints.includes("\uD83D\uDC41") || eyePattern.test(hints)) {
        node.remove();
      }
    }
    row.dataset.ccxpLitePasswordLabelCleaned = "true";
  }

  function normalizeLoginFormLayout(rootNode: ParentNode) {
    const forms = [...rootNode.querySelectorAll<HTMLFormElement>("form")];
    for (const formNode of forms) {
      const formDocument =
        rootNode.nodeType === Node.DOCUMENT_NODE
          ? (rootNode as Document)
          : (rootNode.ownerDocument ?? undefined);
      if (!formDocument) {
        continue;
      }
      if (formNode.dataset.ccxpLiteFormStructured !== "true") {
        structureLoginFormRows(formDocument, formNode);
        rebuildFlatLoginFormLabels(formDocument, formNode);
        groupLoginFieldRows(formDocument, formNode);
      }
      formNode.classList.add("ccxp-lite-login-form");
      formNode.dataset.ccxpLiteFormStructured = "true";
    }
  }

  function structureLoginFormRows(targetDocument: Document, formNode: HTMLFormElement) {
    const rows = [...formNode.querySelectorAll<HTMLTableRowElement>("tr")];
    for (const [rowIndex, rowNode] of rows.entries()) {
      if (rowNode.dataset.ccxpLiteLoginRow === "true") {
        continue;
      }
      const cells = [...rowNode.querySelectorAll<HTMLElement>(":scope > th, :scope > td")];
      if (cells.length === 0) {
        continue;
      }
      const fieldPairs = collectLoginFieldPairs(rowNode, cells);
      if (fieldPairs.length === 0) {
        continue;
      }
      const replacementRows = fieldPairs.map((fieldPair, pairIndex) => {
        const fieldId = ensureFieldId(fieldPair.fieldNode as HTMLElement, rowIndex, pairIndex);
        return buildLoginFieldRow(targetDocument, fieldPair, fieldId, Math.max(1, cells.length));
      });
      rowNode.replaceWith(...replacementRows);
      for (const replacementRow of replacementRows) {
        replacementRow.dataset.ccxpLiteLoginRow = "true";
      }
      const table = rowNode.closest("table");
      if (table) {
        table.classList.add("ccxp-lite-login-form-table");
      }
    }
  }

  function rebuildFlatLoginFormLabels(targetDocument: Document, formNode: HTMLFormElement) {
    const fields = [
      ...formNode.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    ];
    for (const [fieldIndex, fieldNode] of fields.entries()) {
      const inputType = (fieldNode.getAttribute("type") ?? "text").toLowerCase();
      if (
        ["button", "checkbox", "file", "hidden", "image", "radio", "reset", "submit"].includes(
          inputType,
        )
      ) {
        continue;
      }
      if (fieldNode.parentNode !== formNode) {
        continue;
      }
      const labelSourceNode = findLegacyInlineLabelNode(fieldNode, formNode);
      if (!labelSourceNode) {
        continue;
      }
      const labelText = getNodeText(labelSourceNode);
      if (labelText === "") {
        continue;
      }
      const fieldId = ensureFieldId(fieldNode, fieldIndex);
      const labelNode = targetDocument.createElement("label");
      labelNode.className = "ccxp-lite-login-field-label";
      labelNode.setAttribute("for", fieldId);
      labelNode.textContent = labelText;
      labelSourceNode.replaceWith(labelNode);
    }
  }

  function buildLoginFieldRow(
    targetDocument: Document,
    fieldPair: {
      fieldNode: Element;
      fieldCell: ParentNode & Node;
      labelText: string;
    },
    fieldId: string,
    columnCount: number,
  ) {
    const row = targetDocument.createElement("tr");
    row.className = "ccxp-lite-login-field-row";
    const mergedCell = targetDocument.createElement("td");
    mergedCell.className = "ccxp-lite-login-field-cell";
    mergedCell.colSpan = columnCount;
    const fieldGroup = targetDocument.createElement("div");
    fieldGroup.className = "ccxp-lite-login-field";
    const labelRow = targetDocument.createElement("div");
    labelRow.className = "ccxp-lite-login-field-label-row";
    const label = targetDocument.createElement("label");
    label.className = "ccxp-lite-login-field-label";
    label.setAttribute("for", fieldId);
    label.textContent = resolveLoginFieldLabel(fieldPair, targetDocument);
    labelRow.append(label);
    const labelAccessory = buildLoginFieldLabelAccessory(targetDocument, fieldPair);
    if (labelAccessory) {
      labelRow.append(labelAccessory);
    }
    const controlWrap = targetDocument.createElement("div");
    controlWrap.className = "ccxp-lite-login-field-control";
    removeInlineLoginLabelNodes(fieldPair.fieldCell, fieldPair.fieldNode);
    moveChildNodes(fieldPair.fieldCell, controlWrap);
    fieldGroup.append(labelRow);
    fieldGroup.append(controlWrap);
    mergedCell.append(fieldGroup);
    row.append(mergedCell);
    return row;
  }

  function buildLoginFieldLabelAccessory(
    targetDocument: Document,
    fieldPair:
      | {
          fieldNode: Element;
        }
      | undefined,
  ) {
    const fieldName = (fieldPair?.fieldNode.getAttribute("name") ?? "").trim().toLowerCase();
    if (fieldName !== "account") {
      return undefined;
    }
    const strings = getLandingStrings(targetDocument);
    return loginTabsLib.createAccountFormatPopover(targetDocument, strings);
  }

  function attachAccountFormatInfo(targetDocument: Document, rootNode: ParentNode) {
    const accountFields = [
      ...rootNode.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
        "input[name='account'], textarea[name='account'], select[name='account']",
      ),
    ];
    for (const fieldNode of accountFields) {
      if (fieldNode.dataset.ccxpLiteAccountInfoAttached === "true") {
        continue;
      }
      const accessory = buildLoginFieldLabelAccessory(targetDocument, { fieldNode });
      if (!accessory) {
        continue;
      }
      const labelRow = getOrCreateLoginFieldLabelRow(targetDocument, rootNode, fieldNode);
      if (labelRow) {
        if (!labelRow.querySelector(".ccxp-lite-account-guide-info")) {
          labelRow.append(accessory);
        }
        fieldNode.dataset.ccxpLiteAccountInfoAttached = "true";
        continue;
      }
      const labelCell = fieldNode.closest("tr")?.querySelector<HTMLElement>("th, td");
      if (!labelCell || labelCell.querySelector(".ccxp-lite-account-guide-info")) {
        continue;
      }
      labelCell.append(targetDocument.createTextNode(" "));
      labelCell.append(accessory);
      fieldNode.dataset.ccxpLiteAccountInfoAttached = "true";
    }
  }

  function attachPasswordInfoPopover(targetDocument: Document, rootNode: ParentNode) {
    const passwordFields = [
      ...rootNode.querySelectorAll<HTMLInputElement>(
        "input[name='passwd'], input[name='password'], input[type='password']",
      ),
    ];
    for (const fieldNode of passwordFields) {
      if (
        fieldNode.name === "passwd2" ||
        fieldNode.dataset.ccxpLitePasswordInfoAttached === "true"
      ) {
        continue;
      }
      const strings = getLandingStrings(targetDocument);
      const shortcutButton = loginTabsLib.createPasswordHelpActionButton(targetDocument, strings);
      if (!shortcutButton) {
        continue;
      }
      const labelRow = getOrCreateLoginFieldLabelRow(targetDocument, rootNode, fieldNode);
      if (labelRow) {
        if (!labelRow.querySelector(".ccxp-lite-password-help-trigger")) {
          labelRow.append(shortcutButton);
        }
        fieldNode.dataset.ccxpLitePasswordInfoAttached = "true";
        continue;
      }
      const labelCell = fieldNode.closest("tr")?.querySelector<HTMLElement>("th, td");
      if (!labelCell || labelCell.querySelector(".ccxp-lite-password-help-trigger")) {
        fieldNode.dataset.ccxpLitePasswordInfoAttached = "true";
        continue;
      }
      labelCell.append(targetDocument.createTextNode(" "));
      labelCell.append(shortcutButton);
      fieldNode.dataset.ccxpLitePasswordInfoAttached = "true";
    }
  }

  function getOrCreateLoginFieldLabelRow(
    targetDocument: Document,
    rootNode: ParentNode,
    fieldNode: Element,
  ) {
    const fieldGroupRow = fieldNode
      .closest(".ccxp-lite-login-field")
      ?.querySelector<HTMLElement>(".ccxp-lite-login-field-label-row");
    if (fieldGroupRow) {
      return fieldGroupRow;
    }
    const standaloneLabel = findStandaloneLoginFieldLabel(rootNode, fieldNode);
    if (!standaloneLabel) {
      return undefined;
    }
    const existingRow = standaloneLabel.closest<HTMLElement>(".ccxp-lite-login-field-label-row");
    if (existingRow) {
      return existingRow;
    }
    const { parentNode } = standaloneLabel;
    if (!parentNode) {
      return undefined;
    }
    const labelRow = targetDocument.createElement("div");
    labelRow.className = "ccxp-lite-login-field-label-row";
    standaloneLabel.before(labelRow);
    labelRow.append(standaloneLabel);
    return labelRow;
  }

  function findStandaloneLoginFieldLabel(rootNode: ParentNode, fieldNode: Element) {
    const fieldId = fieldNode.getAttribute("id") ?? "";
    if (fieldId !== "") {
      const explicitLabel = rootNode.querySelector<HTMLLabelElement>(
        `label[for="${CSS.escape(fieldId)}"]`,
      );
      if (explicitLabel) {
        return explicitLabel;
      }
    }
    let siblingNode = fieldNode.previousSibling;
    while (siblingNode) {
      if (siblingNode.nodeType === Node.TEXT_NODE && getNodeText(siblingNode) === "") {
        siblingNode = siblingNode.previousSibling;
        continue;
      }
      if (siblingNode.nodeType !== Node.ELEMENT_NODE) {
        return undefined;
      }
      const siblingElement = siblingNode as HTMLElement;
      if (siblingElement.tagName.toLowerCase() === "label" && getNodeText(siblingElement) !== "") {
        return siblingElement as HTMLLabelElement;
      }
      return undefined;
    }
    return undefined;
  }

  function groupLoginFieldRows(targetDocument: Document, formNode: HTMLFormElement) {
    if (formNode.dataset.ccxpLiteFieldRowsGrouped === "true") {
      return;
    }
    const fieldRows = [
      ...formNode.querySelectorAll<HTMLTableRowElement>("tr.ccxp-lite-login-field-row"),
    ];
    if (fieldRows.length === 0) {
      return;
    }
    const fieldsContainer = targetDocument.createElement("div");
    fieldsContainer.className = "ccxp-lite-login-fields";
    const firstTable = fieldRows[0].closest("table");
    if (firstTable && firstTable.parentNode) {
      firstTable.parentNode.insertBefore(fieldsContainer, firstTable);
    } else {
      formNode.insertBefore(fieldsContainer, formNode.firstChild);
    }
    for (const rowNode of fieldRows) {
      const fieldGroup = rowNode.querySelector(".ccxp-lite-login-field");
      if (fieldGroup) {
        fieldsContainer.append(fieldGroup);
      }
      removeNode(rowNode);
    }
    for (const tableNode of formNode.querySelectorAll<HTMLTableElement>(
      "table.ccxp-lite-login-form-table",
    )) {
      if (!tableNode.querySelector("tr")) {
        removeNode(tableNode);
      }
    }
    const formElement = formNode;
    formElement.dataset.ccxpLiteFieldRowsGrouped = "true";
  }

  function collectLoginFieldPairs(
    rowNode: ParentNode,
    cells: readonly HTMLElement[],
  ): ReadonlyArray<{
    fieldNode: Element;
    fieldCell: HTMLElement;
    labelText: string;
  }> {
    const pairs: Array<{
      fieldNode: Element;
      fieldCell: HTMLElement;
      labelText: string;
    }> = [];
    const usedFieldCells = new Set<HTMLElement>();
    for (const [cellIndex, cellNode] of cells.entries()) {
      const fieldNode = findPrimaryFieldControl(cellNode);
      if (!fieldNode) {
        continue;
      }
      const fieldCell = fieldNode.closest<HTMLElement>("th, td") ?? cellNode;
      if (usedFieldCells.has(fieldCell)) {
        continue;
      }
      const fieldCellIndex = cells.indexOf(fieldCell);
      const labelCell = resolveLabelCellForField(
        cells,
        fieldCellIndex === -1 ? cellIndex : fieldCellIndex,
      );
      const labelText = getPreferredLoginLabelText(labelCell, fieldCell, fieldNode);
      pairs.push({
        fieldNode,
        fieldCell,
        labelText,
      });
      usedFieldCells.add(fieldCell);
    }
    if (pairs.length > 0) {
      return pairs;
    }
    const fallbackFieldNode = findPrimaryFieldControl(rowNode);
    if (!fallbackFieldNode) {
      return pairs;
    }
    const fallbackFieldCell = fallbackFieldNode.closest<HTMLElement>("th, td") ?? cells.at(-1);
    if (!fallbackFieldCell) {
      return pairs;
    }
    const fallbackLabelCell = resolveLabelCellForField(cells, cells.indexOf(fallbackFieldCell));
    pairs.push({
      fieldNode: fallbackFieldNode,
      fieldCell: fallbackFieldCell,
      labelText: getPreferredLoginLabelText(
        fallbackLabelCell,
        fallbackFieldCell,
        fallbackFieldNode,
      ),
    });
    return pairs;
  }

  function resolveLabelCellForField(cells: readonly HTMLElement[], fieldCellIndex: number) {
    for (let index = fieldCellIndex - 1; index >= 0; index--) {
      const candidate = cells[index];
      if (findPrimaryFieldControl(candidate)) {
        continue;
      }
      if (getNodeText(candidate) === "") {
        continue;
      }
      return candidate;
    }
    return cells[0];
  }

  function getNodeText(node: Node | undefined) {
    return ((node && node.textContent) ?? "").replaceAll(/\s+/g, " ").trim();
  }

  function findLegacyInlineLabelNode(fieldNode: Node, boundaryNode: Node) {
    let currentNode = fieldNode.previousSibling;
    while (currentNode && currentNode !== boundaryNode) {
      if (currentNode.nodeType === Node.TEXT_NODE && getNodeText(currentNode) === "") {
        currentNode = currentNode.previousSibling;
        continue;
      }
      if (currentNode.nodeType === Node.ELEMENT_NODE) {
        const tagName = (currentNode as Element).tagName.toLowerCase();
        if (tagName === "br") {
          currentNode = currentNode.previousSibling;
          continue;
        }
        if (["a", "button", "img", "svg"].includes(tagName)) {
          currentNode = currentNode.previousSibling;
          continue;
        }
        if (
          tagName === "label" &&
          (currentNode as Element).classList.contains("ccxp-lite-login-field-label")
        ) {
          return undefined;
        }
      }
      return getNodeText(currentNode) === "" ? undefined : currentNode;
    }
    return undefined;
  }

  function getPreferredLoginLabelText(
    labelCell: Node | undefined,
    fieldCell: Node | undefined,
    fieldNode: Element,
  ) {
    const explicitLabel = getNodeText(labelCell);
    if (explicitLabel !== "") {
      return explicitLabel;
    }
    return getInlineLoginLabelText(fieldCell, fieldNode);
  }

  function resolveLoginFieldLabel(
    fieldPair:
      | {
          fieldNode: Element;
          labelText: string;
        }
      | undefined,
    targetDocument: Document,
  ) {
    const explicitLabel = ((fieldPair && fieldPair.labelText) ?? "").trim();
    if (explicitLabel !== "") {
      return explicitLabel;
    }
    const fieldName = (fieldPair?.fieldNode.getAttribute("name") ?? "").trim().toLowerCase();
    const strings = getLandingStrings(targetDocument);
    if (fieldName === "account") {
      return strings.fieldAccount;
    }
    if (fieldName === "id") {
      return strings.fieldStudentId;
    }
    if (fieldName === "passwd" || fieldName === "password") {
      return strings.fieldPassword;
    }
    if (fieldName === "passwd2" || fieldName === "captcha" || fieldName === "code") {
      return strings.fieldVerificationCode;
    }
    return fieldName === "" ? strings.fieldGeneric : fieldName;
  }

  function getInlineLoginLabelText(fieldCell: Node | undefined, fieldNode: Node | undefined) {
    if (!fieldCell || !fieldNode) {
      return "";
    }
    const leadingNodes = collectLeadingNodesBeforeField(fieldCell, fieldNode);
    return leadingNodes
      .map((node) => getNodeText(node))
      .join(" ")
      .replaceAll(/\s+/g, " ")
      .trim();
  }

  function removeInlineLoginLabelNodes(fieldCell: Node | undefined, fieldNode: Node | undefined) {
    for (const node of collectLeadingNodesBeforeField(fieldCell, fieldNode)) {
      if (node.parentNode) {
        removeNode(node as ChildNode);
      }
    }
  }

  function collectLeadingNodesBeforeField(
    fieldCell: Node | undefined,
    fieldNode: Node | undefined,
  ): readonly Node[] {
    if (!fieldCell || !fieldNode || fieldNode.parentNode !== fieldCell) {
      return [];
    }
    const leadingNodes: Node[] = [];
    let currentNode = (fieldCell as ParentNode).firstChild;
    while (currentNode && currentNode !== fieldNode) {
      const nextNode = currentNode.nextSibling;
      const textContent = getNodeText(currentNode);
      const isBreak =
        currentNode.nodeType === Node.ELEMENT_NODE &&
        (currentNode as Element).tagName !== "" &&
        (currentNode as Element).tagName.toLowerCase() === "br";
      if (textContent !== "" || isBreak) {
        leadingNodes.push(currentNode);
      }
      currentNode = nextNode;
    }
    return leadingNodes;
  }

  function findPrimaryFieldControl(scopeNode: ParentNode) {
    const candidates = [
      ...scopeNode.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "input, select, textarea",
      ),
    ];
    return (
      candidates.find((field) => {
        const inputType = (field.getAttribute("type") ?? "text").toLowerCase();
        return !["button", "checkbox", "file", "hidden", "image", "radio", "submit"].includes(
          inputType,
        );
      }) ?? undefined
    );
  }

  function ensureFieldId(fieldNode: HTMLElement, rowIndex: number, pairIndex = 0) {
    if (fieldNode.id !== "") {
      return fieldNode.id;
    }
    const normalizedName = (fieldNode.getAttribute("name") ?? "field")
      .trim()
      .replaceAll(/[^\w-]+/g, "-")
      .replaceAll(/^-+|-+$/g, "");
    const baseName = normalizedName === "" ? "field" : normalizedName;
    const pairSuffix = pairIndex > 0 ? `-${pairIndex + 1}` : "";
    const generatedId = `ccxp-lite-${baseName}-${rowIndex + 1}${pairSuffix}`;
    const inputField = fieldNode;
    inputField.id = generatedId;
    return generatedId;
  }

  function removeLoginResetControls(rootNode: ParentNode) {
    const resetControls = [
      ...rootNode.querySelectorAll("form input[type='reset'], form button[type='reset']"),
    ];
    for (const controlNode of resetControls) {
      removeNode(controlNode);
    }
  }

  function forceCaptchaLabelDisplay(rootNode: ParentNode) {
    const captchaLabelPattern = /(\u9A57\u8B49\u78BC|captcha)/i;
    const spans = [...rootNode.querySelectorAll<HTMLSpanElement>("span")];
    for (const spanNode of spans) {
      const labelText = spanNode.textContent.replaceAll(/\s+/g, " ").trim();
      if (labelText === "" || !captchaLabelPattern.test(labelText)) {
        continue;
      }
      spanNode.style.display = "block";
    }
  }

  function replaceLoginFormImageButtons(targetDocument: Document, rootNode: ParentNode) {
    const imageSubmitInputs = [
      ...rootNode.querySelectorAll<HTMLInputElement>("form input[type='image']"),
    ];
    for (const inputNode of imageSubmitInputs) {
      if (inputNode.dataset.ccxpLiteImageButtonReplaced === "true") {
        continue;
      }
      if (shouldKeepLegacyLoginImageSubmit(inputNode)) {
        continue;
      }
      if (isVerificationAudioControl(inputNode)) {
        const audioButton = createAudioIconButtonFromImageInput(targetDocument, inputNode);
        inputNode.replaceWith(audioButton);
        audioButton.dataset.ccxpLiteImageButtonReplaced = "true";
        continue;
      }
      if (isAdjacentLoginClearControl(inputNode)) {
        removeNode(inputNode);
        continue;
      }
      const label = resolveLegacyImageButtonLabel(inputNode);
      if (label === "") {
        continue;
      }
      if (isClearActionLabel(label)) {
        removeNode(inputNode);
        continue;
      }
      const button = targetDocument.createElement("button");
      button.type = "submit";
      button.className = "button ccxp-lite-image-action-button";
      button.textContent = label;
      if (inputNode.id !== "") {
        button.id = inputNode.id;
      }
      if (inputNode.name !== "") {
        button.name = inputNode.name;
      }
      if (inputNode.title !== "") {
        button.title = inputNode.title;
      }
      if (inputNode.className !== "") {
        button.className = `${button.className} ${inputNode.className}`.trim();
      }
      if (inputNode.disabled) {
        button.disabled = true;
      }
      for (const attributeName of [
        "onclick",
        "formaction",
        "formmethod",
        "formenctype",
        "formtarget",
        "tabindex",
      ]) {
        const value = inputNode.getAttribute(attributeName);
        if (value !== null && value !== "") {
          button.setAttribute(attributeName, value);
        }
      }
      if (inputNode.hasAttribute("formnovalidate")) {
        button.setAttribute("formnovalidate", "");
      }
      inputNode.replaceWith(button);
      button.dataset.ccxpLiteImageButtonReplaced = "true";
    }
    const imageAnchors = [...rootNode.querySelectorAll<HTMLImageElement>("form a > img[alt]")];
    for (const imageNode of imageAnchors) {
      const anchor = imageNode.closest("a");
      if (!anchor || anchor.dataset.ccxpLiteImageButtonReplaced === "true") {
        continue;
      }
      if (isVerificationAudioControl(imageNode)) {
        anchor.classList.add("ccxp-lite-audio-icon-link");
        const imageLabel = resolveLegacyImageButtonLabel(imageNode);
        anchor.setAttribute(
          "aria-label",
          imageLabel === "" ? getLandingStrings(targetDocument).playVerificationAudio : imageLabel,
        );
        anchor.replaceChildren(createAudioIcon(targetDocument));
        anchor.dataset.ccxpLiteImageButtonReplaced = "true";
        continue;
      }
      if (isAdjacentLoginClearControl(imageNode)) {
        removeNode(anchor);
        continue;
      }
      const label = resolveLegacyImageButtonLabel(imageNode);
      if (label === "") {
        continue;
      }
      if (isClearActionLabel(label)) {
        removeNode(anchor);
        continue;
      }
      anchor.classList.add("ccxp-lite-image-link-button");
      anchor.replaceChildren(targetDocument.createTextNode(label));
      anchor.dataset.ccxpLiteImageButtonReplaced = "true";
    }
  }

  function wrapPrimaryLoginButtons(targetDocument: Document, rootNode: ParentNode) {
    const forms = [...rootNode.querySelectorAll<HTMLFormElement>("form")];
    for (const formNode of forms) {
      normalizeNativeLoginSubmitControls(targetDocument, formNode);
      const allActionButtons = [
        ...formNode.querySelectorAll<HTMLElement>(
          ".ccxp-lite-image-action-button, .ccxp-lite-image-link-button",
        ),
      ];
      if (allActionButtons.length === 0) {
        continue;
      }
      let actionGroup = formNode.querySelector<HTMLElement>(".ccxp-lite-login-action-group");
      if (!actionGroup) {
        actionGroup = targetDocument.createElement("div");
        actionGroup.className = "ccxp-lite-login-action-group";
        allActionButtons[0].parentNode?.insertBefore(actionGroup, allActionButtons[0]);
      }
      const primaryCandidate = allActionButtons.find((buttonNode) =>
        isPrimaryLoginActionLabel(buttonNode.textContent),
      );
      const primaryButton = primaryCandidate ?? allActionButtons[0];
      const orderedButtons = [
        primaryButton,
        ...allActionButtons.filter((buttonNode) => buttonNode !== primaryButton),
      ];
      for (const buttonNode of orderedButtons) {
        buttonNode.classList.remove(
          "ccxp-lite-login-primary-button",
          "ccxp-lite-login-secondary-button",
        );
        if (buttonNode === primaryButton) {
          buttonNode.classList.add("ccxp-lite-login-primary-button");
        } else {
          buttonNode.classList.add("ccxp-lite-login-secondary-button");
        }
        actionGroup.append(buttonNode);
      }
    }
  }

  function normalizeNativeLoginSubmitControls(targetDocument: Document, formNode: HTMLFormElement) {
    const nativeSubmitInputs = [
      ...formNode.querySelectorAll<HTMLInputElement>("input[type='submit']"),
    ];
    for (const inputNode of nativeSubmitInputs) {
      if (inputNode.dataset.ccxpLiteSubmitRebuilt === "true") {
        continue;
      }
      const label = inputNode.value.replaceAll(/\s+/g, " ").trim();
      if (label === "") {
        continue;
      }
      const button = targetDocument.createElement("button");
      button.type = "submit";
      button.className = "ccxp-lite-image-action-button";
      button.textContent = label;
      button.value = label;
      button.setAttribute("value", label);
      for (const attribute of inputNode.attributes) {
        const attributeName = attribute.name.toLowerCase();
        if (attributeName === "type" || attributeName === "class") {
          continue;
        }
        button.setAttribute(attribute.name, attribute.value);
      }
      if (inputNode.className !== "") {
        button.className = `${button.className} ${inputNode.className}`.trim();
      }
      if (inputNode.disabled) {
        button.disabled = true;
      }
      inputNode.replaceWith(button);
      button.dataset.ccxpLiteSubmitRebuilt = "true";
    }
    const nativeSubmitButtons = [
      ...formNode.querySelectorAll<HTMLButtonElement>("button[type='submit'], button:not([type])"),
    ];
    for (const buttonNode of nativeSubmitButtons) {
      if (
        buttonNode.classList.contains("ccxp-lite-audio-icon-button") ||
        buttonNode.classList.contains("ccxp-lite-image-action-button")
      ) {
        continue;
      }
      buttonNode.classList.add("ccxp-lite-image-action-button");
    }
  }

  function isPrimaryLoginActionLabel(rawLabel: string | undefined) {
    const normalizedLabel = (rawLabel ?? "").replaceAll(/\s+/g, "").trim().toLowerCase();
    if (normalizedLabel === "") {
      return false;
    }
    return /(\u767B\u5165|\u767B\u5F55|login|signin|logon|\u9001\u51FA|\u78BA\u5B9A|\u786E\u5B9A|submit)/i.test(
      normalizedLabel,
    );
  }

  function removeLoginSpacingArtifacts(targetDocument: Document, rootNode: ParentNode & Node) {
    for (const node of rootNode.querySelectorAll("br")) {
      removeNode(node);
    }
    const textNodes: Node[] = [];
    const walker = targetDocument.createTreeWalker(rootNode, NodeFilter.SHOW_TEXT);
    let currentNode = walker.nextNode();
    while (currentNode) {
      textNodes.push(currentNode);
      currentNode = walker.nextNode();
    }
    for (const textNode of textNodes) {
      const normalized = (textNode.textContent ?? "").replaceAll(/\u00A0|&nbsp;|&npsp;/gi, " ");
      if (normalized.trim() !== "") {
        textNode.textContent = normalized;
        continue;
      }
      if (textNode.parentNode) {
        removeNode(textNode as ChildNode);
      }
    }
  }

  function alignCaptchaMediaRow(targetDocument: Document, rootNode: ParentNode) {
    const captchaImages = [
      ...rootNode.querySelectorAll<HTMLImageElement>("img[src*='auth_img.php']"),
    ];
    for (const captchaImage of captchaImages) {
      const host = captchaImage.parentElement;
      if (!host) {
        continue;
      }
      const audioControl = host.querySelector(
        ".ccxp-lite-audio-icon-button, .ccxp-lite-audio-icon-link",
      );
      if (!audioControl) {
        continue;
      }
      const rowNode = captchaImage.closest("tr");
      if (rowNode) {
        rowNode.classList.add("ccxp-lite-captcha-row");
      }
      let mediaRow = host.querySelector(":scope > .ccxp-lite-captcha-media-row");
      if (!mediaRow) {
        mediaRow = targetDocument.createElement("span");
        mediaRow.className = "ccxp-lite-captcha-media-row";
        captchaImage.before(mediaRow);
      }
      if (captchaImage.parentNode !== mediaRow) {
        mediaRow.append(captchaImage);
      }
      if (audioControl.parentNode !== mediaRow) {
        mediaRow.append(audioControl);
      }
    }
  }

  function resolveLegacyImageButtonLabel(node: Element | HTMLInputElement | undefined) {
    if (!node) {
      return "";
    }
    const explicitAlt = normalizeLegacyButtonLabel(node.getAttribute("alt") ?? undefined);
    if (explicitAlt !== "") {
      return explicitAlt;
    }
    if (node instanceof HTMLInputElement && node.tagName.toLowerCase() === "input") {
      const parentForm = node.form;
      const pairedImage = parentForm
        ? parentForm.querySelector(`img[alt][src='${cssEscape(node.getAttribute("src") ?? "")}]`)
        : undefined;
      const pairedAlt = normalizeLegacyButtonLabel(pairedImage?.getAttribute("alt") ?? undefined);
      if (pairedAlt !== "") {
        return pairedAlt;
      }
    }
    const titleLabel = normalizeLegacyButtonLabel(node.getAttribute("title") ?? undefined);
    if (titleLabel !== "") {
      return titleLabel;
    }
    return "";
  }

  function normalizeLegacyButtonLabel(rawLabel: string | undefined) {
    return (rawLabel ?? "").replaceAll(/\s+/g, " ").trim();
  }

  function shouldKeepLegacyLoginImageSubmit(inputNode: HTMLInputElement) {
    if (!inputNode.form) {
      return false;
    }
    const action = (inputNode.form.getAttribute("action") ?? "").toLowerCase();
    const isLoginFlowForm =
      action.includes("pre_select_entry.php") || action.includes("select_entry.php");
    if (!isLoginFlowForm) {
      return false;
    }
    if (isVerificationAudioControl(inputNode) || isAdjacentLoginClearControl(inputNode)) {
      return false;
    }
    const label = resolveLegacyImageButtonLabel(inputNode);
    if (isClearActionLabel(label)) {
      return false;
    }
    return true;
  }

  function isClearActionLabel(label: string | undefined) {
    const normalized = (label ?? "").replaceAll(/\s+/g, "").toLowerCase();
    return (
      normalized.includes("\u6E05\u9664") ||
      normalized.includes("clear") ||
      normalized.includes("\u91CD\u586B") ||
      normalized.includes("reset")
    );
  }

  function isVerificationAudioControl(node: Element | undefined) {
    if (!node) {
      return false;
    }
    const row = node.closest("tr");
    if (row && row.querySelector("input[name='passwd2']")) {
      return true;
    }
    const hintText = [
      node.getAttribute("alt"),
      node.getAttribute("title"),
      node.getAttribute("src"),
      node.getAttribute("onclick"),
    ]
      .map((value) => (value ?? "").toLowerCase())
      .join(" ");
    return /(voice|audio|sound|speak|listen|\u8A9E\u97F3|\u6717\u8B80|\u64AD\u653E)/.test(hintText);
  }

  function isAdjacentLoginClearControl(node: Element | undefined) {
    if (!node) {
      return false;
    }
    const row = node.closest("tr");
    if (!row || row.querySelector("input[name='passwd2']")) {
      return false;
    }
    if (isClearLikeControl(node)) {
      return true;
    }
    const controls = collectLegacyActionControls(row);
    if (controls.length < 2) {
      return false;
    }
    const loginIndex = controls.findIndex((controlNode) => isLoginLikeControl(controlNode));
    const currentIndex = controls.findIndex(
      (controlNode) => controlNode === node || controlNode.contains(node),
    );
    if (loginIndex === -1 || currentIndex === -1 || currentIndex <= loginIndex) {
      return false;
    }
    const isTwoImagePair =
      controls.length === 2 && controls.every((controlNode) => isImageActionControl(controlNode));
    return isTwoImagePair;
  }

  function collectLegacyActionControls(row: Element): readonly Element[] {
    return [
      ...row.querySelectorAll(
        "input[type='image'], input[type='submit'], input[type='reset'], button, a > img",
      ),
    ].filter((node) => {
      if (node.matches("a > img")) {
        return true;
      }
      const type = (node.getAttribute("type") ?? "").toLowerCase();
      if (node.tagName === "BUTTON" && type === "") {
        return true;
      }
      return ["button", "image", "reset", "submit"].includes(type);
    });
  }

  function isImageActionControl(node: Element | undefined) {
    if (!node) {
      return false;
    }
    if (node.matches("a > img")) {
      return true;
    }
    return (node.getAttribute("type") ?? "").toLowerCase() === "image";
  }

  function isLoginLikeControl(node: Element) {
    const hints = extractControlHints(node);
    return /(\u767B\u5165|login|sign\s*-?\s*in|submit)/i.test(hints);
  }

  function isClearLikeControl(node: Element) {
    const type = (node.getAttribute("type") ?? "").toLowerCase();
    if (type === "reset") {
      return true;
    }
    const hints = extractControlHints(node);
    return /(\u6E05\u9664|\u91CD\u586B|clear|reset)/i.test(hints);
  }

  function extractControlHints(node: Element) {
    const anchor = node.matches("a > img") ? node.closest("a") : undefined;
    return [
      node.getAttribute("alt"),
      node.getAttribute("title"),
      node.getAttribute("name"),
      node.getAttribute("id"),
      node.getAttribute("value"),
      node.getAttribute("src"),
      node.getAttribute("onclick"),
      node.textContent,
      anchor && anchor.getAttribute("href"),
      anchor && anchor.getAttribute("onclick"),
      anchor && anchor.textContent,
    ]
      .map((value) => value ?? "")
      .join(" ")
      .toLowerCase();
  }

  function createAudioIconButtonFromImageInput(
    targetDocument: Document,
    inputNode: HTMLInputElement,
  ) {
    const button = targetDocument.createElement("button");
    button.type = "button";
    button.className = "ccxp-lite-audio-icon-button";
    button.append(createAudioIcon(targetDocument));
    const resolvedLabel = resolveLegacyImageButtonLabel(inputNode);
    const label =
      resolvedLabel === ""
        ? getLandingStrings(targetDocument).playVerificationAudio
        : resolvedLabel;
    button.setAttribute("aria-label", label);
    button.title = label;
    if (inputNode.id !== "") {
      button.id = inputNode.id;
    }
    if (inputNode.className !== "") {
      button.className = `${button.className} ${inputNode.className}`.trim();
    }
    if (inputNode.disabled) {
      button.disabled = true;
    }
    for (const attributeName of ["onclick", "tabindex"]) {
      const value = inputNode.getAttribute(attributeName);
      if (value !== null && value !== "") {
        button.setAttribute(attributeName, value);
      }
    }
    return button;
  }

  function getLandingStrings(targetDocument: Document): Readonly<Record<string, string>> {
    return getLocalizedStrings(
      resolveLoginLocale(
        targetDocument,
        targetDocument.querySelector("ul.links") ?? undefined,
        findLoginSourceCell(targetDocument, getLoginForm(targetDocument)) as ParentNode | undefined,
        getLoginForm(targetDocument) ?? undefined,
      ),
    );
  }

  function createAudioIcon(targetDocument: Document) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "16");
    icon.setAttribute("height", "16");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    for (const pathData of [
      "M11 5 6 9H2v6h4l5 4z",
      "M15.5 8.5a5 5 0 0 1 0 7",
      "M18.5 5.5a9 9 0 0 1 0 13",
    ]) {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      icon.append(path);
    }
    return icon;
  }

  function cssEscape(value: unknown) {
    const normalizedValue =
      typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : "";
    return normalizedValue.replaceAll("\\", "\\\\").replaceAll("'", String.raw`\'`);
  }

  function createPasswordVisibilityIcon(targetDocument: Document, visible: boolean) {
    const icon = targetDocument.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "14");
    icon.setAttribute("height", "14");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "2");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    if (visible) {
      for (const pathData of [
        "M10.733 5.076A10.744 10.744 0 0 1 12 5c4.596 0 8.51 2.934 9.938 7a10.454 10.454 0 0 1-1.077 2.167",
        "M14.084 14.158a3 3 0 0 1-4.242-4.242",
        "M17.479 17.499A10.75 10.75 0 0 1 12 19c-4.596 0-8.51-2.934-9.938-7a10.525 10.525 0 0 1 4.423-5.29",
        "M2 2l20 20",
      ]) {
        const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        icon.append(path);
      }
    } else {
      const path = targetDocument.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute(
        "d",
        "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      );
      icon.append(path);
      const circle = targetDocument.createElementNS("http://www.w3.org/2000/svg", "circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "3");
      icon.append(circle);
    }
    return icon;
  }
  namespace.loginUi = {
    attachAccountFormatInfo,
    attachPasswordInfoPopover,
    enhancePasswordVisibilityToggle,
    normalizeLoginFormLayout,
    removeLoginResetControls,
    forceCaptchaLabelDisplay,
    replaceLoginFormImageButtons,
    wrapPrimaryLoginButtons,
    removeLoginSpacingArtifacts,
    alignCaptchaMediaRow,
  };
})(globalThis);
