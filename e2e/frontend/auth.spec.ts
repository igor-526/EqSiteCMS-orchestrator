import { test, expect } from '@playwright/test';
import { loginAsAdmin, logout, DEFAULT_ADMIN } from '../shared/auth';

/**
 * E2E тест: Авторизация в CMS Admin UI
 */

test.describe('Authentication', () => {
  
  test('should login with valid credentials', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Проверка, что попали на дашборд
    await expect(page).toHaveURL(/\/admin/);
    
    // Проверка наличия элементов авторизованного UI
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[name="email"]', 'wrong@example.com');
    await page.fill('input[name="password"]', 'wrongpassword');
    
    await page.click('button[type="submit"]');
    
    // Проверка, что остались на странице логина
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Проверка сообщения об ошибке
    const errorMessage = page.locator('[data-testid="error-message"], .error, [role="alert"]');
    await expect(errorMessage).toContainText(/неверн|ошибка|invalid/i);
  });
  
  test('should redirect to login when accessing protected page', async ({ page }) => {
    // Попытка перейти на защищённую страницу без авторизации
    await page.goto('/admin/projects');
    
    // Должен произойти редирект на логин
    await expect(page).toHaveURL(/\/auth\/login/);
  });
  
  test('should logout successfully', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Logout
    await logout(page);
    
    // Проверка, что попали на страницу логина
    await expect(page).toHaveURL(/\/auth\/login/);
    
    // Попытка зайти на защищённую страницу снова должна редиректить
    await page.goto('/admin/projects');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
  
  test('should validate email format', async ({ page }) => {
    await page.goto('/auth/login');
    
    await page.fill('input[name="email"]', 'not-an-email');
    await page.fill('input[name="password"]', 'somepassword');
    
    await page.click('button[type="submit"]');
    
    // Проверка клиентской валидации
    const emailInput = page.locator('input[name="email"]');
    const validationMessage = await emailInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    
    expect(validationMessage).toBeTruthy();
  });
});
