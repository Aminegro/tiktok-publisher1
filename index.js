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
    let browser;

    try {
        const caption = req.body.caption;
        const videoPath = req.file?.path;

        if (!videoPath || !caption) {
            return res.status(400).json({ error: 'video + caption required' });
        }

        // 🚀 تشغيل المتصفح بطريقة مستقرة
        browser = await puppeteer.launch({
            headless: true,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();

        // 🔥 حل مشكلة timeout نهائياً
        await page.setDefaultNavigationTimeout(0);

        // ✅ التأكد من وجود cookies
        if (!fs.existsSync('./cookies.json')) {
            throw new Error('cookies.json not found');
        }

        const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf-8'));

        // 🔥 مهم: لازم نفتح الموقع قبل setCookie
        await page.goto('https://www.tiktok.com/', {
            waitUntil: 'domcontentloaded',
            timeout: 0
        });

        await page.setCookie(...cookies);

        // إعادة تحميل الصفحة بعد cookies
        await page.reload({
            waitUntil: 'domcontentloaded'
        });

        console.log('✅ Cookies loaded');

        // 🔥 الدخول مباشرة لصفحة الرفع
        await page.goto('https://www.tiktok.com/upload?lang=en', {
            waitUntil: 'domcontentloaded',
            timeout: 0
        });

        // ⏳ انتظار input رفع الفيديو
        await page.waitForSelector('input[type="file"]', { timeout: 60000 });

        const input = await page.$('input[type="file"]');
        await input.uploadFile(videoPath);

        console.log('✅ Video uploaded');

        // ⏳ انتظار textarea
        await page.waitForSelector('textarea', { timeout: 60000 });

        await page.type('textarea', caption);

        console.log('✅ Caption added');

        // ⏳ زر النشر (قد يختلف selector)
        const postButton = await page.$('button');

        if (postButton) {
            await postButton.click();
        } else {
            throw new Error('Post button not found');
        }

        await page.waitForTimeout(10000);

        console.log('✅ Posted');

        await browser.close();

        // حذف الملف
        fs.unlinkSync(videoPath);

        res.json({ success: true });

    } catch (err) {
        console.error('❌ ERROR:', err);

        if (browser) await browser.close();

        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});