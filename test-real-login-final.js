#!/usr/bin/env node

/**
 * Final Real Google Slides Login Test
 * Handles element interaction issues and provides comprehensive testing
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

async function testRealLoginFinal() {
  console.log('🔐 Final Real Google Slides Login Test...');
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
    await page.screenshot({ path: 'login-test-final-initial.png', fullPage: true });
    console.log('📸 Initial screenshot saved: login-test-final-initial.png');

    // Step 1: Enter email
    console.log('\n🔍 Step 1: Entering email...');
    
    try {
      await page.waitForSelector('input[type="email"], input[name="identifier"], #identifierId', { timeout: 10000 });
      console.log('✅ Found email input field');
      
      // Use evaluate to ensure proper interaction
      await page.evaluate((username) => {
        const emailInput = document.querySelector('input[type="email"], input[name="identifier"], #identifierId');
        if (emailInput) {
          emailInput.focus();
          emailInput.value = '';
          emailInput.value = username;
          emailInput.dispatchEvent(new Event('input', { bubbles: true }));
          emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, decryptedUsername);
      
      console.log('📝 Email entered successfully');
      
      // Take screenshot after email
      await page.screenshot({ path: 'login-test-final-email.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Email step failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-final-email-error.png', fullPage: true });
      throw error;
    }

    // Step 2: Click next button
    console.log('\n👆 Step 2: Clicking next button...');
    
    try {
      // Wait a moment for the page to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use evaluate to click the next button
      const nextClicked = await page.evaluate(() => {
        const nextButton = document.querySelector('#identifierNext') || 
                          document.querySelector('button[type="submit"]') ||
                          document.querySelector('[data-primary-action="next"]');
        if (nextButton) {
          nextButton.click();
          return true;
        }
        return false;
      });
      
      if (nextClicked) {
        console.log('✅ Clicked next button successfully');
      } else {
        throw new Error('Could not find next button');
      }
      
    } catch (error) {
      console.log(`❌ Next button click failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-final-next-error.png', fullPage: true });
      throw error;
    }

    // Step 3: Wait for password field
    console.log('\n⏳ Step 3: Waiting for password field...');
    
    try {
      await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 10000 });
      console.log('✅ Found password input field');
      
      // Wait for the field to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Take screenshot before password
      await page.screenshot({ path: 'login-test-final-before-password.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Password field not found: ${error.message}`);
      await page.screenshot({ path: 'login-test-final-password-error.png', fullPage: true });
      throw error;
    }

    // Step 4: Enter password
    console.log('\n🔐 Step 4: Entering password...');
    
    try {
      // Use evaluate to ensure proper password entry
      await page.evaluate((password) => {
        const passwordInput = document.querySelector('input[type="password"], input[name="password"], #password');
        if (passwordInput) {
          passwordInput.focus();
          passwordInput.value = '';
          passwordInput.value = password;
          passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
          passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, decryptedPassword);
      
      console.log('✅ Password entered successfully');
      
      // Take screenshot after password
      await page.screenshot({ path: 'login-test-final-password.png', fullPage: true });
      
    } catch (error) {
      console.log(`❌ Password entry failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-final-password-entry-error.png', fullPage: true });
      throw error;
    }

    // Step 5: Click sign in button
    console.log('\n👆 Step 5: Clicking sign in button...');
    
    try {
      // Wait a moment for the page to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Use evaluate to click the sign in button
      const signInClicked = await page.evaluate(() => {
        const signInButton = document.querySelector('#passwordNext') || 
                            document.querySelector('button[type="submit"]') ||
                            document.querySelector('[data-primary-action="signIn"]') ||
                            document.querySelector('[jsname="LgbsSe"]');
        if (signInButton) {
          signInButton.click();
          return true;
        }
        return false;
      });
      
      if (signInClicked) {
        console.log('✅ Clicked sign in button successfully');
      } else {
        throw new Error('Could not find sign in button');
      }
      
    } catch (error) {
      console.log(`❌ Sign in button click failed: ${error.message}`);
      await page.screenshot({ path: 'login-test-final-signin-error.png', fullPage: true });
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
    await page.screenshot({ path: 'login-test-final-result.png', fullPage: true });
    console.log('📸 Final screenshot saved: login-test-final-result.png');
    
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
      console.log('   📸 Review login-test-final-result.png');
    }
    
    console.log('\n📊 Test Summary:');
    console.log(`   ✅ Credentials decrypted successfully`);
    console.log(`   ✅ Browser automation working`);
    console.log(`   ✅ Google login page accessible`);
    console.log(`   ✅ Form filling successful`);
    console.log(`   ${isSuccess ? '✅' : '⚠️'} Login result: ${isSuccess ? 'SUCCESS' : 'NEEDS_REVIEW'}`);
    
    console.log('\n🎯 Key Findings:');
    console.log(`   - Username: ${decryptedUsername}`);
    console.log(`   - Password: ${'*'.repeat(decryptedPassword.length)} characters`);
    console.log(`   - Final URL: ${currentUrl}`);
    console.log(`   - Page Title: ${pageTitle}`);
    console.log(`   - 2FA Required: ${has2FA ? 'Yes' : 'No'}`);
    console.log(`   - Additional Verification: ${hasVerification ? 'Yes' : 'No'}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
    if (page) {
      await page.screenshot({ path: 'login-test-final-failure.png', fullPage: true });
      console.log('📸 Failure screenshot saved: login-test-final-failure.png');
    }
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔒 Browser closed');
    }
    await prisma.$disconnect();
  }
}

// Run the final test
testRealLoginFinal();
