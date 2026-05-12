(function registerCcxpLiteLoginTabs(globalScope: typeof globalThis) {
  const runtimeScope = globalScope;
  const namespace = runtimeScope.CCXP_LITE ?? {};
  const { shared } = namespace;
  if (!shared) {
    return;
  }
  const { getLocalizedStrings } = shared;

  function createSection(targetDocument: Document, className: string) {
    const section = targetDocument.createElement("section");
    section.className = `ccxp-lite-landing-section ${className}`;
    return section;
  }

  function createAccountGuide(
    targetDocument: Document,
    strings: Readonly<Record<string, string>> = getLocalizedStrings("zh"),
    supportLinks?: HTMLElement,
  ) {
    const copy = getGuideCopy(strings, targetDocument);
    const shell = targetDocument.createElement("section");
    shell.className = "ccxp-lite-account-guide";

    const header = targetDocument.createElement("div");
    header.className = "ccxp-lite-account-guide-header";

    const titleWrap = targetDocument.createElement("div");
    titleWrap.className = "ccxp-lite-account-guide-title-wrap";

    const eyebrow = targetDocument.createElement("p");
    eyebrow.className = "ccxp-lite-account-guide-eyebrow";
    eyebrow.textContent = copy.eyebrow;
    titleWrap.append(eyebrow);

    const title = targetDocument.createElement("h2");
    title.className = "ccxp-lite-account-guide-title";
    title.textContent = copy.title;
    titleWrap.append(title);
    header.append(titleWrap);

    if (supportLinks) {
      header.append(supportLinks);
    }
    shell.append(header);

    const grid = targetDocument.createElement("div");
    grid.className = "ccxp-lite-account-guide-grid";
    for (const cardSpec of copy.cards) {
      grid.append(buildGuideCard(targetDocument, cardSpec));
    }
    shell.append(grid);

    const reminder = targetDocument.createElement("aside");
    reminder.className = "ccxp-lite-account-guide-note";

    const reminderTitle = targetDocument.createElement("h3");
    reminderTitle.className = "ccxp-lite-account-guide-note-title";
    reminderTitle.textContent = copy.reminder.label;
    reminder.append(reminderTitle);

    const reminderList = targetDocument.createElement("ul");
    reminderList.className = "ccxp-lite-account-guide-note-list";
    for (const itemText of copy.reminder.items) {
      const item = targetDocument.createElement("li");
      item.textContent = itemText;
      reminderList.append(item);
    }
    reminder.append(reminderList);
    shell.append(reminder);

    return shell;
  }

  function buildGuideCard(
    targetDocument: Document,
    spec: Readonly<{
      label: string;
      items: readonly string[];
      accent: string;
    }>,
  ) {
    const card = targetDocument.createElement("article");
    card.className = `ccxp-lite-account-guide-card ${spec.accent}`;

    const heading = targetDocument.createElement("h3");
    heading.className = "ccxp-lite-account-guide-card-title";
    heading.textContent = spec.label;
    card.append(heading);

    const list = targetDocument.createElement("ul");
    list.className = "ccxp-lite-account-guide-card-list";
    for (const itemText of spec.items) {
      const item = targetDocument.createElement("li");
      item.textContent = itemText;
      list.append(item);
    }
    card.append(list);

    return card;
  }

  function getGuideCopy(
    strings: Readonly<Record<string, string>>,
    targetDocument: Document,
  ): Readonly<{
    eyebrow: string;
    title: string;
    cards: ReadonlyArray<{
      label: string;
      items: readonly string[];
      accent: string;
    }>;
    reminder: {
      label: string;
      items: readonly string[];
    };
  }> {
    const documentLanguage = targetDocument.documentElement.lang.toLowerCase();
    const isZh =
      documentLanguage.startsWith("zh") || strings.cannotLogin.includes("\u7121\u6CD5\u767B\u5165");

    if (!isZh) {
      return {
        eyebrow: "Sign-in",
        title: "Account guide",
        cards: [
          {
            label: "Account Help",
            items: [
              `First-time sign-in, account activation, and password reset all start from "${strings.cannotLogin}".`,
            ],
            accent: "ccxp-lite-account-guide-card-primary",
          },
          {
            label: "Students / Alumni",
            items: [
              "Student / alumni account: student ID (examples: 110061190, X1106099, 102061190)",
              "Nanda campus entrants from year 105 or earlier use the Nanda portal password; contact the Nanda computer center if it is forgotten.",
            ],
            accent: "ccxp-lite-account-guide-card-highlight",
          },
          {
            label: "Faculty / Staff",
            items: ["Faculty / staff account: employee number (example: W09090)"],
            accent: "ccxp-lite-account-guide-card-neutral",
          },
          {
            label: "Payees / Vendors",
            items: [
              "Vendor account: company tax ID",
              "Individual payee account: national ID number",
            ],
            accent: "ccxp-lite-account-guide-card-neutral",
          },
          {
            label: "Other",
            items: [
              "Public course taker account: guest",
              "Mandarin Center student account: student ID (example: C1100088)",
              "Delegated account: delegator employee number-01 (example: A11111-01)",
            ],
            accent: "ccxp-lite-account-guide-card-neutral",
          },
        ],
        reminder: {
          label: "Reminders",
          items: [
            "The system periodically requires password changes.",
            "Avoid easy-to-guess information such as birthdays, ID numbers, and phone numbers.",
          ],
        },
      };
    }

    return {
      eyebrow: "\u767B\u5165\u6307\u5357",
      title: "\u5E33\u865F\u6307\u5357",
      cards: [
        {
          label: "\u5E33\u865F\u554F\u984C",
          items: [
            `\u9996\u6B21\u767B\u5165\u3001\u5E33\u865F\u555F\u7528\u3001\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u76F4\u63A5\u9EDE\u9078\u300C${strings.cannotLogin}\u300D\u3002`,
          ],
          accent: "ccxp-lite-account-guide-card-primary",
        },
        {
          label: "\u5B78\u751F\uFF0F\u6821\u53CB",
          items: [
            "\u5B78\u751F\uFF0F\u6821\u53CB\u5E33\u865F\uFF1A\u5B78\u865F\uFF08\u4F8B\uFF1A110061190\u3001X1106099\u3001102061190\uFF09",
            "\u5357\u5927\u6821\u5340 105 \u5E74\u524D\u5165\u5B78\u8005\uFF1A\u5BC6\u78BC\u6CBF\u7528\u5357\u5927\u6821\u5340\u5165\u53E3\u7DB2\uFF1B\u82E5\u5FD8\u8A18\u5BC6\u78BC\uFF0C\u8ACB\u6D3D\u5357\u5927\u6821\u5340\u8A08\u4E2D\u3002",
          ],
          accent: "ccxp-lite-account-guide-card-highlight",
        },
        {
          label: "\u6559\u8077\u54E1",
          items: [
            "\u6559\u8077\u54E1\u5E33\u865F\uFF1A\u54E1\u5DE5\u7DE8\u865F\uFF08\u4F8B\uFF1AW09090\uFF09",
          ],
          accent: "ccxp-lite-account-guide-card-neutral",
        },
        {
          label: "\u53D7\u6B3E\u4EBA\uFF0F\u5EE0\u5546",
          items: [
            "\u5EE0\u5546\u5E33\u865F\uFF1A\u7D71\u4E00\u7DE8\u865F",
            "\u500B\u4EBA\u53D7\u6B3E\u4EBA\u5E33\u865F\uFF1A\u8EAB\u5206\u8B49\u5B57\u865F",
          ],
          accent: "ccxp-lite-account-guide-card-neutral",
        },
        {
          label: "\u5176\u4ED6",
          items: [
            "\u793E\u6703\u4EBA\u58EB\u9078\u8AB2\u5E33\u865F\uFF1Aguest",
            "\u83EF\u8A9E\u4E2D\u5FC3\u5B78\u54E1\u5E33\u865F\uFF1A\u5B78\u865F\uFF08\u4F8B\uFF1AC1100088\uFF09",
            "\u59D4\u8A17\u6388\u6B0A\u5E33\u865F\uFF1A\u59D4\u8A17\u4EBA\u54E1\u5DE5\u7DE8\u865F-01\uFF08\u4F8B\uFF1AA11111-01\uFF09",
          ],
          accent: "ccxp-lite-account-guide-card-neutral",
        },
      ],
      reminder: {
        label: "\u63D0\u9192\u4E8B\u9805",
        items: [
          "\u7CFB\u7D71\u6703\u5B9A\u671F\u8981\u6C42\u4FEE\u6539\u5BC6\u78BC\u3002",
          "\u8ACB\u907F\u514D\u4F7F\u7528\u751F\u65E5\u3001\u8EAB\u5206\u8B49\u5B57\u865F\u3001\u96FB\u8A71\u7B49\u6613\u731C\u8CC7\u8A0A\u3002",
        ],
      },
    };
  }

  namespace.loginTabs = {
    createAccountGuide,
    createSection,
  };
})(globalThis);
