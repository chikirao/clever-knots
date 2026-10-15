# Проект: «Макраме Клевер»

Сайт-портфолио мамы (макраме, плетение, вязание) — подарок на день рождения. Публикуется на https://cleverknots.ru (GitHub Pages, `.github/workflows/pages.yml`, на каждый push в main). Общение с владельцем — по-русски, простыми словами.

- Стек: Astro + React-острова, GSAP, Tailwind. Контент — `src/content/works/*.json` (схема в `src/lib/content.ts`), админка Pages CMS (`.pages.yml`).
- Дизайн утверждён: `DESIGN.md`. Не менять стиль без просьбы. Без положительного letter-spacing.
- 3D-канат (WebGL): `src/motion/rope-3d.ts`, `rope.ts`, описание в `docs/ROPE.md`. Канат не должен заходить на текст на ширинах 360–1920.
- Импорт товаров из VK: `scripts/vk-import.mjs`, `docs/VK-ИМПОРТ.md`. Ключ VK только в секрете GitHub `VK_TOKEN`, никогда в код или чат. Фото «Фото скоро» — временные заглушки.
- Деплой и домен: `docs/DEPLOYMENT.md`.
- Перед коммитом: `npm run check` и `npm run build` без ошибок. Мелкие понятные коммиты.

## Development

When starting the dev server, use background mode:

```
astro dev --background
```

Manage the background server with `astro dev stop`, `astro dev status`, and `astro dev logs`.

## Documentation

Full documentation: https://docs.astro.build

Consult these guides before working on related tasks:

- [Adding pages, dynamic routes, or middleware](https://docs.astro.build/en/guides/routing/)
- [Working with Astro components](https://docs.astro.build/en/basics/astro-components/)
- [Using React, Vue, Svelte, or other framework components](https://docs.astro.build/en/guides/framework-components/)
- [Adding or managing content](https://docs.astro.build/en/guides/content-collections/)
- [Adding styles or using Tailwind](https://docs.astro.build/en/guides/styling/)
- [Supporting multiple languages](https://docs.astro.build/en/guides/internationalization/)
