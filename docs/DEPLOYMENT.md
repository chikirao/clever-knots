# Подключение и публикация

Сайт публикуется на https://cleverknots.ru через GitHub Actions (pages.yml) при каждом push в main и после импорта из VK. Выключатель — repository variable ENABLE_PAGES_DEPLOY (true/отсутствует).

Настроено: Pages → GitHub Actions, custom domain cleverknots.ru, public/CNAME, SITE_URL по умолчанию https://cleverknots.ru, BASE_PATH /.

DNS у регистратора (или в Cloudflare, если NS перенесены туда):
- `@` A → 185.199.108.153, 185.199.109.153, 185.199.110.153, 185.199.111.153
- `www` CNAME → chikirao.github.io

После того как DNS разойдётся, в Settings → Pages включить Enforce HTTPS.

Pages CMS: подключить репозиторий в https://app.pagescms.org с GitHub App доступом только к этому репозиторию, пригласить маму как collaborator.

CMS меняет JSON и media-файлы. Push в main после включения публикации запускает пересборку. Draft published=false не включается в каталог, главную и маршруты. Порядок задаётся order, не сортировкой интерфейса CMS.

Перед запуском проверить пригодность GitHub Pages по актуальным условиям: GitHub ограничивает сайты, преимущественно предназначенные для коммерческих транзакций. Этот проект представляет портфолио с внешней ссылкой для общения, без оплаты и формы заказа; это само по себе не подтверждает соответствие условиям. Источник: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits.
