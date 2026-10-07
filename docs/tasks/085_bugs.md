## Контекст
В процессе использования сервисов возникли следующие баги:
### Glitchtip
#### Main Backend
Возникшие в процессе эксплуатации баги описаны в этих файлах:
- `docs/bugs/085_main_backend_1.md`
- `docs/bugs/085_main_backend_2.md`
- `docs/bugs/085_main_backend_3.md`
- `docs/bugs/085_main_backend_4.md`
- `docs/bugs/085_main_backend_5.md`
- `docs/bugs/085_main_backend_6.md`
- `docs/bugs/085_main_backend_7.md`
- `docs/bugs/085_main_backend_8.md`
- `docs/bugs/085_main_backend_9.md`
#### VK Service
Возникшие в процессе эксплуатации баги описаны в этих файлах:
- `docs/bugs/065_vk_service.md`
### Github Actions
#### Main Backend
При релизе github workflow был остановлен на стадии test | Install deps с ошибкой
```plaintext
Run uv sync --locked

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:2)uv sync --locked

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:3)shell: /usr/bin/bash -e {0}

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:4)env:

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:5)IMAGE: ghcr.io/igor-526/eqsitecms-backend

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:6)UV_PYTHON_INSTALL_DIR: /home/runner/work/_temp/uv-python-dir

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:8)error: Failed to initialize cache at `/home/igor/projects/eqSiteCMS/.cache/uv`

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:9)cause: failed to create directory `/home/igor/projects/eqSiteCMS/.cache/uv`: Permission denied (os error 13)

[](https://github.com/igor-526/EqSiteCMS-backend/actions/runs/37588592425/job/112684414384#step:4:10)Error: Process completed with exit code 2.
```
#### frontend
При релизе github workflow был остановлен на стадии test | test с ошибкой
```
Run make test

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:2)make test

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:3)shell: /usr/bin/bash -e {0}

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:4)env:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:5)IMAGE: ghcr.io/igor-526/eqsitecms-frontend

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:7)npm test

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:8)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:9)> frontend@0.1.0 test

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:10)> vitest run

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:11)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:12)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:13)RUN v4.1.6 /home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:14)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:15)stderr | src/api/api-boundary.test.ts > API boundary auth and protected write behavior > blocks unhandled real network requests through MSW

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:16)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:17)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:18)• GET [http://127.0.0.1/api/unhandled-live-backend](http://127.0.0.1/api/unhandled-live-backend)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:19)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:20)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:21)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:22)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:23)stderr | src/features/horses/hooks/useHorses.test.ts > src/api/horses — API boundary > horseUpdate surfaces 401 denial without auth

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:24)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:25)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:26)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:27)✓ src/api/api-boundary.test.ts (27 tests) 168ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:28)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:29)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:30)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:31)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:32)✓ src/features/horses/hooks/useHorses.test.ts (75 tests) 708ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:33)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:34)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:35)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:36)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:37)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:38)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:39)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:40)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Upload button > disables upload button when uploading

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:41)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:42)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:43)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:44)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:45)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:46)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:47)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:48)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:49)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:50)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:51)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:52)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:53)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:54)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:55)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:56)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:57)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:58)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:59)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:60)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:61)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:62)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:63)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:64)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:65)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:66)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:67)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:68)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:69)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:70)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:71)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:72)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:73)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:74)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:75)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:76)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:77)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:78)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:79)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:80)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:81)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:82)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:83)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:84)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:85)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:86)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:87)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:88)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:89)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:90)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:91)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:92)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:93)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > File selection and upload > uploads files via file input for price entity

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:94)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:95)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:96)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:97)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:98)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:99)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:100)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:101)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:102)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:103)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:104)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:105)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:106)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:107)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:108)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:109)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:110)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:111)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:112)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:113)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:114)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:115)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:116)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:117)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:118)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:119)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:120)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:121)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:122)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:123)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:124)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:125)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:126)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:127)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:128)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:129)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:130)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:131)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:132)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:133)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:134)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:135)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:136)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:137)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:138)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:139)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:140)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:141)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:142)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:143)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:144)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:145)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:146)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > File selection and upload > uploads files via file input for horse entity

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:147)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:148)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:149)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:150)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:151)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:152)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:153)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:154)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:155)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:156)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:157)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:158)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:159)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:160)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:161)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:162)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:163)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:164)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:165)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:166)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:167)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:168)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:169)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:170)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:171)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:172)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:173)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:174)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:175)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:176)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:177)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:178)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:179)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:180)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:181)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:182)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:183)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:184)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:185)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:186)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:187)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:188)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:189)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:190)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:191)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:192)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:193)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:194)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:195)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:196)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:197)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:198)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:199)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > File selection and upload > uploads files via file input for news entity

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:200)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:201)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:202)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:203)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:204)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:205)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:206)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:207)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:208)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:209)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:210)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:211)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:212)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:213)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:214)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:215)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:216)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:217)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:218)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:219)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:220)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:221)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:222)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:223)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:224)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:225)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:226)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:227)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:228)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:229)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:230)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:231)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:232)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:233)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:234)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:235)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:236)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:237)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:238)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:239)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:240)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:241)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:242)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:243)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:244)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:245)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:246)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:247)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:248)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:249)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:250)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:251)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:252)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:253)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > File selection and upload > allows re-uploading files multiple times (file input value reset)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:254)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:255)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:256)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:257)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:258)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:259)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:260)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:261)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:262)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:263)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:264)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:265)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:266)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:267)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:268)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:269)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:270)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:271)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:272)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:273)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:274)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:275)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:276)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:277)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:278)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:279)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:280)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:281)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:282)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:283)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:284)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:285)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:286)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:287)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:288)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:289)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:290)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:291)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:292)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:293)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:294)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:295)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:296)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:297)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:298)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:299)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:300)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:301)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:302)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:303)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:304)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:305)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > File selection and upload > allows re-uploading files multiple times (file input value reset)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:306)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:307)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:308)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:309)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:310)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:311)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:312)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:313)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:314)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:315)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:316)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:317)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:318)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:319)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:320)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:321)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:322)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:323)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:324)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:325)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:326)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:327)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:328)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:329)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:330)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:331)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:332)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:333)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:334)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:335)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:336)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:337)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:338)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:339)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:340)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:341)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:342)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:343)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:344)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:345)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:346)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:347)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:348)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:349)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:350)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:351)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:352)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:353)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:354)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:355)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:356)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:357)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:358)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:359)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:360)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:361)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:362)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:363)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:364)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:365)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:366)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:367)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:368)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:369)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:370)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:371)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:372)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:373)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:374)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:375)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:376)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:377)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:378)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:379)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:380)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:381)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:382)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:383)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:384)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:385)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:386)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:387)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:388)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:389)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:390)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:391)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:392)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:393)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:394)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:395)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:396)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:397)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:398)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:399)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:400)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:401)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Error handling > handles partial success (2 out of 3 files uploaded)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:402)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:403)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:404)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:405)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:406)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:407)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:408)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:409)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:410)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:411)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:412)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:413)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:414)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:415)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:416)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:417)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:418)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:419)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:420)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:421)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:422)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:423)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:424)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:425)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:426)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:427)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:428)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:429)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:430)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:431)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:432)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:433)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:434)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:435)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:436)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:437)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:438)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:439)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:440)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:441)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:442)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:443)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:444)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:445)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:446)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:447)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:448)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:449)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:450)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:451)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:452)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:453)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:454)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Error handling > handles complete upload failure

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:455)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:456)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:457)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:458)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:459)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:460)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:461)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:462)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:463)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:464)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:465)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:466)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:467)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:468)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:469)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:470)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:471)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:472)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:473)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:474)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:475)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:476)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:477)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:478)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:479)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:480)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:481)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:482)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:483)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:484)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:485)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:486)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:487)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:488)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:489)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:490)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:491)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:492)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:493)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:494)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:495)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:496)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:497)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:498)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:499)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:500)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:501)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:502)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:503)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:504)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:505)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:506)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:507)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Error handling > handles API error response

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:508)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:509)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:510)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:511)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:512)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:513)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:514)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:515)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:516)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:517)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:518)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:519)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:520)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:521)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:522)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:523)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:524)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:525)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:526)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:527)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:528)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:529)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:530)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:531)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:532)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:533)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:534)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:535)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:536)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:537)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:538)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:539)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:540)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:541)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:542)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:543)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:544)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:545)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:546)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:547)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:548)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:549)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:550)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:551)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:552)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:553)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:554)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:555)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:556)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:557)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:558)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:559)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:560)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:561)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:562)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Error handling > handles network errors gracefully

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:563)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:564)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:565)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:566)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:567)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:568)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:569)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:570)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:571)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:572)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:573)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:574)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:575)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:576)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:577)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:578)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:579)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:580)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:581)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:582)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:583)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:584)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:585)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:586)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:587)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:588)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:589)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:590)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:591)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:592)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:593)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:594)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:595)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:596)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:597)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:598)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:599)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:600)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:601)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:602)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:603)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:604)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:605)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:606)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:607)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:608)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:609)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:610)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:611)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:612)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:613)Upload error: Error: Network error

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:614)at /home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/src/features/photoSelector/ui/PhotoSelectorModal.test.tsx:566:66

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:615)at file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:302:11

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:616)at file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:1903:26

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:617)at file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:2326:20

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:618)at new Promise (<anonymous>)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:619)at runWithCancel (file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:2323:10)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:620)at file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:2305:20

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:621)at new Promise (<anonymous>)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:622)at runWithTimeout (file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:2272:10)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:623)at file:///home/runner/work/EqSiteCMS-frontend/EqSiteCMS-frontend/node_modules/@vitest/runner/dist/chunk-artifact.js:2955:64

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:624)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:625)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:626)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Drag-and-drop functionality > shows visual indicator on dragover

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:627)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:628)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:629)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:630)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:631)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:632)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:633)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:634)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:635)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:636)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:637)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:638)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:639)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:640)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Drag-and-drop functionality > hides visual indicator on dragleave

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:641)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:642)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:643)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:644)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:645)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:646)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:647)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:648)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:649)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:650)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:651)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:652)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:653)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:654)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:655)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:656)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:657)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:658)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:659)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:660)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:661)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:662)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:663)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Drag-and-drop functionality > uploads files on drop

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:664)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:665)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:666)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:667)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:668)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:669)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:670)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:671)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:672)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:673)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:674)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:675)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:676)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:677)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Drag-and-drop functionality > blocks concurrent drop during upload

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:678)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:679)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:680)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:681)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:682)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:683)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:684)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:685)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:686)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:687)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:688)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:689)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:690)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:691)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:692)stderr | src/features/photoSelector/ui/PhotoSelectorModal.test.tsx > PhotoSelectorModal > Regression: Set main photo after upload > upload returns photo IDs that can be used to set main photo

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:693)An update to PhotoSelectorModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:694)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:695)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:696)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:697)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:698)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:699)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:700)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:701)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:702)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:703)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:704)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:705)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:706)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:707)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:708)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:709)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:710)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:711)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:712)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:713)An update to Button inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:714)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:715)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:716)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:717)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:718)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:719)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:720)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:721)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:722)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:723)An update to Portal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:724)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:725)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:726)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:727)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:728)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:729)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:730)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:731)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:732)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:733)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:734)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:735)✓ src/features/photoSelector/ui/PhotoSelectorModal.test.tsx (26 tests) 4446ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:736)✓ adds an unselected photo with the complete photo_ids list 728ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:737)✓ disables upload button when uploading 303ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:738)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:739)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:740)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:741)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:742)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:743)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:744)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:745)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:746)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:747)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:748)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:749)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:750)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:751)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:752)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:753)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:754)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:755)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:756)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:757)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:758)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:759)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:760)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:761)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:762)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:763)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:764)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:765)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:766)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:767)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:768)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:769)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:770)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:771)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:772)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:773)stderr | src/features/horses/ui/Horses/HorsesTable.test.tsx > HorsesTable > shows a stable list error state

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:774)Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:775)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:776)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:777)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:778)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:779)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:780)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:781)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:782)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:783)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:784)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:785)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:786)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:787)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:788)✓ src/features/horses/ui/Horses/HorsesTable.test.tsx (22 tests) 8098ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:789)✓ renders horse name in the table 848ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:790)✓ keeps the slug column and renders the backend slug 462ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:791)✓ renders the pedigree name column with exact data and a neutral null value 350ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:792)✓ shows default Наши filter without an empty selection tag 406ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:793)✓ keeps the base filter boolean when selecting Чужие 407ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:794)✓ renders photos button with count 827ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:795)✓ calls onPhotosClick when photos button is clicked (stops propagation) 1083ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:796)✓ keeps three pedigree indicators and uses gray count badges only for photos and services 1097ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:797)✓ shows missing pedigree positions in gray and opens pedigree without triggering the row 412ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:798)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:799)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:800)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:801)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:802)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:803)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:804)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:805)stderr | src/features/notifications/ui/VkCard.test.tsx > VkCard: действия > reports a clipboard failure without breaking the card

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:806)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:807)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:808)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:809)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:810)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:811)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:812)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:813)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:814)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:815)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:816)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:817)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:818)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:819)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:820)✓ src/features/horses/ui/Horses/HorseCreateUpdateModal.test.tsx (29 tests) 18030ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:821)✓ renders 'Добавить лошадь' title when no horse selected 1023ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:822)✓ renders 'Редактировать лошадь' title when horse is selected 439ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:823)✓ initializes exact pedigree name for edit 340ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:824)✓ submits an exact pedigree name on create 2176ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:825)✓ shows an empty URL path on create and submits the typed slug 1386ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:826)✓ prefills and submits a changed slug on edit 857ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:827)✓ keeps the prefilled slug when name and slug are untouched 339ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:828)✓ requests slug regeneration when the name changes first 659ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:829)✓ submits a manual slug entered after changing the name 1371ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:830)✓ preserves a manual slug when the name changes afterwards 1276ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:831)✓ preserves an explicitly cleared slug when the name changes afterwards 743ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:832)✓ resets manual slug precedence after close and reopen 922ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:833)✓ submits an empty slug to request backend regeneration 435ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:834)✓ keeps edited name and slug while showing a backend slug error 1139ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:835)✓ guards a name and slug update against double submit 481ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:836)✓ submits null when an existing pedigree name is cleared 489ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:837)✓ omits an unchanged pedigree name from an update payload 338ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:838)✓ guards against double submit while a mutation is pending 587ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:839)✓ hides protected create and update actions without a write scope 533ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:840)✓ submits create payload without kind 560ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:841)✓ submits update payload without kind 412ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:842)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:843)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:844)✓ src/features/horses/hooks/useHorseServiceRelations.test.ts (13 tests) 1621ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:845)✓ renders Drawer rows from the paginated relation response contract 796ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:846)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:847)stderr | src/features/horses/hooks/useHorseBreeds.test.ts > horseBreedsService > surfaces HTTP 401 without a live request

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:848)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:849)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:850)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:851)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:852)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:853)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:854)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:855)✓ src/features/horses/hooks/useHorseBreeds.test.ts (17 tests) 328ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:856)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:857)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:858)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:859)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:860)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:861)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:862)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:863)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:864)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:865)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:866)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:867)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:868)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:869)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:870)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:871)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:872)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:873)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:874)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:875)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:876)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:877)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:878)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:879)❯ src/features/notifications/ui/VkCard.test.tsx (17 tests | 2 failed) 25428ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:880)✓ renders the unlinked state with only a link action 1922ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:881)✓ hides the instruction and the dialog link until the code is requested 559ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:882)✓ never offers a link to the community page 384ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:883)✓ opens the dialog link in a new tab with a safe rel 385ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:884)✓ renders the active state with the display name and no code block 636ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:885)✓ renders the blocked state with a warning and no code request 709ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:886)✓ renders the pending state and refresh action 2718ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:887)✓ shows a skeleton while loading and an alert on a load failure 2143ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:888)✓ warns and hides links when bot-info is unavailable 282ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:889)× issues a code, shows the full command and copies it 5594ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:890)× reports a clipboard failure without breaking the card 5549ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:891)✓ marks an expired code as invalid 1558ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:892)✓ shows a domain conflict and keeps the card usable 322ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:893)✓ sends exactly one request when the code button is double clicked 852ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:894)✓ confirms unlink in a modal, succeeds and returns to the unlinked state 835ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:895)✓ keeps the unlink modal open and shows the error on failure 798ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:896)✓ places the vk card between the email card and the events card 176ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:897)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:898)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:899)stderr | src/features/prices/ui/Price/PriceEditModal.test.tsx > PriceEditModal > Submit > блокирует повторную отправку, пока create-запрос выполняется

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:900)An update to PriceEditModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:901)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:902)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:903)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:904)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:905)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:906)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:907)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:908)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:909)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:910)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:911)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:912)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:913)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:914)stderr | src/features/prices/ui/Price/PriceEditModal.test.tsx > PriceEditModal > Управление таблицами > клик на 'Добавить таблицу' (alert) создаёт вкладку 'Таблица 1'

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:915)Warning: [antd: Divider] `type` is deprecated. Please use `orientation` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:916)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:917)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:918)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:919)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:920)stderr | src/features/notifications/ui/NotificationsPage.test.tsx > NotificationsPage > shows loading and load errors

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:921)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:922)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:923)• GET [http://127.0.0.1/api/vks/me](http://127.0.0.1/api/vks/me)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:924)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:925)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:926)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:927)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:928)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:929)• GET [http://127.0.0.1/api/vks/bot-info](http://127.0.0.1/api/vks/bot-info)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:930)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:931)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:932)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:933)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:934)stderr | src/features/prices/ui/Price/PriceEditModal.test.tsx > PriceEditModal > Управление таблицами > клик на '+ Колонка' показывает inline-панель, а не новый Modal

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:935)Warning: [antd: Divider] `type` is deprecated. Please use `orientation` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:936)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:937)stderr | src/features/prices/ui/Price/PriceEditModal.test.tsx > PriceEditModal > Управление таблицами > клик на '+ Колонка' показывает inline-панель, а не новый Modal

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:938)Warning: [antd: Divider] `type` is deprecated. Please use `orientation` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:939)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:940)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:941)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:942)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:943)✓ src/features/prices/ui/Price/PriceEditModal.test.tsx (23 tests) 7314ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:944)✓ create mode → 'Добавить услугу' 780ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:945)✓ обновляет счётчик после ввода текста 645ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:946)✓ 'Добавить' активна после ввода названия 509ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:947)✓ update mode: вызывает onUpdate с id и новыми данными 715ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:948)✓ клик на 'Добавить таблицу' (alert) создаёт вкладку 'Таблица 1' 820ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:949)✓ клик на '+ Колонка' показывает inline-панель, а не новый Modal 775ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:950)stderr | src/features/horses/ui/HorseBreeds/HorseBreedsTable.test.tsx > HorseBreedsTable > renders type column labels

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:951)In HTML, <button> cannot be a descendant of <button>.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:952)This will cause a hydration error.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:953)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:954)<CmsProviders>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:955)<ConfigProvider>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:956)<ProviderChildren parentContext={{...}} legacyLocale={undefined}>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:957)<MotionWrapper>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:958)<PropWarning>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:959)<NotificationProvider>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:960)<Notifications>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:961)<PageTitleProvider>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:962)<HorseBreedsTable horseBreeds={[...]} loading={false} filters={{limit:25,offset:0, ...}} ...>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:963)<MainTable сolumns={[...]} data={[...]} loading={false} filtersElements={null} ...>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:964)<div data-loading={false}>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:965)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:966)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:967)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:968)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:969)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:970)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:971)<div>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:972)> <button type="button" onClick={function onClick}>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:973)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:974)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:975)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:976)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:977)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:978)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:979)<span>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:980)<div className="flex gap-2">

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:981)<Button onClick={function handlePageModalClick}>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:982)<Wave component="Button" disabled={false}>

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:983)> <button

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:984)> onClick={function}

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:985)> type="button"

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:986)> className="ant-btn css-var-root ant-btn-default ant-btn-color-default ant-btn-variant-..."

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:987)> style={{}}

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:988)> disabled={false}

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:989)> ref={function}

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:990)> >

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:991)...

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:992)...

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:993)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:994)<button> cannot contain a nested <button>.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:995)See this log for the ancestor stack trace.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:996)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:997)✓ src/features/horses/hooks/useHorsePedigree.test.ts (5 tests) 226ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:998)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:999)stderr | src/features/notifications/ui/NotificationsPage.test.tsx > NotificationsPage > validates create, preserves backend error, prevents double submit and refreshes on success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1000)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1001)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1002)• GET [http://127.0.0.1/api/vks/me](http://127.0.0.1/api/vks/me)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1003)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1004)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1005)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1006)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1007)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1008)• GET [http://127.0.0.1/api/vks/bot-info](http://127.0.0.1/api/vks/bot-info)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1009)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1010)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1011)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1012)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1013)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1014)✓ src/features/horses/ui/HorseBreeds/HorseBreedsTable.test.tsx (7 tests) 1137ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1015)✓ renders type column labels 316ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1016)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1017)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1018)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1019)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1020)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1021)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1022)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1023)stderr | src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.test.tsx > HorseServiceRelationCreateUpdateModal > renders create title

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1024)`NaN` is an invalid value for the `height` css style property.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1025)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1026)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1027)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1028)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1029)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1030)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1031)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1032)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1033)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1034)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1035)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1036)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1037)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1038)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1039)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1040)✓ src/features/notifications/ui/NotificationsPage.test.tsx (11 tests) 11774ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1041)✓ renders history placeholder and settings missing-email empty state 1385ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1042)✓ renders email confirmation state false 421ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1043)✓ shows loading and load errors 2212ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1044)✓ validates create, preserves backend error, prevents double submit and refreshes on success 2370ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1045)✓ changes email and closes modal 1063ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1046)✓ shows conditional delete warning and keeps modal on error approved=false 937ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1047)✓ shows conditional delete warning and keeps modal on error approved=true 1036ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1048)✓ resends confirmation with success feedback 916ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1049)✓ commits checkbox only after success and preserves it after failure 858ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1050)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1051)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1052)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1053)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1054)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1055)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1056)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1057)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1058)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1059)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1060)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1061)stderr | src/features/horses/ui/HorseBreeds/HorseBreedsCreateUpdateModal.test.tsx > HorseBreedCreateUpdateModal > guards create from double submit

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1062)An update to HorseBreedCreateUpdateModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1063)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1064)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1065)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1066)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1067)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1068)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1069)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1070)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1071)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1072)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1073)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1074)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1075)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1076)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1077)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1078)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1079)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1080)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1081)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1082)✓ src/features/horses/ui/HorseServiceRelations/HorseServiceRelationCreateUpdateModal.test.tsx (18 tests) 7494ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1083)✓ renders create title 861ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1084)✓ renders edit title 332ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1085)✓ calls onCreate with service_id on submit 656ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1086)✓ replaces inherited values when another service is selected 612ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1087)✓ sends explicit nulls when inherited nullable values are cleared 650ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1088)✓ calls onUpdate with relation id on submit 308ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1089)✓ calls onDelete after popconfirm 478ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1090)✓ includes description override in create data 1546ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1091)✓ includes price override in update data 340ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1092)✓ disables submit button when submitting is true even with service selected 390ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1093)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1094)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1095)✓ src/features/horses/ui/HorseBreeds/HorseBreedsCreateUpdateModal.test.tsx (13 tests) 7651ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1096)✓ defaults create kind to horse and includes it in payload 1462ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1097)✓ uses selected breed kind for update payload 470ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1098)✓ assigns a group on create and clears an existing group with explicit null 1298ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1099)✓ submits empty and 63-character short names and displays field errors 1773ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1100)✓ guards create from double submit 451ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1101)✓ submits empty optional slug and description unchanged 385ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1102)✓ retains entered values while validation or generic backend errors are surfaced 730ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1103)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1104)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1105)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1106)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1107)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1108)stderr | src/features/horses/hooks/useHorseBreedGroups.test.ts > horse breed groups API/service > surfaces HTTP 401 without live backend

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1109)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1110)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1111)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1112)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1113)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1114)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1115)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1116)✓ src/features/horses/hooks/useHorseBreedGroups.test.ts (12 tests) 277ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1117)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1118)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1119)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1120)stderr | src/features/user-management/hooks/useUserManagement.test.ts > useUserManagement > uses limit/offset and resets offset for search, reset and page size

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1121)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1122)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1123)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1124)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1125)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1126)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1127)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1128)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1129)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1130)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1131)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1132)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1133)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1134)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1135)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1136)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1137)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1138)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1139)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1140)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1141)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1142)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1143)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1144)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1145)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1146)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1147)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1148)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1149)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1150)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1151)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1152)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1153)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1154)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1155)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1156)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1157)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1158)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1159)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1160)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1161)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1162)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1163)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1164)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1165)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1166)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1167)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1168)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1169)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1170)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1171)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1172)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1173)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1174)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1175)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1176)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1177)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1178)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1179)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1180)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1181)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1182)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1183)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1184)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1185)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1186)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1187)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1188)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1189)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1190)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1191)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1192)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1193)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1194)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1195)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1196)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1197)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1198)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1199)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1200)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1201)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1202)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1203)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1204)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1205)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1206)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1207)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1208)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1209)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1210)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1211)An update to TestComponent inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1212)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1213)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1214)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1215)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1216)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1217)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1218)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1219)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1220)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1221)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1222)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1223)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > preloads edit values and shows localized labels, never UUID

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1224)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1225)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1226)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1227)✓ src/features/user-management/hooks/useUserManagement.test.ts (15 tests) 304ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1228)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1229)✓ src/features/horses/ui/Horses/HorsePedigreeModal.test.tsx (8 tests) 5096ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1230)✓ renders full pedigree layout without global save button 1053ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1231)✓ renders missing parent slots and empty foals state 355ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1232)✓ hides remove and go actions for missing parent slot 763ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1233)✓ disables mutation actions when scope is missing 845ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1234)✓ calls edit handler from filled relation edit menu 786ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1235)✓ calls pedigree handler from filled relation go menu 810ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1236)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps UUID values in create payload and guards double submit

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1237)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1238)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1239)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1240)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1241)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1242)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1243)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps UUID values in create payload and guards double submit

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1244)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1245)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1246)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1247)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps UUID values in create payload and guards double submit

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1248)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1249)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1250)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1251)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps multiple UUIDs and localized selected tags

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1252)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1253)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1254)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1255)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1256)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1257)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1258)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps multiple UUIDs and localized selected tags

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1259)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1260)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1261)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps multiple UUIDs and localized selected tags

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1262)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1263)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1264)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1265)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > keeps multiple UUIDs and localized selected tags

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1266)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1267)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1268)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1269)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > preserves create form after failure and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1270)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1271)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1272)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1273)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1274)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1275)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1276)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1277)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > preserves create form after failure and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1278)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1279)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1280)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > preserves create form after failure and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1281)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1282)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1283)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > preserves create form after failure and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1284)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1285)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1286)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1287)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > submits update UUIDs, preserves edit form after denial and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1288)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1289)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1290)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1291)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > submits update UUIDs, preserves edit form after denial and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1292)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1293)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1294)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1295)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > submits update UUIDs, preserves edit form after denial and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1296)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1297)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1298)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > submits update UUIDs, preserves edit form after denial and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1299)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1300)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1301)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > submits update UUIDs, preserves edit form after denial and closes after success

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1302)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1303)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1304)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1305)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > shows loading, empty and protected-read errors

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1306)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1307)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1308)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1309)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1310)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1311)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1312)stderr | src/features/user-management/ui/UserFormModal.test.tsx > UserFormModal role selector > blocks create when the authenticated tenant is unavailable

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1313)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1314)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1315)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1316)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1317)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1318)Warning: [antd: Modal] `destroyOnClose` is deprecated. Please use `destroyOnHidden` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1319)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1320)✓ src/features/user-management/ui/UserFormModal.test.tsx (7 tests) 3923ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1321)✓ preloads edit values and shows localized labels, never UUID 841ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1322)✓ keeps UUID values in create payload and guards double submit 817ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1323)✓ keeps multiple UUIDs and localized selected tags 726ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1324)✓ preserves create form after failure and closes after success 515ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1325)✓ submits update UUIDs, preserves edit form after denial and closes after success 330ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1326)✓ shows loading, empty and protected-read errors 440ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1327)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1328)stderr | src/features/horses/hooks/useHorseCoatColors.test.ts > horse coat short-name API boundary > surfaces HTTP 401 as API error

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1329)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1330)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1331)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1332)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1333)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1334)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1335)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1336)✓ src/features/horses/hooks/useHorseCoatColors.test.ts (10 tests) 252ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1337)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1338)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1339)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1340)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1341)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1342)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1343)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1344)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1345)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1346)stderr | src/features/horses/ui/HorseCoatColors/HorseCoatColorsCreateUpdateModal.test.tsx > HorseCoatColorsCreateUpdateModal > guards create from double submit

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1347)An update to HorseCoatColorsCreateUpdateModal inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1348)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1349)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1350)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1351)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1352)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1353)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1354)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1355)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1356)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1357)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1358)✓ src/features/notifications/ui/NotificationSettingsCard.test.tsx (6 tests) 3657ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1359)✓ renders one switch per channel with distinct accessible labels 1449ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1360)✓ renders the events block as a table with channel columns 455ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1361)✓ shows no delivery warning next to the vk switch 329ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1362)✓ omits a channel column the backend did not return 370ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1363)✓ keeps the email switch untouched when the vk toggle fails 515ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1364)✓ updates only the toggled channel on success 531ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1365)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1366)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1367)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1368)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1369)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1370)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1371)✓ src/features/horses/ui/HorseCoatColors/HorseCoatColorsCreateUpdateModal.test.tsx (10 tests) 4896ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1372)✓ opens create, closes and submits an empty short name 1450ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1373)✓ prefills and submits an update short name 412ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1374)✓ supports 63 chars and renders a backend field error 1154ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1375)✓ guards create from double submit 431ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1376)✓ retains entered values after a failed Protected Write 639ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1377)✓ src/features/horses/hooks/useHorseScopes.test.tsx (18 tests) 255ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1378)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1379)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1380)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1381)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1382)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1383)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1384)stderr | src/features/profile/hooks/usePasswordForm.test.ts > changePassword — API boundary > returns error on 401

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1385)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1386)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1387)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1388)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1389)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1390)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1391)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1392)✓ src/features/profile/hooks/usePasswordForm.test.ts (8 tests) 114ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1393)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1394)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1395)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1396)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1397)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1398)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1399)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1400)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1401)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1402)✓ src/features/horses/ui/HorseServices/HorseServicesCreateUpdateModal.test.tsx (15 tests) 4674ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1403)✓ shows create button for DEVELOPER 866ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1404)✓ shows delete button for DEVELOPER 353ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1405)✓ submits create form data 631ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1406)✓ submits update form data 785ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1407)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1408)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1409)stderr | src/features/callbackRequests/ui/CallbackRequestsPage.test.tsx > CallbackRequestsPage flow > switches tabs and opens full detail without losing the table

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1410)Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1411)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1412)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1413)stderr | src/features/callbackRequests/ui/CallbackRequestsPage.test.tsx > CallbackRequestsPage flow > shows explicit backend denial while preserving data

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1414)Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1415)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1416)stderr | src/features/profile/hooks/useProfileForm.test.ts > useProfileForm — API boundary > getMyProfile returns error on 401

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1417)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1418)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1419)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1420)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1421)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1422)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1423)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1424)✓ src/features/horses/ui/HorseCoatColors/HorseCoatColorsTable.test.tsx (3 tests) 675ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1425)✓ renders data, loading/empty states and row action 430ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1426)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1427)✓ src/features/profile/hooks/useProfileForm.test.ts (7 tests) 339ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1428)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1429)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1430)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1431)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1432)stderr | src/features/callbackRequests/ui/CallbackRequestsPage.test.tsx > CallbackRequestsPage flow > hides pagination on instructions and restores exactly one control on requests

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1433)Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1434)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1435)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1436)✓ src/features/callbackRequests/ui/CallbackRequestsPage.test.tsx (8 tests) 4773ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1437)✓ guards forbidden roles 305ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1438)✓ switches tabs and opens full detail without losing the table 1324ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1439)✓ shows explicit backend denial while preserving data 446ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1440)✓ renders the danger reset immediately after pagination and resets all filters 735ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1441)✓ maps a page change to the existing limit and the corresponding offset 375ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1442)✓ resets offset exactly once when page size changes 635ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1443)✓ hides pagination on instructions and restores exactly one control on requests 663ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1444)✓ src/features/siteSettings/ui/SiteSettingsTable.test.tsx (5 tests) 622ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1445)✓ renders data columns without a description column or filter 319ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1446)✓ src/ui/MainTable.test.tsx (5 tests) 352ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1447)✓ src/features/horses/ui/HorsesDeveloperDocumentationView.test.tsx (5 tests) 996ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1448)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1449)Not implemented: navigation to another Document

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1450)✓ src/ui/filters/filters.test.tsx (6 tests) 507ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1451)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1452)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1453)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1454)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1455)stderr | src/features/callbackRequests/ui/CallbackRequestsTable.test.tsx > CallbackRequestsTable > activates the real AntD trigger after apply and clears it after reset

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1456)An update to CSSMotion inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1457)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1458)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1459)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1460)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1461)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1462)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1463)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1464)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1465)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1466)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1467)stderr | src/features/siteSettings/ui/SiteSettingsCreateUpdateModal.test.tsx > SiteSettingsCreateUpdateModal > does not render a description field for create or update

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1468)`NaN` is an invalid value for the `height` css style property.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1469)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1470)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1471)✓ src/features/callbackRequests/ui/CallbackRequestsTable.test.tsx (4 tests) 2343ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1472)✓ renders data, tel link and isolates link click from row modal 1008ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1473)✓ hides mutation menus without scope and disables them while pending 316ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1474)✓ activates the real AntD trigger after apply and clears it after reset 801ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1475)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1476)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1477)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1478)✓ src/features/siteSettings/ui/SiteSettingsCreateUpdateModal.test.tsx (5 tests) 2473ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1479)✓ does not render a description field for create or update 1030ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1480)✓ submits a create payload without description 406ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1481)✓ submits an update payload without description for the selected setting 311ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1482)✓ exposes guarded delete and close for a selected setting 543ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1483)✓ src/features/notifications/services/notificationService.test.ts (10 tests) 102ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1484)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1485)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1486)✓ src/features/horses/ui/Horses/HorsePedigreePickerModal.test.tsx (2 tests) 1539ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1487)✓ renders search, count, empty state and disabled save without selected candidate 811ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1488)✓ selects a candidate by row click and keeps single result unselected before click 722ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1489)✓ src/app/(protected)/users/users.page.test.tsx (5 tests) 1269ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1490)✓ renders tabs, controls, gap and table in semantic order 594ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1491)✓ switches both documentation views and removes list mutation UI 424ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1492)stderr | src/app/(protected)/layout.test.tsx > BaseLayout sidebar — profile section > renders profile avatar with first letter of username (C for cms-admin)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1493)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1494)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1495)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1496)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1497)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1498)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1499)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1500)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1501)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1502)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1503)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1504)stderr | src/app/(protected)/layout.test.tsx > BaseLayout sidebar — profile section > shows callback requests as the last navigation item to ADMIN

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1505)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1506)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1507)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1508)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1509)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1510)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1511)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1512)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1513)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1514)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1515)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1516)stderr | src/app/(protected)/layout.test.tsx > BaseLayout sidebar — profile section > shows callback requests as the last navigation item to SUPERUSER

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1517)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1518)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1519)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1520)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1521)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1522)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1523)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1524)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1525)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1526)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1527)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1528)stderr | src/app/(protected)/layout.test.tsx > BaseLayout sidebar — profile section > hides callback requests from forbidden DEVELOPER

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1529)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1530)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1531)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1532)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1533)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1534)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1535)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1536)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1537)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1538)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1539)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1540)stderr | src/app/(protected)/layout.test.tsx > BaseLayout sidebar — profile section > hides callback requests from forbidden USER_MANAGER

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1541)An update to ForwardRef inside a test was not wrapped in act(...).

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1542)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1543)When testing, code that causes React state updates should be wrapped into act(...):

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1544)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1545)act(() => {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1546)/* fire events that update state */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1547)});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1548)/* assert on the output */

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1549)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1550)This ensures that you're testing the behavior the user would see in the browser. Learn more at [https://react.dev/link/wrap-tests-with-act](https://react.dev/link/wrap-tests-with-act)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1551)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1552)✓ src/app/(protected)/layout.test.tsx (12 tests) 2656ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1553)✓ renders profile avatar with first letter of username (C for cms-admin) 329ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1554)✓ shows notifications navigation to authenticated ADMIN 386ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1555)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1556)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1557)✓ src/features/horses/ui/HorsesHeader.test.tsx (6 tests) 1742ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1558)✓ disables type filter when breed filter is active 594ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1559)✓ shows dictionary create for allowed scope on breeds 416ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1560)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1561)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1562)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1563)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1564)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1565)✓ src/features/prices/ui/Price/PricesTable.test.tsx (7 tests) 1949ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1566)✓ renders price name 830ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1567)✓ src/features/scopes.test.tsx (6 tests) 275ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1568)✓ src/features/callbackRequests/hooks/useCallbackRequests.mutations.test.ts (5 tests) 54ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1569)✓ src/features/profile/ui/ProfileHeader.test.tsx (3 tests) 567ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1570)✓ renders full data — ФИО, equestrian_name, username, date, scopes 441ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1571)✓ src/features/horses/ui/HorsesTabs.test.tsx (6 tests) 1255ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1572)✓ renders Лошади as the first tab 592ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1573)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1574)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1575)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1576)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1577)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1578)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1579)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1580)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1581)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1582)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1583)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1584)✓ src/features/horses/ui/HorseServiceRelations/HorseServiceRelationsDrawer.test.tsx (7 tests) 1614ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1585)✓ renders drawer title with horse name 507ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1586)✓ src/features/siteSettings/validators/siteSettings.test.ts (6 tests) 18ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1587)✓ src/features/prices/hooks/usePricesPageActions.test.ts (4 tests) 44ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1588)✓ src/features/horses/ui/Horses/HorsePedigreeCard.test.tsx (5 tests) 501ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1589)✓ renders sex, coat, breed and placeholder without breaking card structure 362ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1590)✓ src/contexts/UserContext.test.tsx (2 tests) 121ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1591)✓ src/features/profile/ui/PersonalDataForm.test.tsx (6 tests) 1149ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1592)✓ renders current form data 471ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1593)✓ src/features/horses/ui/HorsesUserDocumentationView.test.tsx (3 tests) 641ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1594)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1595)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1596)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1597)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1598)✓ src/features/horses/ui/HorseBreedGroups/HorseBreedGroupsCreateUpdateModal.test.tsx (4 tests) 1392ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1599)✓ opens, closes and submits create once during double click 803ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1600)✓ updates and exposes guarded delete for selected group 322ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1601)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1602)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1603)stderr | src/features/horses/ui/HorseBreedGroups/HorseBreedGroupsTable.test.tsx > HorseBreedGroupsTable > renders loading, empty and error states

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1604)Warning: [antd: Alert] `message` is deprecated. Please use `title` instead.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1605)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1606)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1607)Not implemented: Window's getComputedStyle() method: with pseudo-elements

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1608)✓ src/features/profile/ui/ChangePasswordForm.test.tsx (5 tests) 1235ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1609)✓ renders empty form with all three fields 514ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1610)✓ clicking Clear calls clear callback 330ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1611)✓ src/features/horses/ui/HorseBreedGroups/HorseBreedGroupsTable.test.tsx (4 tests) 1819ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1612)✓ renders group data and page action 685ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1613)✓ guards Page Editor by scope and has no photo controls 684ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1614)stderr | src/api/callbackRequests.test.ts > callback requests API boundary > surfaces 401 errors

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1615)[MSW] Error: intercepted a request without a matching request handler:

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1616)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1617)• POST [http://127.0.0.1/api/auth/refresh](http://127.0.0.1/api/auth/refresh)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1618)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1619)If you still wish to intercept this unhandled request, please create a request handler for it.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1620)Read more: [https://mswjs.io/docs/http/intercepting-requests](https://mswjs.io/docs/http/intercepting-requests)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1621)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1622)✓ src/api/callbackRequests.test.ts (6 tests) 89ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1623)✓ src/features/pageEditor/hooks/usePageEditor.breedGroups.test.ts (7 tests) 455ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1624)✓ src/features/profile/services/profileService.test.ts (3 tests) 52ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1625)✓ src/ui/TablePaginator.test.tsx (3 tests) 256ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1626)✓ src/app/(protected)/profile/profile.page.test.tsx (1 test) 896ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1627)✓ authenticated render — shows profile data after MSW mock 887ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1628)✓ src/lib/sentryConfig.test.ts (4 tests) 10ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1629)✓ src/app/(protected)/horses/horses.page.test.tsx (1 test) 43ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1630)✓ src/lib/typecheckOrchestration.test.ts (3 tests) 23ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1631)✓ src/api/userManagement.test.ts (2 tests) 52ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1632)✓ src/features/callbackRequests/hooks/useCallbackRequests.test.ts (5 tests) 13ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1633)✓ sentry.runtime.test.ts (6 tests) 32ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1634)✓ src/features/user-management/ui/UsersHeader.test.tsx (2 tests) 795ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1635)✓ renders tabs before controls and keeps pagination in the right-hand group 499ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1636)✓ src/features/callbackRequests/ui/CallbackRequestFilters.test.tsx (2 tests) 452ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1637)✓ uses user-facing labels without regex and preserves debounce semantics 397ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1638)✓ src/features/user-management/hooks/useUserManagementScopes.test.ts (3 tests) 43ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1639)✓ src/lib/apiStatus.test.ts (3 tests) 12ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1640)stderr | src/app/global-error.test.tsx > GlobalError > captures one event, renders a fallback and retries

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1641)In HTML, <html> cannot be a child of <div>.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1642)This will cause a hydration error.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1643)✓ src/app/global-error.test.tsx (1 test) 299ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1644)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1645)✓ src/features/user-management/ui/UserActionsCell.test.tsx (2 tests) 575ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1646)✓ guards destructive self actions 521ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1647)✓ src/features/callbackRequests/hooks/useCallbackRequestAccess.test.ts (4 tests) 13ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1648)✓ src/features/filters-reset.test.ts (2 tests) 19ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1649)✓ src/instrumentation.test.ts (1 test) 14ms

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1650)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1651)⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1652)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1653)FAIL src/features/notifications/ui/VkCard.test.tsx > VkCard: действия > issues a code, shows the full command and copies it

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1654)Error: Test timed out in 5000ms.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1655)If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1656)❯ src/features/notifications/ui/VkCard.test.tsx:237:3

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1657)235| beforeEach(() => vi.clearAllMocks());

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1658)236|

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1659)237| it("issues a code, shows the full command and copies it", async () =…

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1660)| ^

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1661)238| const writeText = vi.fn(async () => {});

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1662)239| Object.defineProperty(navigator, "clipboard", {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1663)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1664)⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1665)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1666)FAIL src/features/notifications/ui/VkCard.test.tsx > VkCard: действия > reports a clipboard failure without breaking the card

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1667)Error: Test timed out in 5000ms.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1668)If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1669)❯ src/features/notifications/ui/VkCard.test.tsx:288:3

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1670)286| });

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1671)287|

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1672)288| it("reports a clipboard failure without breaking the card", async ()…

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1673)| ^

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1674)289| Object.defineProperty(navigator, "clipboard", {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1675)290| value: {

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1676)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1677)⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1678)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1679)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1680)Test Files 1 failed | 72 passed (73)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1681)Tests 2 failed | 627 passed (629)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1682)Start at 07:42:50

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1683)Duration 124.55s (transform 3.85s, setup 23.41s, import 98.66s, tests 155.04s, environment 80.13s)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1684)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1685)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1686)Error: Error: Test timed out in 5000ms.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1687)If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1688)❯ src/features/notifications/ui/VkCard.test.tsx:237:3

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1689)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1690)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1691)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1692)Error: Error: Test timed out in 5000ms.

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1693)If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1694)❯ src/features/notifications/ui/VkCard.test.tsx:288:3

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1695)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1696)

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1697)make: *** [Makefile:19: test] Error 1

[](https://github.com/igor-526/EqSiteCMS-frontend/actions/runs/37588831373/job/112685175544#step:5:1698)Error: Process completed with exit code 2.
```
## Задача
Необходимо исправить эти баги и не допустить их появления вновь