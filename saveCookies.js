const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: false, // مهم
        args: ['--no-sandbox']
    });

    const page = await browser.newPage();

    await page.goto('https://www.tiktok.com/login');

    console.log('👉 قم بتسجيل الدخول يدويًا ثم اضغط Enter هنا...');

    process.stdin.once('data', async () => {
        const cookies = await page.cookies();
        fs.writeFileSync('cookies.json', JSON.stringify(cookies, null, 2));
        console.log('✅ تم حفظ cookies');

        await browser.close();
        process.exit();
    });
})();