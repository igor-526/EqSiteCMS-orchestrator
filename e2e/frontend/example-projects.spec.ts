import { test, expect } from '../shared/fixtures';

/**
 * E2E тест: Projects CRUD в CMS Admin UI
 * 
 * Покрывает:
 * - Создание проекта
 * - Редактирование проекта
 * - Удаление проекта
 * - Валидация форм
 */

test.describe('Projects Management', () => {
  
  test('should create new project', async ({ authenticatedPage: page }) => {
    // Переход на страницу проектов
    await page.goto('/admin/projects');
    
    // Проверка, что страница загрузилась
    await expect(page.locator('h1')).toContainText('Проекты');
    
    // Клик на кнопку создания
    await page.click('button:has-text("Создать проект")');
    
    // Заполнение формы
    await page.fill('input[name="title"]', 'Тестовый проект E2E');
    await page.fill('input[name="slug"]', 'test-project-e2e');
    await page.fill('textarea[name="description"]', 'Описание тестового проекта');
    
    // Выбор категории (если есть dropdown)
    const categorySelect = page.locator('select[name="category_id"]');
    if (await categorySelect.count() > 0) {
      await categorySelect.selectOption({ index: 1 });
    }
    
    // Сохранение
    await page.click('button[type="submit"]');
    
    // Проверка редиректа на страницу проекта
    await expect(page).toHaveURL(/\/admin\/projects\/\d+/);
    
    // Проверка, что данные отображаются
    await expect(page.locator('h1')).toContainText('Тестовый проект E2E');
    
    // Проверка toast-уведомления об успехе (если есть)
    const toast = page.locator('[data-testid="toast"], .toast, [role="alert"]');
    if (await toast.count() > 0) {
      await expect(toast).toContainText(/успешно|создан/i);
    }
  });
  
  test('should validate required fields', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/projects/new');
    
    // Попытка сохранить без заполнения обязательных полей
    await page.click('button[type="submit"]');
    
    // Проверка валидационных ошибок
    const titleError = page.locator('[data-testid="title-error"], .error:near(input[name="title"])');
    await expect(titleError).toBeVisible();
    
    // Проверка, что не произошёл редирект (остались на форме)
    await expect(page).toHaveURL(/\/admin\/projects\/new/);
  });
  
  test('should edit existing project', async ({ authenticatedPage: page }) => {
    // Переход на список проектов
    await page.goto('/admin/projects');
    
    // Клик на первый проект в списке
    const firstProject = page.locator('[data-testid="project-row"], tr').first();
    await firstProject.click();
    
    // Клик на кнопку редактирования
    await page.click('button:has-text("Редактировать")');
    
    // Изменение названия
    const titleInput = page.locator('input[name="title"]');
    const currentTitle = await titleInput.inputValue();
    const newTitle = `${currentTitle} (edited)`;
    
    await titleInput.fill(newTitle);
    
    // Сохранение
    await page.click('button[type="submit"]');
    
    // Проверка, что изменения применились
    await expect(page.locator('h1')).toContainText(newTitle);
  });
  
  test('should delete project with confirmation', async ({ authenticatedPage: page }) => {
    // Переход на проект
    await page.goto('/admin/projects');
    const firstProject = page.locator('[data-testid="project-row"], tr').first();
    await firstProject.click();
    
    // Запоминаем ID для проверки
    const url = page.url();
    const projectId = url.match(/\/admin\/projects\/(\d+)/)?.[1];
    
    // Клик на удаление
    await page.click('button:has-text("Удалить")');
    
    // Подтверждение в модальном окне
    const confirmButton = page.locator('button:has-text("Подтвердить"), button:has-text("Да")');
    await confirmButton.click();
    
    // Проверка редиректа на список
    await expect(page).toHaveURL('/admin/projects');
    
    // Проверка, что проект больше не отображается в списке
    if (projectId) {
      const deletedProject = page.locator(`[data-project-id="${projectId}"]`);
      await expect(deletedProject).toHaveCount(0);
    }
  });
  
  test('should search projects', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/projects');
    
    // Ввод в поле поиска
    const searchInput = page.locator('input[type="search"], input[placeholder*="Поиск"]');
    await searchInput.fill('тест');
    
    // Ожидание результатов (debounce)
    await page.waitForTimeout(500);
    
    // Проверка, что список обновился
    const results = page.locator('[data-testid="project-row"], tbody tr');
    const count = await results.count();
    
    // Должны быть результаты или пустой список
    if (count > 0) {
      await expect(results.first()).toContainText(/тест/i);
    }
  });
  
  test('should paginate projects', async ({ authenticatedPage: page }) => {
    await page.goto('/admin/projects');
    
    // Проверка наличия пагинации (если проектов много)
    const nextButton = page.locator('button:has-text("Следующая"), [aria-label="Next page"]');
    
    if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
      // Запоминаем первый элемент страницы 1
      const firstItemPage1 = await page.locator('[data-testid="project-row"], tbody tr').first().textContent();
      
      // Переход на страницу 2
      await nextButton.click();
      
      // Проверка, что список обновился
      const firstItemPage2 = await page.locator('[data-testid="project-row"], tbody tr').first().textContent();
      
      expect(firstItemPage1).not.toBe(firstItemPage2);
    }
  });
});
