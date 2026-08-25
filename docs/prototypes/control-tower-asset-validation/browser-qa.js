async (page) => {
  const base = "http://127.0.0.1:4175/index.html";
  const widths = [360, 432, 768, 1279, 1280, 1440];
  const checks = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  const record = (name, condition, reading) => {
    checks.push({ name, pass: Boolean(condition), reading });
  };

  for (const variant of ["candidate", "misleading"]) {
    for (const width of widths) {
      const overlay = width < 1280;
      await page.setViewportSize({ width, height: width >= 1280 ? 1024 : 900 });
      await page.goto(variant === "misleading" ? `${base}?variant=misleading` : base, { waitUntil: "domcontentloaded" });

      const initial = await page.evaluate(() => ({
        innerWidth: window.innerWidth,
        inspectorHidden: document.querySelector("#inspector").hidden,
        topbarInert: document.querySelector(".topbar").inert,
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        topWarningVisible: document.querySelector(".trap-label").getClientRects().length > 0
      }));

      record(`${variant} ${width} initial width`, Math.abs(initial.innerWidth - width) <= 1, initial.innerWidth);
      record(`${variant} ${width} initial inspector`, initial.inspectorHidden === overlay, initial.inspectorHidden);
      record(`${variant} ${width} initial background`, initial.topbarInert === false, initial.topbarInert);
      record(`${variant} ${width} initial overflow`, initial.overflow === 0, initial.overflow);
      record(`${variant} ${width} initial safety`, initial.topWarningVisible === (variant === "misleading"), initial.topWarningVisible);

      await page.locator('.asset-select[data-asset-id="design-team"]').click();
      const opened = await page.evaluate(() => {
        const inspector = document.querySelector("#inspector");
        const warning = document.querySelector("#comparisonWarning");
        const bodyStyle = getComputedStyle(document.body);
        const tableStyle = getComputedStyle(document.querySelector(".asset-table"));
        const titleStyle = getComputedStyle(document.querySelector("#inspectorTitle"));
        const sectionStyle = getComputedStyle(document.querySelector(".detail-section h3"));
        const firstRow = document.querySelector(".asset-row");
        return {
          role: inspector.getAttribute("role"),
          ariaModal: inspector.getAttribute("aria-modal"),
          describedBy: inspector.getAttribute("aria-describedby"),
          topbarInert: document.querySelector(".topbar").inert,
          warningVisible: warning.getClientRects().length > 0,
          overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          bodyType: `${bodyStyle.fontSize}/${bodyStyle.lineHeight}`,
          tableType: `${tableStyle.fontSize}/${tableStyle.lineHeight}`,
          titleType: `${titleStyle.fontSize}/${titleStyle.lineHeight}/${titleStyle.fontWeight}`,
          sectionType: `${sectionStyle.fontSize}/${sectionStyle.lineHeight}/${sectionStyle.fontWeight}`,
          rowHeight: firstRow.getBoundingClientRect().height,
          malgunAvailable: document.fonts.check('16px "Malgun Gothic"'),
          releaseInList: firstRow.textContent.includes("릴리스"),
          releaseInDetail: document.querySelector("#inspectorStatus").textContent.includes("릴리스 포함"),
          ownerVisible: document.querySelector("#inspectorMeta").textContent.includes("관리 주체"),
          sourceVisible: document.querySelector("#inspectorMeta").textContent.includes("출처"),
          fixtureListVisible: document.querySelector(".snapshot").textContent.includes("예시 데이터"),
          fixtureInspectorVisible: document.querySelector(".fixture-marker").getClientRects().length > 0
        };
      });

      record(`${variant} ${width} modal semantics`, overlay ? opened.role === "dialog" && opened.ariaModal === "true" && opened.topbarInert : opened.role === null && opened.ariaModal === null && !opened.topbarInert, opened);
      record(`${variant} ${width} modal safety`, variant === "misleading" && overlay ? opened.warningVisible && opened.describedBy?.includes("comparisonWarning") : !opened.warningVisible, { visible: opened.warningVisible, describedBy: opened.describedBy });
      record(`${variant} ${width} open overflow`, opened.overflow === 0, opened.overflow);
      record(`${variant} ${width} type scale`, opened.bodyType === "16px/26px" && opened.tableType === "14px/21px" && opened.titleType === "18px/26px/600" && opened.sectionType === "15px/22px/600", opened);
      record(`${variant} ${width} desktop row`, overlay || opened.rowHeight <= 60, opened.rowHeight);
      record(`${variant} ${width} Windows font`, opened.malgunAvailable, opened.malgunAvailable);
      record(`${variant} ${width} status axes`, opened.releaseInList && opened.releaseInDetail, opened);
      record(`${variant} ${width} visible provenance`, opened.ownerVisible && opened.sourceVisible, opened);
      record(`${variant} ${width} fixture labels`, opened.fixtureListVisible && opened.fixtureInspectorVisible, opened);
    }
  }

  await page.setViewportSize({ width: 1440, height: 1024 });
  await page.goto(base, { waitUntil: "domcontentloaded" });
  await page.locator('.asset-select[data-asset-id="mcp.yohan"]').focus();
  await page.keyboard.press("Enter");
  const enterFocus = await page.evaluate(() => document.activeElement?.dataset?.assetId || null);
  record("1440 Enter focus restore", enterFocus === "mcp.yohan", enterFocus);

  await page.locator('.asset-select[data-asset-id="critical-thinking"]').focus();
  await page.keyboard.press("Space");
  const spaceFocus = await page.evaluate(() => document.activeElement?.dataset?.assetId || null);
  record("1440 Space focus restore", spaceFocus === "critical-thinking", spaceFocus);

  await page.locator('.asset-select[data-asset-id="design-team"]').focus();
  await page.keyboard.press("ArrowDown");
  const arrowState = await page.evaluate(() => ({
    focus: document.activeElement?.dataset?.assetId || null,
    selected: document.querySelector('.asset-row[data-selected="true"]')?.dataset?.assetId || null
  }));
  record("1440 arrow focus and selection", arrowState.focus === "mcp.yohan" && arrowState.selected === "mcp.yohan", arrowState);

  await page.setViewportSize({ width: 360, height: 900 });
  await page.goto(`${base}?variant=misleading`, { waitUntil: "domcontentloaded" });
  await page.locator('.asset-select[data-asset-id="design-team"]').click();
  const focusLoop = [];
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press("Tab");
    focusLoop.push(await page.evaluate(() => document.querySelector("#inspector").contains(document.activeElement)));
  }
  for (let index = 0; index < 6; index += 1) {
    await page.keyboard.press("Shift+Tab");
    focusLoop.push(await page.evaluate(() => document.querySelector("#inspector").contains(document.activeElement)));
  }
  record("360 modal focus loop", focusLoop.every(Boolean), focusLoop);
  await page.keyboard.press("Escape");
  const escapeClose = await page.evaluate(() => ({
    hidden: document.querySelector("#inspector").hidden,
    topbarInert: document.querySelector(".topbar").inert,
    focus: document.activeElement?.dataset?.assetId || null
  }));
  record("360 Escape close and restore", escapeClose.hidden && !escapeClose.topbarInert && escapeClose.focus === "design-team", escapeClose);

  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto(`${base}?variant=misleading`, { waitUntil: "domcontentloaded" });
  await page.locator('.asset-select[data-asset-id="design-team"]').click();
  await page.locator("#inspectorBackdrop").click({ position: { x: 10, y: 10 } });
  const backdropClose = await page.evaluate(() => ({
    hidden: document.querySelector("#inspector").hidden,
    topbarInert: document.querySelector(".topbar").inert,
    focus: document.activeElement?.dataset?.assetId || null
  }));
  record("768 backdrop close and restore", backdropClose.hidden && !backdropClose.topbarInert && backdropClose.focus === "design-team", backdropClose);

  await page.setViewportSize({ width: 1279, height: 900 });
  await page.goto(`${base}?variant=misleading`, { waitUntil: "domcontentloaded" });
  await page.locator('.asset-select[data-asset-id="design-team"]').click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForFunction(() => !matchMedia("(max-width: 1279.98px)").matches && document.querySelector("#inspector").getAttribute("role") === null);
  const desktopTransition = await page.evaluate(() => ({
    role: document.querySelector("#inspector").getAttribute("role"),
    backdropHidden: document.querySelector("#inspectorBackdrop").hidden,
    topbarInert: document.querySelector(".topbar").inert,
    warningVisible: document.querySelector("#comparisonWarning").getClientRects().length > 0,
    focus: document.activeElement?.dataset?.assetId || null
  }));
  record("1279 to 1280 transition", desktopTransition.role === null && desktopTransition.backdropHidden && !desktopTransition.topbarInert && !desktopTransition.warningVisible && desktopTransition.focus === "design-team", desktopTransition);

  await page.setViewportSize({ width: 1279, height: 900 });
  await page.waitForFunction(() => matchMedia("(max-width: 1279.98px)").matches && document.querySelector("#inspector").getAttribute("role") === "dialog");
  const modalTransition = await page.evaluate(() => ({
    role: document.querySelector("#inspector").getAttribute("role"),
    ariaModal: document.querySelector("#inspector").getAttribute("aria-modal"),
    backdropHidden: document.querySelector("#inspectorBackdrop").hidden,
    topbarInert: document.querySelector(".topbar").inert,
    warningVisible: document.querySelector("#comparisonWarning").getClientRects().length > 0,
    active: document.activeElement?.id || null
  }));
  record("1280 to 1279 transition", modalTransition.role === "dialog" && modalTransition.ariaModal === "true" && !modalTransition.backdropHidden && modalTransition.topbarInert && modalTransition.warningVisible && modalTransition.active === "closeInspector", modalTransition);

  record("console errors", consoleErrors.length === 0, consoleErrors);
  record("page errors", pageErrors.length === 0, pageErrors);

  const failures = checks.filter((check) => !check.pass);
  return {
    executedAt: new Date().toISOString(),
    viewports: widths,
    variants: ["candidate", "misleading"],
    checks: checks.length,
    passed: failures.length === 0,
    failures,
    consoleErrors,
    pageErrors
  };
}
