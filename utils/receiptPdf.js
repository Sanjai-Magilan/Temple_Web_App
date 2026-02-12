const path = require("path");
const ejs = require("ejs");
const puppeteer = require("puppeteer");

exports.renderReceiptPdf = async (receipt) => {
  const templatePath = path.join(__dirname, "..", "views", "receipts", "receipt.ejs");
  const html = await ejs.renderFile(templatePath, { receipt }, { async: true });

  const browser = await puppeteer.launch({ headless: "new" });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    return await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", right: "15mm", bottom: "20mm", left: "15mm" },
    });
  } finally {
    await browser.close();
  }
};