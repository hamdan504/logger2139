const express = require('express');
const path = require('path');
const puppeteer = require('puppeteer-core');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve the HTML form
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/login', async (req, res) => {
  const { url, email, password } = req.body;
  let executablePath = '';
  let browser = null;
  try {
    if (process.env.VERCEL) {
      executablePath = '/usr/bin/google-chrome';
      // or executablePath = '/usr/bin/chromium-browser';
      // depending on which browser you want to use
      browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        executablePath,
        headless: true,
      });
    } else {
      browser = await puppeteer.launch({
        headless: false,
        slowMo: 100,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
        ignoreHTTPSErrors: true,
      });
    }

    const page = await browser.newPage();
    await page.goto(url);

    // Wait for the element to appear
    await page.waitForSelector("div.choose-btn");

    // Click the element by filtering elements with the exact text content
    await page.evaluate(() => {
        [...document.querySelectorAll('div.choose-btn')].filter(el => el.innerText === 'Email')[0].click();
    });

    // Fill in email and password
    await page.waitForSelector("input[type='text'][placeholder='Please enter your email address']");
    await page.type("input[type='text'][placeholder='Please enter your email address']", email);
    await page.type("input[type='password'][placeholder='Please enter your password']", password);

    // Click login button
    await page.waitForSelector("div.login-btn");
    await page.click("div.login-btn");

    // Wait for navigation
    await page.waitForNavigation();

    if (page.url() !== url) {
      // Navigate to trade URL
      await page.goto("https://2139.online/pc/#/contractTransaction");

      // Click "invited me" button
      await page.waitForSelector("div.choose-btn");
      const invitedMeButton = await page.$("div.choose-btn");
      await invitedMeButton.click();

      // Wait for and click "Confirm to follow the order" if it exists
      try {
        await page.waitForSelector("div:contains(' Confirm to follow the order')", { timeout: 5000 });
        const confirmOrderButton = await page.$("div:contains(' Confirm to follow the order')");
        await confirmOrderButton.click();

        await page.waitForSelector("button span:contains('Confirm')", { timeout: 5000 });
        const confirmButton = await page.$("button span:contains('Confirm')");
        await confirmButton.click();

        await page.waitForTimeout(50000);
        res.status(200).json({ message: "Successfully completed the transaction!" });
      } catch (error) {
        await page.waitForTimeout(50000);
        res.status(200).json({ message: "No transaction found or buttons were not available." });
      }
    } else {
      res.status(400).json({ message: "Login failed or session not maintained properly." });
    }
  } catch (error) {
    res.status(500).json({ message: `Error: ${error.message}` });
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  
});