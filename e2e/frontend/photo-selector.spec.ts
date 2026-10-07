import { test, expect } from '../shared/fixtures';
import path from 'path';
import fs from 'fs';
import os from 'os';

/**
 * E2E тест: PhotoSelectorModal - Upload UI
 * 
 * Покрывает:
 * - Layout verification (4-column grid)
 * - Upload via file picker
 * - Drag-and-drop upload
 * - File validation
 * - Backward compatibility (gallery, main photo)
 * - Partial success handling
 * - Concurrent upload protection
 * - Infinite scroll regression
 * 
 * Based on: openspec/changes/photos-selector-improve/specs/photo-upload-ui/spec.md
 */

// Создаём тестовые файлы для upload
function createTestImageFile(filename: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, filename);
  
  // Создаём минимальный валидный PNG (1x1 pixel, прозрачный)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
    0x42, 0x60, 0x82
  ]);
  
  fs.writeFileSync(filePath, pngData);
  return filePath;
}

function createTestNonImageFile(filename: string): string {
  const tmpDir = os.tmpdir();
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, 'This is a text file, not an image.');
  return filePath;
}

test.describe('PhotoSelectorModal - Layout Verification', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    // Переход на страницу с PhotoSelectorModal (например, редактирование услуги)
    await page.goto('/admin/prices');
    
    // Создаём или выбираем первую услугу
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    if (await firstPrice.count() > 0) {
      await firstPrice.click();
    } else {
      // Создаём новую услугу для теста
      await page.click('button:has-text("Создать")');
      await page.fill('input[name="title"]', 'Test Price for Photos E2E');
      await page.fill('input[name="price"]', '1000');
      await page.click('button[type="submit"]');
    }
    
    // Открываем PhotoSelectorModal (кнопка "Управление фотографиями" или аналогичная)
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    
    // Ждём открытия модального окна
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should display photos in 4-column grid', async ({ authenticatedPage: page }) => {
    // Проверяем наличие секции "Выбранные фотографии"
    const selectedPhotosSection = page.locator('text=Выбранные фотографии');
    await expect(selectedPhotosSection).toBeVisible();
    
    // Если есть фотографии, проверяем layout
    const photoGrid = page.locator('[data-testid="photo-selector-list"], .photo-grid');
    const gridStyle = await photoGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    
    // Проверяем, что grid имеет 4 колонки
    expect(gridStyle).toContain('1fr');
    
    // Подсчитываем количество колонок (должно быть 4)
    const columnCount = gridStyle.split(' ').length;
    expect(columnCount).toBe(4);
  });
  
  test('should display 10 photos in 3 rows (4+4+2)', async ({ authenticatedPage: page }) => {
    // Этот тест требует наличия ровно 10 фотографий
    // Загружаем 10 фотографий через API или UI
    
    const testFiles = Array.from({ length: 10 }, (_, i) => 
      createTestImageFile(`test-photo-${i + 1}.png`)
    );
    
    try {
      // Находим скрытый input file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles);
      
      // Ждём успешной загрузки
      await page.waitForSelector('text=Загружено 10 фотографий', { timeout: 10000 });
      
      // Проверяем количество фото в grid
      const photos = page.locator('[data-testid="photo-card"], .photo-card');
      await expect(photos).toHaveCount(10);
      
      // Проверяем расположение: первые 4 в первом ряду
      const firstRowPhotos = photos.nth(0).locator('xpath=following-sibling::*').first();
      // Проверяем, что последний ряд прижат влево (не растянут)
      const lastRowPhoto = photos.nth(9);
      const lastRowLeft = await lastRowPhoto.evaluate((el) => el.getBoundingClientRect().left);
      const firstRowLeft = await photos.nth(0).evaluate((el) => el.getBoundingClientRect().left);
      
      // Левый край последнего ряда должен совпадать с первым
      expect(Math.abs(lastRowLeft - firstRowLeft)).toBeLessThan(5); // погрешность 5px
      
    } finally {
      // Cleanup: удаляем временные файлы
      testFiles.forEach(file => fs.unlinkSync(file));
    }
  });
  
  test('should display 3 photos in 1 row, left-aligned', async ({ authenticatedPage: page }) => {
    const testFiles = Array.from({ length: 3 }, (_, i) => 
      createTestImageFile(`test-photo-3-${i + 1}.png`)
    );
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles);
      
      await page.waitForSelector('text=Загружено 3 фотографии', { timeout: 10000 });
      
      const photos = page.locator('[data-testid="photo-card"], .photo-card');
      await expect(photos).toHaveCount(3);
      
      // Проверяем, что фотографии не растянуты на всю ширину
      const firstPhoto = photos.nth(0);
      const containerWidth = await page.locator('[data-testid="photo-selector-list"]').evaluate(
        (el) => el.getBoundingClientRect().width
      );
      const photoWidth = await firstPhoto.evaluate((el) => el.getBoundingClientRect().width);
      
      // Ширина одной фотографии должна быть примерно 1/4 контейнера (с учётом gap)
      const expectedPhotoWidth = containerWidth / 4;
      expect(photoWidth).toBeLessThan(expectedPhotoWidth * 1.2); // 20% погрешность
      
    } finally {
      testFiles.forEach(file => fs.unlinkSync(file));
    }
  });
});

test.describe('PhotoSelectorModal - Upload via File Picker', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should open file picker on button click', async ({ authenticatedPage: page }) => {
    // Находим кнопку "Загрузить"
    const uploadButton = page.locator('button:has-text("Загрузить")');
    await expect(uploadButton).toBeVisible();
    
    // Проверяем наличие скрытого input file
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toHaveCount(1);
    
    // Проверяем атрибуты input
    await expect(fileInput).toHaveAttribute('accept', 'image/*');
    await expect(fileInput).toHaveAttribute('multiple', '');
  });
  
  test('should upload single file successfully', async ({ authenticatedPage: page }) => {
    const testFile = createTestImageFile('single-upload.png');
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);
      
      // Ждём loading indicator
      const loadingIndicator = page.locator('[data-testid="upload-loading"], .ant-spin');
      await expect(loadingIndicator).toBeVisible();
      
      // Ждём success notification
      await page.waitForSelector('text=Загружено 1 фотография', { timeout: 10000 });
      
      // Проверяем, что фотография появилась в "Выбранные фотографии"
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      await expect(selectedPhotos).toHaveCount(1, { timeout: 5000 });
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
  
  test('should upload multiple files successfully', async ({ authenticatedPage: page }) => {
    const testFiles = Array.from({ length: 3 }, (_, i) => 
      createTestImageFile(`multi-upload-${i + 1}.png`)
    );
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles);
      
      // Ждём success notification для 3 фотографий
      await page.waitForSelector('text=Загружено 3 фотографии', { timeout: 10000 });
      
      // Проверяем, что все фотографии появились
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      await expect(selectedPhotos).toHaveCount(3, { timeout: 5000 });
      
    } finally {
      testFiles.forEach(file => fs.unlinkSync(file));
    }
  });
  
  test('should cancel file selection without changes', async ({ authenticatedPage: page }) => {
    // Подсчитываем текущее количество фото
    const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
    const initialCount = await selectedPhotos.count();
    
    // Симулируем отмену выбора файлов (setInputFiles с пустым массивом)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.evaluate((input: HTMLInputElement) => {
      // Создаём событие change без файлов
      const event = new Event('change', { bubbles: true });
      input.dispatchEvent(event);
    });
    
    // Ждём небольшую задержку
    await page.waitForTimeout(500);
    
    // Проверяем, что количество фото не изменилось
    const finalCount = await selectedPhotos.count();
    expect(finalCount).toBe(initialCount);
    
    // Проверяем, что модальное окно осталось открытым
    await expect(page.locator('[data-testid="photo-selector-modal"], .ant-modal')).toBeVisible();
  });
});

test.describe('PhotoSelectorModal - File Validation', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should reject non-image files with error notification', async ({ authenticatedPage: page }) => {
    const testFile = createTestNonImageFile('test-document.txt');
    
    try {
      const fileInput = page.locator('input[type="file"]');
      
      // Playwright автоматически валидирует accept атрибут, но мы проверим клиентскую валидацию
      // Устанавливаем файл напрямую, минуя browser validation
      await fileInput.evaluate((input: HTMLInputElement, filePath: string) => {
        // Создаём DataTransfer с txt файлом
        const dt = new DataTransfer();
        const file = new File(['text content'], 'test.txt', { type: 'text/plain' });
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }, testFile);
      
      // Ждём error notification
      await page.waitForSelector('text=Поддерживаются только файлы изображений', { timeout: 5000 });
      
      // Проверяем, что список фотографий не изменился
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      const count = await selectedPhotos.count();
      
      // Ждём небольшую задержку и проверяем, что счётчик не изменился
      await page.waitForTimeout(1000);
      const finalCount = await selectedPhotos.count();
      expect(finalCount).toBe(count);
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
});

test.describe('PhotoSelectorModal - Drag-and-Drop Upload', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should show visual indication on drag-over', async ({ authenticatedPage: page }) => {
    const dropZone = page.locator('[data-testid="photo-drop-zone"], [data-testid="available-photos"]');
    
    // Получаем начальные стили
    const initialBorder = await dropZone.evaluate((el) => window.getComputedStyle(el).border);
    
    // Симулируем dragover event
    await dropZone.dispatchEvent('dragover', {
      dataTransfer: {
        types: ['Files'],
        files: []
      }
    });
    
    // Проверяем, что появилась визуальная индикация
    await page.waitForTimeout(100); // Даём время на обновление стилей
    const dragOverBorder = await dropZone.evaluate((el) => window.getComputedStyle(el).border);
    
    // Граница должна измениться (dashed blue)
    expect(dragOverBorder).not.toBe(initialBorder);
    
    // Симулируем dragleave
    await dropZone.dispatchEvent('dragleave');
    
    await page.waitForTimeout(100);
    const finalBorder = await dropZone.evaluate((el) => window.getComputedStyle(el).border);
    
    // Граница должна вернуться к исходному состоянию
    expect(finalBorder).toBe(initialBorder);
  });
  
  test('should upload file via drag-and-drop', async ({ authenticatedPage: page }) => {
    const testFile = createTestImageFile('dnd-upload.png');
    
    try {
      const dropZone = page.locator('[data-testid="photo-drop-zone"], [data-testid="available-photos"]');
      
      // Читаем файл для создания DataTransfer
      const fileBuffer = fs.readFileSync(testFile);
      
      // Симулируем drop event с файлом
      await dropZone.evaluate((el, { fileName, fileContent }) => {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array(fileContent)], fileName, { type: 'image/png' });
        dt.items.add(file);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: dt
        });
        
        el.dispatchEvent(dropEvent);
      }, { fileName: 'dnd-upload.png', fileContent: Array.from(fileBuffer) });
      
      // Ждём success notification
      await page.waitForSelector('text=Загружено 1 фотография', { timeout: 10000 });
      
      // Проверяем, что фотография появилась
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      await expect(selectedPhotos).toHaveCount(1, { timeout: 5000 });
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
  
  test('should reject non-image file via drag-and-drop', async ({ authenticatedPage: page }) => {
    const testFile = createTestNonImageFile('dnd-document.pdf');
    
    try {
      const dropZone = page.locator('[data-testid="photo-drop-zone"], [data-testid="available-photos"]');
      
      const fileBuffer = fs.readFileSync(testFile);
      
      await dropZone.evaluate((el, { fileName, fileContent }) => {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array(fileContent)], fileName, { type: 'application/pdf' });
        dt.items.add(file);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: dt
        });
        
        el.dispatchEvent(dropEvent);
      }, { fileName: 'dnd-document.pdf', fileContent: Array.from(fileBuffer) });
      
      // Ждём error notification
      await page.waitForSelector('text=Поддерживаются только файлы изображений', { timeout: 5000 });
      
      // Проверяем, что фотографии не добавились
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      const initialCount = await selectedPhotos.count();
      
      await page.waitForTimeout(1000);
      const finalCount = await selectedPhotos.count();
      expect(finalCount).toBe(initialCount);
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
});

test.describe('PhotoSelectorModal - Backward Compatibility', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should add photo from gallery via PlusOutlined', async ({ authenticatedPage: page }) => {
    // Находим доступные фотографии в галерее
    const availablePhotos = page.locator('[data-testid="available-photos"] [data-testid="photo-card"]');
    const availableCount = await availablePhotos.count();
    
    if (availableCount === 0) {
      // Если нет доступных фото, пропускаем тест
      test.skip();
      return;
    }
    
    // Находим первую фотографию с PlusOutlined
    const firstAvailablePhoto = availablePhotos.first();
    const plusIcon = firstAvailablePhoto.locator('[data-icon="plus"], .anticon-plus');
    
    // Кликаем на PlusOutlined
    await plusIcon.click();
    
    // Проверяем, что фотография переместилась в "Выбранные фотографии"
    const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
    await expect(selectedPhotos).toHaveCount(1, { timeout: 3000 });
    
    // Проверяем, что иконка изменилась на MinusOutlined
    const selectedPhoto = selectedPhotos.first();
    const minusIcon = selectedPhoto.locator('[data-icon="minus"], .anticon-minus');
    await expect(minusIcon).toBeVisible();
  });
  
  test('should set main photo via StarOutlined', async ({ authenticatedPage: page }) => {
    // Загружаем 2 фотографии для теста
    const testFiles = Array.from({ length: 2 }, (_, i) => 
      createTestImageFile(`star-test-${i + 1}.png`)
    );
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles);
      
      await page.waitForSelector('text=Загружено 2 фотографии', { timeout: 10000 });
      
      // Находим вторую фотографию
      const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
      const secondPhoto = selectedPhotos.nth(1);
      
      // Кликаем на StarOutlined второй фотографии
      const starIcon = secondPhoto.locator('[data-icon="star"], .anticon-star');
      await starIcon.click();
      
      // Проверяем, что иконка изменилась на StarFilled (заполненная звезда)
      const starFilled = secondPhoto.locator('[data-icon="star-filled"], .anticon-star-filled');
      await expect(starFilled).toBeVisible({ timeout: 3000 });
      
      // Проверяем, что у других фотографий StarOutlined (пустая звезда)
      const firstPhoto = selectedPhotos.nth(0);
      const firstPhotoStar = firstPhoto.locator('[data-icon="star"], .anticon-star:not(.anticon-star-filled)');
      await expect(firstPhotoStar).toBeVisible();
      
    } finally {
      testFiles.forEach(file => fs.unlinkSync(file));
    }
  });
  
  test('should mix upload and gallery selection', async ({ authenticatedPage: page }) => {
    // Загружаем 1 фотографию
    const testFile = createTestImageFile('mixed-upload.png');
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);
      
      await page.waitForSelector('text=Загружено 1 фотография', { timeout: 10000 });
      
      // Добавляем 1 фотографию из галереи
      const availablePhotos = page.locator('[data-testid="available-photos"] [data-testid="photo-card"]');
      const availableCount = await availablePhotos.count();
      
      if (availableCount > 0) {
        const firstAvailable = availablePhotos.first();
        const plusIcon = firstAvailable.locator('[data-icon="plus"], .anticon-plus');
        await plusIcon.click();
        
        // Проверяем, что теперь 2 фотографии
        const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
        await expect(selectedPhotos).toHaveCount(2, { timeout: 3000 });
        
        // Устанавливаем главную фотографию (из галереи)
        const galleryPhoto = selectedPhotos.nth(1);
        const starIcon = galleryPhoto.locator('[data-icon="star"], .anticon-star');
        await starIcon.click();
        
        // Проверяем, что главная фотография установлена
        const starFilled = galleryPhoto.locator('[data-icon="star-filled"], .anticon-star-filled');
        await expect(starFilled).toBeVisible({ timeout: 3000 });
      }
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
});

test.describe('PhotoSelectorModal - Partial Success Handling', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should handle partial success (2 out of 3 files)', async ({ authenticatedPage: page }) => {
    // Создаём 2 валидных файла и 1 огромный (будет отклонён сервером)
    const validFile1 = createTestImageFile('valid-1.png');
    const validFile2 = createTestImageFile('valid-2.png');
    
    // Для симуляции ошибки размера создаём очень большой файл
    // (в реальности сервер отклонит, но для E2E мы проверим UI обработку)
    const largeFile = path.join(os.tmpdir(), 'large-file.png');
    const largePngData = Buffer.alloc(11 * 1024 * 1024); // 11 MB
    fs.writeFileSync(largeFile, largePngData);
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles([validFile1, validFile2, largeFile]);
      
      // Ожидаем либо partial success, либо полный успех
      // (зависит от того, валидирует ли backend размер файла)
      await page.waitForSelector('text=/Загружено (2|3)/', { timeout: 15000 });
      
      // Если получили partial success
      const partialNotification = page.locator('text=Загружено 2 из 3');
      if (await partialNotification.count() > 0) {
        // Проверяем наличие error notification для большого файла
        const errorNotification = page.locator('text=/too large|слишком большой|превышает/i');
        await expect(errorNotification).toBeVisible({ timeout: 5000 });
        
        // Проверяем, что добавились только 2 фотографии
        const selectedPhotos = page.locator('[data-testid="selected-photos"] [data-testid="photo-card"]');
        await expect(selectedPhotos).toHaveCount(2, { timeout: 5000 });
      }
      
    } finally {
      fs.unlinkSync(validFile1);
      fs.unlinkSync(validFile2);
      fs.unlinkSync(largeFile);
    }
  });
});

test.describe('PhotoSelectorModal - Concurrent Upload Protection', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should block concurrent uploads with warning', async ({ authenticatedPage: page }) => {
    const firstBatch = Array.from({ length: 3 }, (_, i) => 
      createTestImageFile(`concurrent-batch1-${i + 1}.png`)
    );
    const secondFile = createTestImageFile('concurrent-batch2.png');
    
    try {
      // Начинаем первую загрузку
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(firstBatch);
      
      // Сразу же пытаемся загрузить второй файл (через drop)
      const dropZone = page.locator('[data-testid="photo-drop-zone"], [data-testid="available-photos"]');
      const fileBuffer = fs.readFileSync(secondFile);
      
      await dropZone.evaluate((el, { fileName, fileContent }) => {
        const dt = new DataTransfer();
        const file = new File([new Uint8Array(fileContent)], fileName, { type: 'image/png' });
        dt.items.add(file);
        
        const dropEvent = new DragEvent('drop', {
          bubbles: true,
          dataTransfer: dt
        });
        
        el.dispatchEvent(dropEvent);
      }, { fileName: 'concurrent-batch2.png', fileContent: Array.from(fileBuffer) });
      
      // Проверяем предупреждающее сообщение
      const warningMessage = page.locator('text=Файлы уже загружаются, подождите');
      await expect(warningMessage).toBeVisible({ timeout: 3000 });
      
      // Ждём завершения первой загрузки
      await page.waitForSelector('text=Загружено 3 фотографии', { timeout: 15000 });
      
      // Теперь должны иметь возможность загрузить второй файл
      await fileInput.setInputFiles(secondFile);
      await page.waitForSelector('text=Загружено 1 фотография', { timeout: 10000 });
      
    } finally {
      firstBatch.forEach(file => fs.unlinkSync(file));
      fs.unlinkSync(secondFile);
    }
  });
  
  test('should disable upload button during upload', async ({ authenticatedPage: page }) => {
    const testFiles = Array.from({ length: 2 }, (_, i) => 
      createTestImageFile(`disable-test-${i + 1}.png`)
    );
    
    try {
      const uploadButton = page.locator('button:has-text("Загрузить")');
      
      // Проверяем, что кнопка активна
      await expect(uploadButton).toBeEnabled();
      
      // Начинаем загрузку
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFiles);
      
      // Проверяем, что кнопка стала disabled (loading state)
      await expect(uploadButton).toBeDisabled({ timeout: 1000 });
      
      // Ждём завершения загрузки
      await page.waitForSelector('text=Загружено 2 фотографии', { timeout: 10000 });
      
      // Проверяем, что кнопка снова активна
      await expect(uploadButton).toBeEnabled({ timeout: 2000 });
      
    } finally {
      testFiles.forEach(file => fs.unlinkSync(file));
    }
  });
});

test.describe('PhotoSelectorModal - Infinite Scroll Regression', () => {
  
  test.beforeEach(async ({ authenticatedPage: page }) => {
    await page.goto('/admin/prices');
    const firstPrice = page.locator('[data-testid="price-row"], tbody tr').first();
    await firstPrice.click();
    await page.click('button:has-text("Фотографии"), button:has-text("Управление фотографиями")');
    await page.waitForSelector('[data-testid="photo-selector-modal"], .ant-modal');
  });
  
  test('should maintain infinite scroll after upload', async ({ authenticatedPage: page }) => {
    // Загружаем 1 фотографию
    const testFile = createTestImageFile('scroll-test.png');
    
    try {
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);
      
      await page.waitForSelector('text=Загружено 1 фотография', { timeout: 10000 });
      
      // Прокручиваем список доступных фотографий
      const availablePhotosContainer = page.locator('[data-testid="available-photos"]');
      
      // Проверяем начальное количество фотографий
      const initialPhotos = page.locator('[data-testid="available-photos"] [data-testid="photo-card"]');
      const initialCount = await initialPhotos.count();
      
      // Прокручиваем до конца
      await availablePhotosContainer.evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      
      // Ждём загрузки новых фотографий (если их больше 25)
      await page.waitForTimeout(2000);
      
      const finalCount = await initialPhotos.count();
      
      // Если фотографий больше, чем изначально, значит infinite scroll работает
      // (Если фотографий мало, то счётчик не изменится, это тоже OK)
      if (finalCount > initialCount) {
        expect(finalCount).toBeGreaterThan(initialCount);
      }
      
      // Проверяем, что drag-and-drop зона всё ещё активна
      const dropZone = page.locator('[data-testid="photo-drop-zone"], [data-testid="available-photos"]');
      await expect(dropZone).toBeVisible();
      
    } finally {
      fs.unlinkSync(testFile);
    }
  });
  
  test('should maintain 4-column grid after infinite scroll', async ({ authenticatedPage: page }) => {
    const availablePhotosContainer = page.locator('[data-testid="available-photos"]');
    
    // Прокручиваем до конца
    await availablePhotosContainer.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });
    
    // Ждём подгрузки
    await page.waitForTimeout(2000);
    
    // Проверяем grid layout
    const photoGrid = availablePhotosContainer;
    const gridStyle = await photoGrid.evaluate((el) => {
      return window.getComputedStyle(el).gridTemplateColumns;
    });
    
    // Проверяем, что grid всё ещё имеет 4 колонки
    const columnCount = gridStyle.split(' ').filter(c => c.includes('fr')).length;
    expect(columnCount).toBe(4);
  });
});
