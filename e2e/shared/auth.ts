import { Page } from '@playwright/test';

/**
 * Shared authentication helpers для E2E тестов
 */

export interface AdminCredentials {
  username: string;
  password: string;
}

export const DEFAULT_ADMIN: AdminCredentials = {
  username: process.env.TEST_ADMIN_USERNAME || 'admin',
  password: process.env.TEST_ADMIN_PASSWORD || 'string',
};

/**
 * Авторизация в CMS Admin UI
 */
export async function loginAsAdmin(page: Page, credentials: AdminCredentials = DEFAULT_ADMIN) {
  await page.goto('/login');
  
  // Ant Design Form использует id, совпадающий с именем Form.Item
  await page.fill('#login_username', credentials.username);
  await page.fill('#login_password', credentials.password);
  
  await page.click('button[type="submit"]');
  
  // Ждём редиректа на дашборд
  await page.waitForURL('/dashboard', { timeout: 5000 });
}

/**
 * Проверка, что пользователь авторизован
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Проверяем наличие элемента, который есть только у авторизованных
    await page.waitForSelector('[data-testid="user-menu"]', { timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Logout из CMS Admin UI
 */
export async function logout(page: Page) {
  await page.click('[data-testid="user-menu"]');
  await page.click('text=Выйти');
  await page.waitForURL('/login');
}
