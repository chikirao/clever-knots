# Clever Knots

Статическое портфолио мастерской. Утверждённый вариант A: светлая бумага, хвойная типографика, знакомый знак из коричневой нити. Astro 7 + TypeScript; изображения оптимизируются при сборке, backend не требуется.

## Локальный запуск

Node 24, npm:

```sh
npm ci
npm run dev -- --background --host 127.0.0.1 --port 4321
```

Управление background server: `npx astro dev status`, `npx astro dev stop`, `npx astro dev logs`. Для проверки собранного сайта: `npm run build`, затем `npm run preview -- --host 127.0.0.1 --port 4321`.

В ограниченной среде можно задать `ASTRO_TELEMETRY_DISABLED=1` перед запуском, чтобы Astro не создавал системную telemetry config.

## Проверки

```sh
npm run check
npm run build
npm run test:browser
```

Браузерный тест запускается против уже работающего production preview. На Windows использует установленный Edge, на Linux Chromium (`npx playwright install chromium`). `QA_URL` позволяет изменить адрес. Скриншоты/отчёт сохраняются в `.qa/`, не попадают в Git.

## Контент

- `src/content/site.json`: редактируемые тексты.
- `src/content/works/*.json`: по файлу на работу, slug совпадает с именем файла.
- `src/assets/uploads`: настоящие фотографии. CMS указывает путь `/src/assets/uploads/...`, во время сборки он разрешается в Astro ImageMetadata.
- `published:false`: работа исключается из всех подборок, sitemap и статических маршрутов.
- `order`: порядок показа. Первая featured работа становится избранной на главной.
- Категории в фильтре вычисляются из опубликованных работ.

Редактор: `.pages.yml`. [Инструкция для мамы](docs/ДЛЯ-МАМЫ.md). Подключение hosted CMS не выполнено: нужны push исходников и GitHub App installation, затем приглашение редактора. Возможности сохранения в живом аккаунте пока не проверены.

Файлы с телефона предварительно уменьшать. Build преобразует варианты для сайта, но не сокращает Git history оригиналов. `npm run optimize:media` уменьшает файлы с сохранением имён. Крупные оригиналы хранить вне репозитория.

## Дизайн и motion

Hero использует растровый знак. Объёмные спиральные пряди, текстура волокон, GLSL-материал, маска перехода и статичный Canvas2D fallback описаны в [ROPE.md](docs/ROPE.md). Положение кривой задаётся control points в `src/motion/rope.ts`; renderer и пружина в `rope-3d.ts`. Нить можно захватить мышью или касанием и оттянуть; после отпускания она возвращается. Кадры синхронизируются GSAP ticker и не рисуются без изменений.

Настоящий Fluid Functionalism Tabs, загруженный из официального registry, работает в React island каталога. Его internal Motion анимации не пересекаются с GSAP. [Provenance и SHA-256 исходников](docs/fluid-provenance.json). Локальная адаптация: CSS-токены и минимальная высота touch controls 44px; core Tabs не заменён самописным.

ClientRouter обеспечивает навигацию и shared-image переход каталога/работы. Галерея: нативный dialog, листание кнопками/стрелками/swipe, увеличение кликом либо клавиатурной кнопкой. Escape закрывает, focus возвращается. Reduced motion отключает перемещение и использует статичную нить.

Предоставленных материалов достаточно для одной реальной работы с четырьмя ракурсами. Ассортимент, биография, цены, портрет и availability не выдуманы. Генеративные изображения используются только для декоративного знака. Onest и Literata размещены локально, лицензии в `public/fonts`.

## Публикация

Ничего не опубликовано и не отправлено в удалённый GitHub. Workflow проверки можно запускать сразу; deployment выключен до установки repository variable `ENABLE_PAGES_DEPLOY=true` после отдельного согласования. `SITE_URL` и `BASE_PATH` задают корень и корректные paths. Для GitHub project Pages: `/clever-knots/`; для custom domain: `/`.

[Инструкция по публикации, CMS и будущему домену](docs/DEPLOYMENT.md). Domain/DNS не изменялись.
