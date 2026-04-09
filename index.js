require('dotenv').config();

const express = require('express');
const puppeteer = require('puppeteer');
const multer = require('multer');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

/*
========================================
 إعداد رفع الفيديو
========================================
*/
const upload = multer({
    dest: 'uploads/',
    limits: {
        fileSize: 1024 * 1024 * 500 // 500MB
    }
});

/*
========================================
 الصفحة الرئيسية
========================================
*/
app.get('/', (req, res) => {
    res.send('TikTok API with cookies is running 🚀');
});

/*
========================================
 نشر الفيديو
========================================
*/
app.post('/publish', upload.single('video'), async (req, res) => {
    let browser;

    try {
        /*
        ========================================
         التحقق من البيانات
        ========================================
        */
        if (!req.file) {
            return res.status(400).json({
                error: 'Video file is required'
            });
        }

        const caption = req.body.caption || '';
        const videoPath = req.file.path;

        if (!fs.existsSync('./cookies.json')) {
            fs.unlinkSync(videoPath);
            return res.status(500).json({
                error: 'cookies.json file not found'
            });
        }

        /*
        ========================================
         تشغيل Puppeteer داخل Docker/Coolify
        ========================================
        */
        browser = await puppeteer.launch({
            headless: "new",
            executablePath:
                process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--no-zygote',
                '--single-process'
            ],
            timeout: 180000
        });

        const page = await browser.newPage();

        /*
        ========================================
         حل مشكلة timeout
        ========================================
        */
        page.setDefaultNavigationTimeout(180000);
        page.setDefaultTimeout(180000);

        /*
        ========================================
         تحميل الكوكيز
        ========================================
        */
        const cookies = JSON.parse(
            fs.readFileSync('./cookies.json', 'utf8')
        );

        await page.setCookie(...cookies);

        /*
        ========================================
         فتح صفحة الرفع
        ========================================
        */
        await page.goto(
            'https://www.tiktok.com/creator-center/upload?lang=en',
            {
                waitUntil: 'networkidle2',
                timeout: 180000
            }
        );

        /*
        ========================================
         انتظار زر رفع الفيديو
        ========================================
        */
        const fileInput = await page.waitForSelector(
            'input[type="file"]',
            {
                visible: true,
                timeout: 120000
            }
        );

        if (!fileInput) {
            throw new Error('Upload input not found');
        }

        /*
        ========================================
         رفع الفيديو
        ========================================
        */
        await fileInput.uploadFile(videoPath);

        /*
        ========================================
         انتظار ظهور مربع الوصف
        ========================================
        */
        const captionBox = await page.waitForSelector('textarea', {
            visible: true,
            timeout: 120000
        });

        if (!captionBox) {
            throw new Error('Caption textarea not found');
        }

        /*
        ========================================
         إدخال الوصف
        ========================================
        */
        await captionBox.click({ clickCount: 3 });
        await page.keyboard.press('Backspace');
        await captionBox.type(caption);

        /*
        ========================================
         انتظار تجهيز الفيديو
        ========================================
        */
        await page.waitForTimeout(15000);

        /*
        ========================================
         زر النشر
        ========================================
        */
        const postButton = await page.waitForSelector('button', {
            visible: true,
            timeout: 120000
        });

        const buttons = await page.$$('button');

        let clicked = false;

        for (const btn of buttons) {
            const text = await page.evaluate(el => el.innerText, btn);

            if (
                text &&
                (
                    text.includes('Post') ||
                    text.includes('Publish')
                )
            ) {
                await btn.click();
                clicked = true;
                break;
            }
        }

        if (!clicked) {
            throw new Error('Post button not found');
        }

        /*
        ========================================
         انتظار انتهاء النشر
        ========================================
        */
        await page.waitForTimeout(20000);

        /*
        ========================================
         حذف الملف بعد الرفع
        ========================================
        */
        fs.unlinkSync(videoPath);

        await browser.close();

        return res.json({
            success: true,
            message: 'Video uploaded successfully'
        });

    } catch (err) {
        console.error('UPLOAD ERROR:', err);

        /*
        ========================================
         حذف الملف عند الخطأ
        ========================================
        */
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        /*
        ========================================
         إغلاق المتصفح عند الخطأ
        ========================================
        */
        if (browser) {
            await browser.close();
        }

        return res.status(500).json({
            error: err.message
        });
    }
});

/*
========================================
 تشغيل السيرفر
========================================
*/
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});