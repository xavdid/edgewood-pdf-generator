import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

const today = new Date().toISOString().slice(0, 10);

// put this in a funciton so that we have a better chance of actually exiting successfully
const makePdf = async (url) => {
  console.log("launching");
  // non-headless is maybe marginally more reliable?
  const browser = await puppeteer.launch({ headless: false });
  console.log("  launched!");

  console.log("opening new page!");
  const page = await browser.newPage();
  console.log("  opened!");

  console.log("navigating");
  await page.goto(url, {
    waitUntil: "networkidle2",
  });
  console.log("  navigated!");

  console.log("saving");
  // Saves the PDF to hn.pdf.
  await page.pdf({
    path: `Wildflower Survey ${today}.pdf`,
  });
  console.log("  saved!");

  console.log("saving");

  console.log("closing");
  await browser.close();
  console.log("  closed!");
};

const filename = process.argv[2];
if (!filename) {
  throw new Error("MISSING FILENAME");
}

console.log(filename);
const url = readFileSync(filename, "utf-8").trim();

for (let index = 0; index < 5; index++) {
  try {
    await makePdf(url);
    break;
  } catch {
    // try, try again
  }
}
