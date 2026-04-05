require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// رفع الملفات
const upload = multer({ dest: 'uploads/' });

app.get('/', (req, res) => {
    res.send('TikTok API with cookies is running 🚀');
});

app.post('/publish', upload.single('video'), async (req, res) => {
    try {
        const caption = req.body.caption;
        const videoPath = req.file.path;

        if (!videoPath || !caption) {
            return res.status(400).json({ error: 'video + caption required' });
        }

        const browser = await puppeteer.launch({
            headless: true,
            args: ["--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH
        });

        const page = await browser.newPage();

        // ✅ تحميل cookies
        const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf-8'));
        await page.setCookie(...cookies);

        // ✅ دخول مباشر بدون login
        await page.goto('https://www.tiktok.com/', {
            waitUntil: 'networkidle2'
        });

        // تحقق هل الحساب مسجل
        await page.goto('https://www.tiktok.com/upload?lang=en');

        // رفع الفيديو
        const input = await page.$('input[type="file"]');
        await input.uploadFile(videoPath);

        // انتظار ظهور caption
        await page.waitForSelector('textarea');

        await page.type('textarea', caption);

        // زر النشر
        await page.click('button:has-text("Post")');

        await page.waitForTimeout(8000);

        await browser.close();

        // حذف الملف بعد الرفع
        fs.unlinkSync(videoPath);

        res.json({ success: true });

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});