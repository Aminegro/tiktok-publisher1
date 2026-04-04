require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');

const app = express();

// إعداد multer لحفظ الفيديو مؤقتًا
const upload = multer({ dest: 'uploads/' });

const PORT = process.env.PORT || 3000;

// اختبار السيرفر
app.get('/', (req, res) => {
    res.send('TikTok Puppeteer API is running 🚀');
});

// endpoint للنشر
app.post('/publish', upload.single('video'), async (req, res) => {
    let browser;

    try {
        const videoPath = req.file?.path;
        const caption = req.body.caption || '';

        if (!videoPath) {
            return res.status(400).json({ error: 'video is required' });
        }

        console.log('📥 Video received:', videoPath);

        // تشغيل Puppeteer
        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined
        });

        const page = await browser.newPage();

        // فتح TikTok upload مباشرة
        await page.goto('https://www.tiktok.com/upload?lang=en', {
            waitUntil: 'networkidle2'
        });

        console.log('🌐 Opened TikTok upload page');

        // ⚠️ مهم: لازم تكون مسجل دخول مسبقًا (كوكيز)
        // وإلا لن ينجح

        // رفع الفيديو
        const inputUploadHandle = await page.waitForSelector('input[type=file]', { timeout: 60000 });
        await inputUploadHandle.uploadFile(videoPath);

        console.log('📤 Video uploaded');

        // انتظار ظهور حقل الكتابة
        await page.waitForTimeout(5000);

        // كتابة الكابشن
        try {
            const captionBox = await page.waitForSelector('div[contenteditable="true"]', { timeout: 20000 });
            await captionBox.click();
            await page.keyboard.type(caption);
            console.log('✍️ Caption added');
        } catch (e) {
            console.log('⚠️ Caption selector may need update');
        }

        // انتظار بسيط
        await page.waitForTimeout(3000);

        // الضغط على زر النشر
        try {
            const buttons = await page.$$('button');
            for (let btn of buttons) {
                const text = await page.evaluate(el => el.innerText, btn);
                if (text.toLowerCase().includes('post')) {
                    await btn.click();
                    console.log('🚀 Clicked Post button');
                    break;
                }
            }
        } catch (e) {
            console.log('⚠️ Could not click post button');
        }

        // انتظار اكتمال النشر
        await page.waitForTimeout(10000);

        res.json({ success: true, message: 'Video published (or attempted)' });

    } catch (error) {
        console.error('❌ Error:', error);
        res.status(500).json({ error: error.message });

    } finally {
        // إغلاق المتصفح
        if (browser) await browser.close();

        // حذف الفيديو بعد الاستخدام
        if (req.file?.path) {
            fs.unlink(req.file.path, () => { });
        }
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});