import { test as base, expect } from '@playwright/test';
import { loginAsAdmin, AdminCredentials, DEFAULT_ADMIN } from './auth';

/**
 * Расширенные fixtures для E2E тестов
 */

type CustomFixtures = {
  authenticatedPage: any; // Page с авторизацией
  adminCredentials: AdminCredentials;
};

/**
 * Fixture для автоматической авторизации
 */
export const test = base.extend<CustomFixtures>({
  adminCredentials: [DEFAULT_ADMIN, { option: true }],
  
  authenticatedPage: async ({ page, adminCredentials }, use) => {
    // Авторизуемся перед каждым тестом
    await loginAsAdmin(page, adminCredentials);
    
    // Передаём страницу в тест
    await use(page);
    
    // Cleanup после теста (если нужно)
  },
});

export { expect };
