#!/usr/bin/env node

/**
 * Improved Real Google Slides Login Test
 * Enhanced version with better button detection and error handling
 */

const { PrismaClient } = require('@prisma/client');
const puppeteer = require('puppeteer');

const prisma = new PrismaClient();

// Simple decryption function
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

async function testRealLoginImproved() {
  console.log('🔐 Testing Real Google Slides Login (Improved)...');
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
    console.log(`   Username: ${realLogin.username} (encrypted)`);

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
    
    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 720 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('✅ Browser launched successfully');

    // Navigate to Google Slides
    console.log('\n🌐 Navigating to Google Slides...');
    await page.goto(realLogin.loginUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log('✅ Navigated to Google Slides');
    console.log(`   Current URL: ${page.url()}`);

    // Take initial screenshot
    await page.screenshot({ path: 'login-test-improved-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved: login-test-improved-initial.png');

    // Step 1: Enter email
    console.log('\n🔍 Step 1: Looking for email input...');
    
    try {
      await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId', { timeout: 10000 });
      console.log('✅ Found email input field');
      
      // Clear and enter email
      await page.click('input[type="email"], input[name="identifier"], #identifierId');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type('input[type="email"], input[name="identifier"], #identifierId', decryptedUsername, { delay: 50 });
      
      console.log('📝 Email entered successfully');
      
      // Take screenshot after email
      await page.screenshot({ path: 'login-test-improved-email.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Email step failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-improved-email-error.png', fullPage: true });
      throw error;
    }

    // Step 2: Click next button
    console.log('\n👆 Step 2: Clicking next button...');
    
    try {
      // Try multiple selectors for the next button
      const nextSelectors = [
        '#identifierNext',
        'button[type="submit"]',
        '[data-primary-action="next"]',
        'button:contains("Next")',
        'button:contains("next")',
        '[jsname="LgbsSe"]',
        'button[jsname="LgbsSe"]'
      ];
      
      let nextButtonFound = false;
      for (const selector of nextSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          console.log(`✅ Clicked next button using selector: ${selector}`);
          nextButtonFound = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!nextButtonFound) {
        // Try clicking by text content
        await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const nextButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('next') || 
            btn.textContent.toLowerCase().includes('continue')
          );
          if (nextButton) {
            nextButton.click();
            return true;
          }
          return false;
        });
        console.log('✅ Clicked next button by text content');
      }
      
    } catch (error) {
      console.log(`❌ Next button click failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-improved-next-error.png', fullPage: true });
      throw error;
    }

    // Step 3: Wait for password field
    console.log('\n⏳ Step 3: Waiting for password field...');
    
    try {
      await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 10000 });
      console.log('✅ Found password input field');
      
      // Take screenshot before password
      await page.screenshot({ path: 'login-test-improved-before-password.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Password field not found: ${error.message}`);
      await page.screenshot({ path: 'login-test-improved-password-error.png', fullPage: true });
      throw error;
    }

    // Step 4: Enter password
    console.log('\n🔐 Step 4: Entering password...');
    
    try {
      // Clear and enter password
      await page.click('input[type="password"], input[name="password"], #password');
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.type('input[type="password"], input[name="password"], #password', decryptedPassword, { delay: 50 });
      
      console.log('✅ Password entered successfully');
      
      // Take screenshot after password
      await page.screenshot({ path: 'login-test-improved-password.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Password entry failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-improved-password-entry-error.png', fullPage: true });
      throw error;
    }

    // Step 5: Click sign in button
    console.log('\n👆 Step 5: Clicking sign in button...');
    
    try {
      // Try multiple selectors for the sign in button
      const signInSelectors = [
        '#passwordNext',
        'button[type="submit"]',
        '[data-primary-action="signIn"]',
        'button:contains("Sign in")',
        'button:contains("sign in")',
        'button:contains("Next")',
        '[jsname="LgbsSe"]',
        'button[jsname="LgbsSe"]'
      ];
      
      let signInButtonFound = false;
      for (const selector of signInSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 2000 });
          await page.click(selector);
          console.log(`✅ Clicked sign in button using selector: ${selector}`);
          signInButtonFound = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }
      
      if (!signInButtonFound) {
        // Try clicking by text content
        const clicked = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          const signInButton = buttons.find(btn => 
            btn.textContent.toLowerCase().includes('sign in') || 
            btn.textContent.toLowerCase().includes('next') ||
            btn.textContent.toLowerCase().includes('continue')
          );
          if (signInButton) {
            signInButton.click();
            return true;
          }
          return false;
        });
        
        if (clicked) {
          console.log('✅ Clicked sign in button by text content');
        } else {
          throw new Error('Could not find sign in button');
        }
      }
      
    } catch (error) {
      console.log(`❌ Sign in button click failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-improved-signin-error.png', fullPage: true });
      throw error;
    }

    // Step 6: Wait for result
    console.log('\n⏳ Step 6: Waiting for login result...');
    
    try {
      // Wait for navigation or specific elements
      await Promise.race([
        page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }),
        page.waitForSelector('input[type="tel"], #totpPin, [data-primary-action="verify"]', { timeout: 15000 }),
        page.waitForSelector('[data-primary-action="confirm"], .confirm-button', { timeout: 15000 })
      ]);
      
      console.log('✅ Login process completed');
      
    } catch (error) {
      console.log(`⚠️  Navigation timeout: ${error.message}`);
      // Continue to check result
    }

    // Final analysis
    const currentUrl = page.url();
    const pageTitle = await page.title();
    
    console.log('\n🎯 Final Login Analysis:');
    console.log(`   Final URL: ${currentUrl}`);
    console.log(`   Page Title: ${pageTitle}`);
    
    // Take final screenshot
    await page.screenshot({ path: 'login-test-improved-final.png', fullPage: true });
    console.log('📸 Final screenshot saved: login-test-improved-final.png');
    
    // Check for success indicators
    const isSuccess = currentUrl.includes('docs.google.com') || 
                     currentUrl.includes('slides.google.com') ||
                     currentUrl.includes('drive.google.com') ||
                     pageTitle.includes('Google Slides') ||
                     pageTitle.includes('Drive') ||
                     pageTitle.includes('Google Docs');
    
    // Check for 2FA
    const has2FA = await page.$('input[type="tel"], #totpPin, [data-primary-action="verify"]');
    
    // Check for additional verification
    const hasVerification = await page.$('[data-primary-action="confirm"], .confirm-button, [data-primary-action="continue"]');
    
    if (isSuccess) {
      console.log('🎉 LOGIN SUCCESSFUL!');
      console.log('   ✅ Successfully logged into Google Slides');
      console.log('   ✅ Agent can authenticate with your credentials');
      console.log('   ✅ Ready for automation workflows');
    } else if (has2FA) {
      console.log('🔐 2FA DETECTED');
      console.log('   ⚠️  Two-factor authentication is required');
      console.log('   💡 Consider using app passwords for automation');
      console.log('   📸 Check screenshots for 2FA setup');
    } else if (hasVerification) {
      console.log('🔍 ADDITIONAL VERIFICATION REQUIRED');
      console.log('   ⚠️  Google may require additional verification');
      console.log('   📸 Check screenshots for verification steps');
    } else {
      console.log('⚠️  LOGIN STATUS UNCLEAR');
      console.log('   🔍 Check screenshots for details');
      console.log('   📸 Review login-test-improved-final.png');
    }
    
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Credentials decrypted successfully`);
    console.log(`   ✅ Browser automation working`);
    console.log(`   ✅ Google login page accessible`);
    console.log(`   ✅ Form filling successful`);
    console.log(`   ${isSuccess ? '✅' : '⚠️'} Login result: ${isSuccess ? 'SUCCESS' : 'NEEDS_REVIEW'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (page) {
      await page.screenshot({ path: 'login-test-improved-failure.png', fullPage: true });
      console.log('📸 Failure screenshot saved: login-test-improved-failure.png');
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
    await prisma.$disconnect();
  }
}

// Run the improved test
testRealLoginImproved();
