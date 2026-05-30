const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

const templatePath = path.join(
  __dirname,
  "..",
  "views",
  "receipts",
  "receipt.ejs",
);

let browserPromise = null;
const idlePages = [];
const maxIdlePages = Number(process.env.RECEIPT_PDF_MAX_IDLE_PAGES || 2);

const ensureBrowser = async () => {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
      ],
    });

    browserPromise.catch(() => {
      browserPromise = null;
    });
  }

  return browserPromise;
};

const acquirePage = async () => {
  const browser = await ensureBrowser();

  while (idlePages.length > 0) {
    const page = idlePages.pop();
    if (!page.isClosed()) return page;
  }

  const page = await browser.newPage();
  await page.setCacheEnabled(true);
  return page;
};

const releasePage = async (page) => {
  if (!page || page.isClosed()) return;

  try {
    await page.goto("about:blank", { waitUntil: "domcontentloaded" });
  } catch (_) {
    try {
      await page.close();
    } catch (_) {}
    return;
  }

  if (idlePages.length < maxIdlePages) {
    idlePages.push(page);
  } else {
    try {
      await page.close();
    } catch (_) {}
  }
};

const closeBrowser = async () => {
  const browser = await browserPromise?.catch(() => null);

  while (idlePages.length > 0) {
    const page = idlePages.pop();
    if (page && !page.isClosed()) {
      try {
        await page.close();
      } catch (_) {}
    }
  }

  if (browser) {
    try {
      await browser.close();
    } catch (_) {}
  }

  browserPromise = null;
};

process.once("SIGINT", () => closeBrowser().finally(() => process.exit(0)));
process.once("SIGTERM", () => closeBrowser().finally(() => process.exit(0)));
process.once("exit", () => {
  if (browserPromise) {
    closeBrowser();
  }
});

exports.renderReceiptPdf = async (receipt) => {
  const html = await ejs.renderFile(
    templatePath,
    { receipt, renderMode: "pdf" },
    { async: true },
  );

  const page = await acquirePage();
  try {
    await page.setContent(html, { waitUntil: "domcontentloaded" });

    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
  } finally {
    await releasePage(page);
  }
};
