# Автоматизация команд git
## Контекст
После выполнения каждой задачи есть необходимость работать с git самостоятельно и это немного запарно
Я хочу сделать скрипты и команды в make, которые будут выполнять рутинные действия
## Задачи
### Создание новой ветки и слияние в main
После работы все изменения остаются в рабочем дереве ветки main
Есть команда `make services-branches`. Она указывает на состояние веток всех репозиториев
На данный момент я иду по каждому репозиторию и выполняю следующие действия
```bash
cd services/service
git switch -c feature/branch_name
git add *
git add .dotted_files_and_folders
git commit -m "Finished"
git push origin feature/branch_name
git switch main
git merge feature/branch_name
git push origin main
```
Давай сделаем скрипт, который сначала проверит, что все репозитории находятся на ветке main, а потом автоматически пройдётся по каждому и сделает это дейтсвие
В качестве обязательных принимаемых аргументов должно быть название ветки и сообщение
### Релиз
Иногда нужно сразу же выполнить релиз. Для этого для затронутых репозиториев выполняется следующая комбинация команд
```bash
git switch release
git merge main
git push origin release
git switch main
```
Идея в том, что ветка `release` всегда мержит в себя изменения только с ветки `main`, а при push выполняется github workflow для автоматического деплоя
Давай добавим в команду флаг, которая после слияния изменений в main сделает релиз
### Примеры команд
#### Слияние
Команда: `make services-autogit -b "feature/seo-improve" -m "Improved seo services"
Выполнение:
```bash
git switch -c feature/seo-improve
git add *
git add .dotted (if exists)
git commit -m "Improved seo services"
git push origin feature/seo-improve
git switch main
git merge feature/seo-improve
git push origin main
```
#### Слияние и релиз
Команда: `make services-autogit -b "bugs/seo-improve --release" -m "Fixed seo services bugs"
Выполнение:
```bash
git switch -c bugs/seo-improve
git add *
git add .dotted (if exists)
git commit -m "Fixed seo services bugs"
git push origin bugs/seo-improve
git switch main
git merge bugs/seo-improve
git push origin main
git switch release
git merge main
git push origin release
git switch main
```
### Автоматизация
Давай заодно доработаем и агентный пайплайн
Я хочу, чтобы роутер после успешного выполнения задачи предлагал пользователю сделать слияние и релиз
При этом сам предлагал наименование ветки и комментарий
Пользователю должно оставаться только нажать кнопку, после чего роутер сам автоматически выполнит make команды
Ну или пользвователь может следующим сообщением скорректировать наименование ветки или комментарий