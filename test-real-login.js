#!/usr/bin/env node

/**
 * Real Google Slides Login Test
 * Tests actual login with real credentials using headless browser
 */

const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');
const path = require('path');

const prisma = new PrismaClient();

// Simple decryption function (matching the encryption in the app)
function decrypt(text) {
  if (!text) return text;
  
  try {
    const CryptoJS = require('crypto-js');
    const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-dev-key-change-in-production';
    const decrypted = CryptoJS.AES.decrypt(text, ENCRYPTION_KEY);
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      throw new Error('Decryption failed - empty result');
    }
    return result;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

async function testRealLogin() {
  console.log('🔐 Testing Real Google Slides Login...');
  console.log('⚠️  This will attempt to log into your real Google account');

  let browser = null;
  let page = null;

  try {
    // Find the real login
    const realLogin = await prisma.login.findFirst({
      where: { name: 'Google Slides' },
      include: { owner: true }
    });

    if (!realLogin) {
      console.log('❌ Google Slides login not found');
      return;
    }

    console.log('✅ Found Google Slides login:');
    console.log(`   Owner: ${realLogin.owner.email}`);
    console.log(`   URL: ${realLogin.loginUrl}`);
    console.log(`   Username: ${realLogin.username} (encrypted)`);
    console.log(`   Password: ${realLogin.password ? '***ENCRYPTED***' : 'None'}`);

    // Decrypt credentials
    console.log('\n🔓 Decrypting credentials...');
    const decryptedUsername = decrypt(realLogin.username);
    const decryptedPassword = decrypt(realLogin.password);
    
    console.log(`✅ Username decrypted: ${decryptedUsername}`);
    console.log(`✅ Password decrypted: ${'*'.repeat(decryptedPassword.length)}`);

    // Launch browser
    console.log('\n🚀 Launching headless browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set user agent
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('✅ Browser launched successfully');

    // Navigate to Google Slides
    console.log('\n🌐 Navigating to Google Slides...');
    const navigationPromise = page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    await page.goto(realLogin.loginUrl);
    await navigationPromise;
    
    console.log('✅ Navigated to Google Slides');
    console.log(`   Current URL: ${page.url()}`);

    // Take initial screenshot
    const initialScreenshot = await page.screenshot({ 
      path: 'login-test-initial.png',
      fullPage: true 
    });
    console.log('📸 Initial screenshot saved: login-test-initial.png');

    // Wait for page to load and look for login form
    console.log('\n🔍 Looking for login form...');
    
    try {
      // Wait for email input field
      await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId', { timeout: 10000 });
      console.log('✅ Found email input field');
      
      // Enter email
      console.log('📝 Entering email...');
      await page.type('input[type="email"], input[name="identifier"], #identifierId', decryptedUsername, { delay: 100 });
      
      // Click next button
      console.log('👆 Clicking next button...');
      await page.click('#identifierNext, button[type="submit"], [data-primary-action="next"]');
      
      // Wait for password field
      console.log('⏳ Waiting for password field...');
      await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 10000 });
      console.log('✅ Found password input field');
      
      // Enter password
      console.log('🔐 Entering password...');
      await page.type('input[type="password"], input[name="password"], #password', decryptedPassword, { delay: 100 });
      
      // Click sign in button
      console.log('👆 Clicking sign in button...');
      await page.click('#passwordNext, button[type="submit"], [data-primary-action="signIn"]');
      
      // Wait for navigation or success
      console.log('⏳ Waiting for login result...');
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
      
      console.log('✅ Login attempt completed');
      console.log(`   Final URL: ${page.url()}`);
      
      // Take final screenshot
      const finalScreenshot = await page.screenshot({ 
        path: 'login-test-final.png',
        fullPage: true 
      });
      console.log('📸 Final screenshot saved: login-test-final.png');
      
      // Check if login was successful
      const currentUrl = page.url();
      const pageTitle = await page.title();
      
      console.log('\n🎯 Login Result Analysis:');
      console.log(`   Final URL: ${currentUrl}`);
      console.log(`   Page Title: ${pageTitle}`);
      
      // Check for success indicators
      const isSuccess = currentUrl.includes('docs.google.com') || 
                       currentUrl.includes('slides.google.com') ||
                       pageTitle.includes('Google Slides') ||
                       pageTitle.includes('Drive');
      
      if (isSuccess) {
        console.log('🎉 LOGIN SUCCESSFUL!');
        console.log('   ✅ Successfully logged into Google Slides');
        console.log('   ✅ Agent can authenticate with your credentials');
        console.log('   ✅ Ready for automation workflows');
      } else {
        console.log('⚠️  LOGIN STATUS UNCLEAR');
        console.log('   🔍 May need additional verification steps');
        console.log('   📸 Check screenshots for details');
      }
      
      // Check for 2FA or additional verification
      const has2FA = await page.$('input[type="tel"], #totpPin, [data-primary-action="verify"]');
      if (has2FA) {
        console.log('🔐 2FA DETECTED');
        console.log('   ⚠️  Two-factor authentication may be required');
        console.log('   💡 Consider using app passwords for automation');
      }
      
    } catch (error) {
      console.log(`❌ Login process error: ${error.message}`);
      
      // Take error screenshot
      const errorScreenshot = await page.screenshot({ 
        path: 'login-test-error.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved: login-test-error.png');
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
    await prisma.$disconnect();
  }
}

// Run the test
testRealLogin();
