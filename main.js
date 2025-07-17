import { readFileSync } from "node:fs";
import puppeteer from "puppeteer";

// this assumes the survey is always sent the day after it's taken
const date = new Date();
date.setDate(date.getDate() - 1);
// 'sv' is the swedish format, which is iso! but it doesn't convert to UTC first, so this is preferred to using toIsoString()
const yesterday = date.toLocaleDateString("sv", {
  timeZone: "America/Los_Angeles",
});

// put this in a funciton so that we have a better chance of actually exiting successfully
const makePdf = async (url) => {
  process.stdout.write("  launching...");
  // non-headless is maybe marginally more reliable?
  const browser = await puppeteer.launch({ headless: false });
  console.log(" launched!");

  try {
    process.stdout.write("  opening new page...");
    const page = await browser.newPage();
    console.log(" opened!");

    process.stdout.write("  navigating...");
    await page.goto(url);
    console.log(" navigated!");

    // make page edits: https://stackoverflow.com/questions/50867065/puppeteer-removing-elements-by-class

    process.stdout.write("  removing elements...");
    // remove the share bar at the top
    await page.$eval(".shr-bar", (el) => el.remove());

    // remove the unsubscribe & logo stuff
    await page.$$eval(".shell_panel-cell--footer", (els) =>
      els.forEach((el) => el.remove())
    );

    // remove some rows from the bottom of the template
    const shell = await page.$(".shell > table > tbody > tr");
    const rows = await shell.$$("table.layout");

    // We want to remove the last 5 items (logos, table, etc)
    // these are 0-indexed against the end of the user-generated content
    // the array indexes don't update when rows are deleted (since we're dispatching calls to the dom) so no need for fancy index math
    for (const i of [0, 1, 2, 3, 4]) {
      const el = rows[rows.length - 1 - i];
      await el.evaluate((el) => el.remove());
    }
    console.log(" removed!");

    // if we want to avoid breaking within a paragraph, we can add

    // p {
    //   page-break-inside: avoid;
    // }

    // in style somwhere. That avoids breaking a paragraph. Each email "row" is a full `table` so we can target that with `page-break-inside` instead to avoid breakage even more aggresively

    process.stdout.write("saving...");
    // Saves the PDF to hn.pdf.
    await page.pdf({
      path: `Wildflower Survey ${yesterday}.pdf`,
      margin: {
        top: 38, // pixels, apparently? chrome defaluts to .39" and this is about equivalent?
        bottom: 38,
        left: 38,
        right: 38,
      },
    });
    console.log(" saved!");
  } catch (e) {
    console.log(e);
    throw e;
  } finally {
    process.stdout.write("  closing...");
    await browser.close();
    console.log(" closed!");
  }
};

const filename = process.argv[2];
if (!filename) {
  throw new Error("MISSING FILENAME");
}

const url = readFileSync(filename, "utf-8").trim();

for (let index = 0; index < 5; index++) {
  try {
    console.log(`\nbeginning attempt #${index + 1}`);
    await makePdf(url);
    break;
  } catch (e) {
    console.log(`  failed! ${e}`);
    // wait 2 seconds, then try, try again
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 2000);
    });
  }
}
