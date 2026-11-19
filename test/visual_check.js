// P1 render check (issue #20): loads the production build in headless Chrome
// and asserts no page scrolls horizontally at phone or desktop width, in
// light and dark mode. Also saves viewport screenshots for PR review (the
// page-layout tickets, #21-#26, require them).
//
// Setup: npm install --no-save puppeteer-core (uses the system Chrome), then
// serve the build with the base path intact, e.g.:
//   ln -sf "$PWD/_site" /tmp/www-check/www-ideas
//   python3 -m http.server 8123 -d /tmp/www-check
//   CHECK_BASE=http://localhost:8123/www-ideas node test/visual_check.js
// The server is not started here so the harness stays offline-safe.
const puppeteer = require("puppeteer-core");

const BASE = process.env.CHECK_BASE || "http://localhost:8123/www-ideas";
const SHOT_DIR = "screenshots";
const PAGES = ["/", "/research/", "/use-cases/", "/team/", "/publications/", "/software/", "/news/", "/events/", "/events/all-hands-2027/"];
const WIDTHS = [390, 1280];
const THEMES = ["light", "dark"];
// One representative shot per page: desktop light and phone dark.
const SHOTS = PAGES.map((path) => ({ url: path, width: 1280, theme: "light", name: path.replace(/\//g, "") || "home" }));
SHOTS.push(...PAGES.map((path) => ({ url: path, width: 390, theme: "dark", name: `${path.replace(/\//g, "") || "home"}-390-dark` })));

(async () => {
  const fs = require("fs");
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    headless: "new",
  });
  const page = await browser.newPage();
  let failures = 0;

  for (const width of WIDTHS) {
    for (const theme of THEMES) {
      for (const path of PAGES) {
        await page.setViewport({ width, height: 900 });
        await page.goto(`${BASE}${path}`, { waitUntil: "networkidle0" });
        await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
        await new Promise((r) => setTimeout(r, 150));
        const { scrollWidth, clientWidth } = await page.evaluate(() => ({
          scrollWidth: document.documentElement.scrollWidth,
          clientWidth: document.documentElement.clientWidth,
        }));
        if (scrollWidth > clientWidth + 1) {
          failures++;
          console.log(`OVERFLOW ${path} @ ${width}px ${theme}: scrollWidth ${scrollWidth} > clientWidth ${clientWidth}`);
        }
      }
    }
  }
  console.log(failures === 0 ? "No horizontal overflow on any checked page." : `${failures} overflow failures`);

  for (const shot of SHOTS) {
    await page.setViewport({ width: shot.width, height: 900, deviceScaleFactor: 1 });
    await page.goto(`${BASE}${shot.url}`, { waitUntil: "networkidle0" });
    await page.evaluate((t) => {
      document.documentElement.setAttribute("data-theme", t);
      try {
        localStorage.setItem("theme", t);
      } catch {}
    }, shot.theme);
    await new Promise((r) => setTimeout(r, 300));
    await page.screenshot({ path: `${SHOT_DIR}/${shot.name}.png` });
  }
  console.log(`Screenshots in ${SHOT_DIR}/`);

  await browser.close();
  process.exit(failures === 0 ? 0 : 1);
})();
