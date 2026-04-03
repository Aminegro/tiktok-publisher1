require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const USERNAME = process.env.TIKTOK_USERNAME;
const PASSWORD = process.env.TIKTOK_PASSWORD;

app.get('/', (req, res) => {
    res.send('TikTok Puppeteer API is running');
});

app.post('/publish', async (req, res) => {
    try {
        const { videoPath, caption } = req.body;

        if (!videoPath || !caption) {
            return res.status(400).json({ error: 'videoPath and caption are required' });
        }

        // فتح المتصفح
        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();

        // الدخول إلى TikTok
        await page.goto('https://www.tiktok.com/login');
        await page.type('input[name="username"]', USERNAME);
        await page.type('input[name="password"]', PASSWORD);
        await page.click('button[type="submit"]');

        // هنا تحتاج للانتظار حتى يتم تسجيل الدخول بنجاح
        await page.waitForNavigation({ waitUntil: 'networkidle0' });

        // الذهاب لصفحة رفع الفيديو
        await page.goto('https://www.tiktok.com/upload?lang=en');

        // رفع الفيديو (تأكد أن الفيديو موجود على السيرفر)
        const inputUploadHandle = await page.$('input[type=file]');
        await inputUploadHandle.uploadFile(videoPath);

        // كتابة التعليق
        await page.type('textarea[placeholder="Add a caption"]', caption);

        // الضغط على زر النشر
        await page.click('button:has-text("Post")');

        // انتظار تأكيد النشر (يمكن ضبط الانتظار حسب احتياجك)
        await page.waitForTimeout(5000);

        await browser.close();

        res.json({ success: true, message: 'Video published successfully' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});