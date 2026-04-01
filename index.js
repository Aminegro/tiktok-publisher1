require('dotenv').config();
const express = require('express');
const puppeteer = require('puppeteer');
const bodyParser = require('body-parser');

const app = express();
app.use(bodyParser.json());

const PORT = process.env.PORT || 3000;

// Route to publish video on TikTok
app.post('/publish', async (req, res) => {
    const { videoPath, caption } = req.body;

    if (!videoPath || !caption) {
        return res.status(400).send("Missing videoPath or caption");
    }

    try {
        const browser = await puppeteer.launch({
            headless: false, // TikTok needs a visible browser
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        });

        const page = await browser.newPage();
        await page.goto('https://www.tiktok.com/login');

        // هنا يمكنك إضافة خطوات تسجيل الدخول تلقائيًا
        // ثم رفع الفيديو ونشره
        // 👈 مؤقت، تحتاج إعداد يدوياً أول مرة لتسجيل الدخول وحفظ cookies

        console.log("Video publishing simulation for:", videoPath);

        await browser.close();
        res.send({ success: true, message: "Video processed (simulation)" });

    } catch (error) {
        console.error(error);
        res.status(500).send({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`TikTok Publisher API running on port ${PORT}`);
});
