# Manual Browser QA Checklist - Photo Upload UI

**Change:** `photos-selector-improve`  
**Execution Unit:** FE-6  
**Date:** 2024  
**Status:** Ready for Manual Testing

## Prerequisites

1. ✅ Backend server running: `cd services/backend && PYTHONPATH=src uv run python src/main.py`
2. ✅ Frontend server running: `cd services/frontend && npm run dev`
3. ✅ Browser open at: `http://localhost:3000`
4. ✅ Test data: Multiple image files (JPG, PNG) of different sizes prepared
5. ✅ Test data: Non-image files (PDF, TXT) for validation testing

## Implementation Verification (Code Review)

✅ **Upload Button Implementation:**
- Button with "Загрузить" text and UploadOutlined icon
- Located next to "Добавить ещё" title
- Hidden file input with `type="file"`, `multiple`, `accept="image/*"`
- Loading state during upload (disabled + spinner)

✅ **Drag-and-Drop Implementation:**
- Visual indicator on dragOver (border: 2px dashed #1890ff, background: #e6f7ff)
- Handlers: onDragOver, onDragLeave, onDrop
- File type validation (only image/*)
- Concurrent upload blocking with warning message

✅ **Upload Logic:**
- Entity-specific upload functions: uploadPhotosToPrice, uploadPhotosToHorse, uploadPhotosToNews
- Partial success handling (photos[] + errors[])
- Russian pluralization for success messages
- Error notification for each failed file

✅ **Layout:**
- CSS Grid with `grid-template-columns: repeat(4, 1fr)` (verified in PhotoSelectorList)
- 4 photos per row on desktop/tablet
- Responsive grid maintained

---

## Manual QA Test Scenarios

### 1. Layout Verification (Task 10.1)

**Test 1.1: Grid Layout - Desktop (≥1200px)**
- [ ] Open PhotoSelectorModal
- [ ] Verify photos displayed in grid of exactly 4 per row
- [ ] With 10 photos: verify 3 rows (4+4+2)
- [ ] Verify last incomplete row is left-aligned, not stretched
- [ ] Verify all photo cards have consistent width

**Test 1.2: Grid Layout - Tablet (768px-1199px)**
- [ ] Resize browser to tablet width
- [ ] Verify grid still shows 4 photos per row
- [ ] Verify no layout breaks or overflow

**Test 1.3: Grid Layout - Different Photo Counts**
- [ ] With 3 photos: verify 1 row, left-aligned
- [ ] With 8 photos: verify 2 rows, both full
- [ ] With 15 photos: verify 4 rows (4+4+4+3)

---

### 2. Upload via File Picker (Tasks 10.2, 10.3, 10.4)

**Test 2.1: File Picker Opens**
- [ ] Click "Загрузить" button
- [ ] Verify system file dialog opens
- [ ] Verify dialog allows multiple file selection
- [ ] Verify dialog filters to images only

**Test 2.2: Cancel File Selection**
- [ ] Open file picker
- [ ] Close without selecting files
- [ ] Verify modal remains open
- [ ] Verify photo list unchanged

**Test 2.3: Upload Single File - Price Entity**
- [ ] Open PhotoSelectorModal for a price (услуга)
- [ ] Click "Загрузить", select 1 image
- [ ] Verify loading indicator appears
- [ ] Verify success notification: "Загружено 1 фотография"
- [ ] Verify photo appears in "Выбранные фотографии" section
- [ ] Verify photo displayed in 4-per-row grid

**Test 2.4: Upload Multiple Files - Horse Entity**
- [ ] Open PhotoSelectorModal for a horse (лошадь)
- [ ] Click "Загрузить", select 3 images
- [ ] Verify success notification: "Загружено 3 фотографии"
- [ ] Verify all 3 photos appear in "Выбранные фотографии"
- [ ] Verify grid layout (4 per row if more photos)

**Test 2.5: Upload Multiple Files - News Entity**
- [ ] Open PhotoSelectorModal for news (новость)
- [ ] Click "Загрузить", select 5 images
- [ ] Verify success notification: "Загружено 5 фотографий"
- [ ] Verify all 5 photos appear
- [ ] Verify grid: 2 rows (4+1)

---

### 3. Partial Success Handling (Task 10.6)

**Test 3.1: Mixed Valid and Invalid Files**
- [ ] Prepare 1 small valid image + 1 very large image (>10MB)
- [ ] Upload both via file picker
- [ ] Verify success notification: "Загружено 1 из 2 фотографий"
- [ ] Verify error notification for large file (with filename)
- [ ] Verify only valid photo appears in selected photos
- [ ] Verify photo count is correct

**Test 3.2: Full Failure - All Files Invalid**
- [ ] Select 2 non-image files (PDF, TXT)
- [ ] Upload via file picker
- [ ] Verify error notifications for both files
- [ ] Verify notification: "Не удалось загрузить ни одной фотографии"
- [ ] Verify selected photos section unchanged

---

### 4. Drag-and-Drop Upload (Task 10.5)

**Test 4.1: Drag-Over Visual Indication**
- [ ] Drag an image file from file manager
- [ ] Hover over "Добавить ещё" section
- [ ] Verify visual indicator appears (blue dashed border, light blue background)
- [ ] Drag outside the zone
- [ ] Verify indicator disappears

**Test 4.2: Drop Single File**
- [ ] Drag 1 image file over "Добавить ещё" section
- [ ] Drop the file
- [ ] Verify loading indicator
- [ ] Verify success notification
- [ ] Verify photo appears in "Выбранные фотографии"

**Test 4.3: Drop Multiple Files**
- [ ] Drag 5 image files over "Добавить ещё" section
- [ ] Drop the files
- [ ] Verify success notification: "Загружено 5 фотографий"
- [ ] Verify all 5 photos appear
- [ ] Verify grid layout (4+1)

**Test 4.4: Drop Non-Image File**
- [ ] Drag a PDF or TXT file
- [ ] Drop over "Добавить ещё" section
- [ ] Verify error notification: "Поддерживаются только файлы изображений"
- [ ] Verify file NOT uploaded
- [ ] Verify photo list unchanged

---

### 5. Concurrent Upload Protection (Task 10.7)

**Test 5.1: Block Concurrent Drop**
- [ ] Drop 3 large image files (to ensure slow upload)
- [ ] Immediately drop another file before first upload completes
- [ ] Verify warning message: "Файлы уже загружаются, подождите..."
- [ ] Verify second drop is ignored
- [ ] Wait for first upload to complete
- [ ] Try dropping again
- [ ] Verify second drop now works

**Test 5.2: Block File Picker During Upload**
- [ ] Start upload via file picker (3 large files)
- [ ] Click "Загрузить" button again during upload
- [ ] Verify button is disabled (loading state)
- [ ] Verify file picker does not open

---

### 6. Infinite Scroll Regression (Task 10.8)

**Test 6.1: Infinite Scroll Still Works**
- [ ] Open PhotoSelectorModal with >25 available photos
- [ ] Scroll to bottom of available photos list
- [ ] Verify next 25 photos load automatically
- [ ] Verify loading indicator appears during fetch
- [ ] Verify drag-and-drop zone remains active after scroll
- [ ] Verify grid maintains 4-per-row layout

**Test 6.2: Scroll After Upload**
- [ ] Upload 2 photos via drag-and-drop
- [ ] Scroll available photos list
- [ ] Verify infinite scroll still triggers
- [ ] Verify new photos load correctly

---

### 7. Backward Compatibility (Task 10.9)

**Test 7.1: Add from Gallery (PlusOutlined)**
- [ ] Open PhotoSelectorModal with existing photos
- [ ] Click PlusOutlined icon on an available photo
- [ ] Verify photo moves to "Выбранные фотографии"
- [ ] Verify icon changes to MinusOutlined

**Test 7.2: Remove from Selected (MinusOutlined)**
- [ ] Click MinusOutlined on a selected photo
- [ ] Verify photo removed from "Выбранные фотографии"
- [ ] Verify photo appears in available list with PlusOutlined

**Test 7.3: Set Main Photo (StarOutlined)**
- [ ] With 3+ selected photos, click StarOutlined on second photo
- [ ] Verify icon changes to StarFilled (gold)
- [ ] Verify previous main photo (if any) shows StarOutlined
- [ ] Verify only one photo has StarFilled

**Test 7.4: Mixed Workflow - Upload + Gallery**
- [ ] Upload 2 photos via file picker
- [ ] Add 1 photo from gallery (PlusOutlined)
- [ ] Verify all 3 photos in "Выбранные фотографии"
- [ ] Set main photo (StarOutlined) on gallery photo
- [ ] Verify works correctly
- [ ] Remove uploaded photo (MinusOutlined)
- [ ] Verify removal works

**Test 7.5: Upload with Pre-Selected Photos**
- [ ] Open PhotoSelectorModal with 5 already selected photos
- [ ] Verify "Выбранные фотографии" shows 5 photos in grid (4+1)
- [ ] Verify "Загрузить" button is available
- [ ] Upload 2 more photos
- [ ] Verify now 7 photos total (4+3 grid)
- [ ] Verify can set any photo as main

---

### 8. Edge Cases

**Test 8.1: No Entity ID**
- [ ] (If possible) Open PhotoSelectorModal with entityId = null
- [ ] Try to upload a file
- [ ] Verify error: "Не указан идентификатор сущности"
- [ ] Verify upload blocked

**Test 8.2: Empty File Selection**
- [ ] Click "Загрузить"
- [ ] Select files, then deselect all before confirming
- [ ] Confirm empty selection
- [ ] Verify no error, modal remains open

**Test 8.3: Rapid Repeated Uploads**
- [ ] Upload 1 photo successfully
- [ ] Immediately upload another photo
- [ ] Verify both uploads complete successfully
- [ ] Verify both photos appear

**Test 8.4: Large Number of Files**
- [ ] Try to upload 20 small images
- [ ] Verify upload works (or shows appropriate limit message)
- [ ] Verify all uploaded photos appear
- [ ] Verify grid layout with 20 photos (5 full rows)

---

## Browser Compatibility (Optional Extended Testing)

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest, macOS)
- [ ] Edge (latest)

---

## Performance Observations

- [ ] Upload progress indicator appears promptly (<100ms)
- [ ] Success/error notifications appear after upload completes
- [ ] Drag-and-drop visual feedback is immediate
- [ ] No UI freezing during upload
- [ ] Grid layout renders without flicker

---

## Accessibility (Optional)

- [ ] Keyboard: Tab to "Загрузить" button, Enter to trigger
- [ ] File input accessible via keyboard
- [ ] Screen reader announces notifications (check with screen reader)

---

## Notes for Manual Tester

- All tests should be performed with real network requests (not mocked)
- Backend must be running and accessible
- Use browser DevTools Network tab to verify API requests:
  - `POST /prices/{id}/photos/upload`
  - `POST /horses/{id}/photos/upload`
  - `POST /news/{id}/photos/upload`
- Check console for any JavaScript errors
- Take screenshots of any issues found

---

## Expected Results Summary

✅ All 10 main test groups should pass  
✅ No regression in existing functionality  
✅ Consistent 4-per-row grid layout  
✅ Proper error handling and user feedback  
✅ Drag-and-drop works smoothly with visual feedback  
✅ Concurrent upload protection prevents issues  
✅ Infinite scroll unaffected by new upload UI  

---

## Automated Test Coverage (Reference)

The following scenarios are already covered by automated tests in `PhotoSelectorModal.test.tsx`:

- ✅ Upload button click triggers file input
- ✅ File selection triggers upload API
- ✅ Drag-and-drop handlers call upload logic
- ✅ Partial success response handling
- ✅ Error notifications display correctly
- ✅ Loading states toggle correctly
- ✅ Concurrent upload blocking
- ✅ Non-image file validation
- ✅ Backward compatibility (add/remove/set main)

Manual testing focuses on:
- Real browser UI/UX
- Real file system integration
- Visual layout verification
- Cross-browser compatibility
- Performance and responsiveness
