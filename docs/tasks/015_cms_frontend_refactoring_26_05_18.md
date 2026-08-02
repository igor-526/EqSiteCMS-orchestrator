# Контекст
Я попросил frontend разработчика посмотреть кодовую базу frontend CMS. Получил развёрнутый ответ о проблемах. Наша задача исправить эту ситуацию и скорректировать агентов так, чтобы этого больше не повторилось
# Отзыв frontend разработчика
```plaintext
По проблемам (есди смотреть строго)  
  
1) Вынести все строки в енумы/константы. Строковых литералов в коде быть не должно. Пример - статус ок, но такого много  
  
await expect(horseSetPedigree(horseId, { sire_id: null })).resolves.toMatchObject({  
status: "ok",  
data: null,  
});  
  
2)Излишне краткий нейминг плохо.  
Пример  
const horse = horses.find((h) => h.id === horseId);  
  
3)Логику нужно вынести из верстки  
Пример  
  
selectedHorse={  
selectedHorse && "pedigree" in selectedHorse  
? selectedHorse  
: null  
}  
onClose={() => {  
setHorsePedigreeModalOpen(false);  
setSelectedHorse(null);  
}}  
  
4)Функция перегружена. Рвзбить помельче  
  
const applyMutation = useCallback(  
async (payload: HorseSetPedigreeInDto) => {  
if (!horse?.id) return false;  
if (!canUpdatePedigree) {...  
5)Статические стили живут в css. Динамически их правильно считать только если оно зависит от контекста и не является конечным множеством  
<div style={{ minWidth: compact ? 220 : 240 }}>  
{label && (  
<Typography.Text  
strong  
style={{ display: "block", marginBottom: 8, textAlign: "center" }}  
  
2) HorsePedigreePickerModal.tsx - тут вообще капец. Как минимум, нужно кнопку в отдельный компонент вынести. Но в этом файле почти каждая из проблем выше проявилась
```
# Настройка линтера
Разработчик ещё написал следующее:
```plaintext
Про строки и ограничение сложности функций кстати у линтера есть правила, можно в нексоре посмотреть - там оно прикручено
```
Речь идёт о проекте тут `/home/igor/projects/nexora-seo/orchestration/services/fe`
# Задача
Нам нужно исправить возникшую ситуацию, скорректировать настройки линтера, скорректировать агентов и исправить всё, что появится после корректировки настроек линтера
Напиши план по реализации в docs/plans/refactoring/cms_frontend_refactoring_26_05_18.md
Не приступай к реализации до согласования плана