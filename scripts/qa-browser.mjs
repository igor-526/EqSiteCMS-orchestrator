#!/usr/bin/env node
/**
 * QA Browser - Universal headless browser checks для всех frontend сервисов
 * 
 * Использование:
 *   node scripts/qa-browser.mjs --service=<name> --page=<route> --checks=<check1,check2>
 * 
 * Примеры:
 *   node scripts/qa-browser.mjs --service=frontend --page=/news --checks=smoke,table
 *   node scripts/qa-browser.mjs --service=site-ad --page=/ --checks=smoke,responsive,seo
 *   node scripts/qa-browser.mjs --service=site-ksk-inlove --page=/ --checks=smoke,responsive
 */

import { chromium } from 'playwright';
import { exec } from 'child_process';
import { promisify } from 'util';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const execAsync = promisify(exec);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = resolve(__dirname, '..');

// ═════════════════════════════════════════════════════════
// Service Configurations
// ═════════════════════════════════════════════════════════

const SERVICE_CONFIGS = {
  frontend: {
    name: 'Frontend CMS',
    dir: 'services/frontend',
    baseUrl: process.env.QA_BASE_URL || 'http://localhost:3000',
    defaultChecks: ['smoke', 'table', 'accessibility'],
    viewports: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    }
  },
  
  'site-ad': {
    name: 'Site Aleksandrova Dacha',
    dir: 'services/site-ad',
    baseUrl: process.env.QA_BASE_URL || 'http://localhost:3001',
    defaultChecks: ['smoke', 'responsive', 'seo', 'accessibility'],
    viewports: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    }
  },
  
  'site-ksk-inlove': {
    name: 'Site KSK INLOVE',
    dir: 'services/site-ksk-inlove',
    baseUrl: process.env.QA_BASE_URL || 'http://localhost:3002',
    defaultChecks: ['smoke', 'responsive', 'seo', 'accessibility'],
    viewports: {
      desktop: { width: 1920, height: 1080 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 375, height: 667 }
    }
  }
};

// ═════════════════════════════════════════════════════════
// CLI Args Parsing
// ═════════════════════════════════════════════════════════

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value || true;
  return acc;
}, {});

const SERVICE_NAME = args.service;
const PAGE_ROUTE = args.page || '/';
const CHECKS = args.checks 
  ? args.checks.split(',') 
  : (SERVICE_NAME && SERVICE_CONFIGS[SERVICE_NAME] 
      ? SERVICE_CONFIGS[SERVICE_NAME].defaultChecks 
      : ['smoke']);

if (!SERVICE_NAME || !SERVICE_CONFIGS[SERVICE_NAME]) {
  console.error('❌ Unknown or missing service\n');
  console.log('Usage: node scripts/qa-browser.mjs --service=<name> [options]\n');
  console.log('Available services:');
  Object.keys(SERVICE_CONFIGS).forEach(key => {
    console.log(`  - ${key}`);
  });
  process.exit(1);
}

const CONFIG = SERVICE_CONFIGS[SERVICE_NAME];
const SERVICE_DIR = resolve(PROJECT_ROOT, CONFIG.dir);

// ═════════════════════════════════════════════════════════
// Check Definitions
// ═════════════════════════════════════════════════════════

const CHECKS_REGISTRY = {
  // Smoke test: страница загружается без ошибок
  async smoke(page) {
    const errors = [];
    
    page.on('pageerror', error => {
      errors.push({
        type: 'JavaScript Error',
        message: error.message,
        severity: 'critical'
      });
    });
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push({
          type: 'Console Error',
          message: msg.text(),
          severity: 'major'
        });
      }
    });
    
    await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    const title = await page.title();
    
    return {
      name: 'Smoke Test',
      passed: errors.length === 0,
      details: {
        title,
        errors: errors.length > 0 ? errors : undefined
      }
    };
  },
  
  // Responsive: страница работает на всех breakpoints
  async responsive(page) {
    const results = [];
    
    for (const [device, viewport] of Object.entries(CONFIG.viewports)) {
      await page.setViewportSize(viewport);
      await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
        waitUntil: 'networkidle'
      });
      
      const hasOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      
      const bodyHeight = await page.evaluate(() => {
        return document.body.scrollHeight;
      });
      
      results.push({
        device,
        viewport,
        hasOverflow,
        bodyHeight,
        passed: !hasOverflow && bodyHeight > 0
      });
    }
    
    const allPassed = results.every(r => r.passed);
    
    return {
      name: 'Responsive Check',
      passed: allPassed,
      details: { results }
    };
  },
  
  // Table: проверка отображения таблицы (для CMS)
  async table(page) {
    await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
      waitUntil: 'networkidle'
    });
    
    const tableExists = await page.locator('table, [role="table"]').count() > 0;
    
    if (!tableExists) {
      return {
        name: 'Table Check',
        passed: false,
        details: { error: 'No table found on page' }
      };
    }
    
    const rowCount = await page.locator('tbody tr, [role="row"]').count();
    
    return {
      name: 'Table Check',
      passed: rowCount > 0,
      details: {
        tableFound: true,
        rowCount
      }
    };
  },
  
  // Form: проверка открытия формы (для CMS)
  async form(page) {
    await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
      waitUntil: 'networkidle'
    });
    
    const createButton = page.locator('button:has-text("Создать"), button:has-text("Добавить"), button:has-text("Create"), button:has-text("Add")').first();
    
    const buttonExists = await createButton.count() > 0;
    
    if (!buttonExists) {
      return {
        name: 'Form Check',
        passed: false,
        details: { error: 'Create button not found' }
      };
    }
    
    await createButton.click();
    await page.waitForSelector('form, [role="dialog"]', { timeout: 5000 });
    
    const formExists = await page.locator('form').count() > 0;
    
    return {
      name: 'Form Check',
      passed: formExists,
      details: {
        buttonFound: true,
        formOpened: formExists
      }
    };
  },
  
  // SEO: проверка meta tags (для site consumers)
  async seo(page) {
    await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
      waitUntil: 'networkidle'
    });
    
    const findings = [];
    
    // Title
    const title = await page.title();
    if (!title || title.length < 10) {
      findings.push({
        rule: 'Page title should be descriptive (min 10 chars)',
        severity: 'major',
        current: title
      });
    }
    
    // Meta description
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    if (!description || description.length < 50) {
      findings.push({
        rule: 'Meta description should be descriptive (min 50 chars)',
        severity: 'major',
        current: description
      });
    }
    
    // Open Graph
    const ogTitle = await page.locator('meta[property="og:title"]').count();
    const ogDescription = await page.locator('meta[property="og:description"]').count();
    const ogImage = await page.locator('meta[property="og:image"]').count();
    
    if (ogTitle === 0 || ogDescription === 0 || ogImage === 0) {
      findings.push({
        rule: 'Open Graph tags should be present',
        severity: 'minor',
        missing: [
          ogTitle === 0 && 'og:title',
          ogDescription === 0 && 'og:description',
          ogImage === 0 && 'og:image'
        ].filter(Boolean)
      });
    }
    
    return {
      name: 'SEO Check',
      passed: findings.filter(f => f.severity === 'critical' || f.severity === 'major').length === 0,
      details: {
        findings: findings.length > 0 ? findings : undefined,
        summary: `${findings.length} SEO issues found`
      }
    };
  },
  
  // Accessibility: базовые a11y проверки
  async accessibility(page) {
    await page.goto(`${CONFIG.baseUrl}${PAGE_ROUTE}`, {
      waitUntil: 'networkidle'
    });
    
    const findings = [];
    
    // Images without alt
    const imagesWithoutAlt = await page.locator('img:not([alt])').count();
    if (imagesWithoutAlt > 0) {
      findings.push({
        rule: 'Images must have alt text',
        severity: 'major',
        count: imagesWithoutAlt
      });
    }
    
    // Buttons without label
    const buttonsWithoutLabel = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      return buttons.filter(btn => 
        !btn.textContent.trim() && 
        !btn.getAttribute('aria-label')
      ).length;
    });
    
    if (buttonsWithoutLabel > 0) {
      findings.push({
        rule: 'Buttons must have accessible text',
        severity: 'major',
        count: buttonsWithoutLabel
      });
    }
    
    // Heading hierarchy
    const headingIssues = await page.evaluate(() => {
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
      const levels = headings.map(h => parseInt(h.tagName[1]));
      
      let issues = 0;
      for (let i = 1; i < levels.length; i++) {
        if (levels[i] - levels[i - 1] > 1) {
          issues++;
        }
      }
      return issues;
    });
    
    if (headingIssues > 0) {
      findings.push({
        rule: 'Heading levels should not skip',
        severity: 'minor',
        count: headingIssues
      });
    }
    
    return {
      name: 'Accessibility Check',
      passed: findings.filter(f => f.severity === 'critical' || f.severity === 'major').length === 0,
      details: {
        findings: findings.length > 0 ? findings : undefined,
        summary: `${findings.length} accessibility issues found`
      }
    };
  }
};

// ═════════════════════════════════════════════════════════
// Main Runner
// ═════════════════════════════════════════════════════════

async function runQA() {
  console.log('🎭 QA Browser - Universal headless checks\n');
  console.log(`Service: ${CONFIG.name}`);
  console.log(`Page: ${PAGE_ROUTE}`);
  console.log(`Checks: ${CHECKS.join(', ')}\n`);
  
  let browser;
  let devServer;
  
  try {
    // Запускаем dev server если нужно
    if (!process.env.QA_SKIP_SERVER) {
      console.log('🚀 Starting dev server...');
      devServer = exec('npm run dev', {
        cwd: SERVICE_DIR
      });
      
      await waitForServer(CONFIG.baseUrl, 30000);
      console.log('✅ Dev server ready\n');
    }
    
    // Запускаем browser
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const context = await browser.newContext({
      viewport: CONFIG.viewports.desktop
    });
    
    const page = await context.newPage();
    
    // Запускаем проверки
    const results = [];
    
    for (const checkName of CHECKS) {
      const checkFn = CHECKS_REGISTRY[checkName];
      
      if (!checkFn) {
        console.error(`❌ Unknown check: ${checkName}`);
        continue;
      }
      
      console.log(`Running: ${checkName}...`);
      
      try {
        const result = await checkFn(page);
        results.push(result);
        
        console.log(result.passed ? '  ✅ PASS' : '  ❌ FAIL');
        if (result.details) {
          console.log(`  Details: ${JSON.stringify(result.details, null, 2)}`);
        }
      } catch (error) {
        console.error(`  💥 ERROR: ${error.message}`);
        results.push({
          name: checkName,
          passed: false,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Summary
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    console.log('═'.repeat(50));
    console.log('📊 Summary\n');
    console.log(`Service: ${CONFIG.name}`);
    console.log(`Total checks: ${results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}\n`);
    
    if (failed === 0) {
      console.log('🎉 All checks passed!');
      process.exit(0);
    } else {
      console.log('⚠️  Some checks failed');
      
      results.filter(r => !r.passed).forEach(r => {
        console.log(`\n❌ ${r.name}:`);
        if (r.error) {
          console.log(`   Error: ${r.error}`);
        }
        if (r.details) {
          console.log(`   ${JSON.stringify(r.details, null, 2)}`);
        }
      });
      
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
    
    if (devServer) {
      devServer.kill();
    }
  }
}

// ═════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════

async function waitForServer(url, timeout) {
  const start = Date.now();
  
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok || response.status === 404) {
        return;
      }
    } catch (error) {
      // Ещё не готов
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error(`Server not ready after ${timeout}ms`);
}

// ═════════════════════════════════════════════════════════
// Run
// ═════════════════════════════════════════════════════════

runQA();
