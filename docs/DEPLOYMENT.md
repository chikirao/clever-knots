# Подключение и публикация

Публичное развёртывание не выполнялось. Workflow pages.yml по умолчанию ничего не публикует: оба условия требуют repository variable ENABLE_PAGES_DEPLOY=true. До согласования оставьте её отсутствующей.

После согласования:
1. Отправить код в https://github.com/chikirao/clever-knots (ветка main).
2. В Settings → Pages выбрать GitHub Actions.
3. Настроить environment github-pages и при необходимости обязательное ручное подтверждение deployment.
4. Для адреса chikirao.github.io/clever-knots установить SITE_URL=https://chikirao.github.io и BASE_PATH=/clever-knots/.
5. Только после проверки включить ENABLE_PAGES_DEPLOY=true и запустить workflow.
6. Подключить репозиторий в https://app.pagescms.org с GitHub App доступом только к этому репозиторию. Пригласить маму как collaborator по email. Проверить сохранение черновика, загрузку фото, публикацию и обратное скрытие на настоящем editor session.

CMS меняет JSON и media-файлы. Push в main после включения публикации запускает пересборку. Draft published=false не включается в каталог, главную и маршруты. Порядок задаётся order, не сортировкой интерфейса CMS.

Будущий .ru домен: отдельно согласовать имя, настроить DNS/HTTPS и GitHub Pages custom domain, изменить SITE_URL на полный URL домена, BASE_PATH на /, добавить public/CNAME. Автоматических покупок и изменений DNS здесь нет.

Перед запуском проверить пригодность GitHub Pages по актуальным условиям: GitHub ограничивает сайты, преимущественно предназначенные для коммерческих транзакций. Этот проект представляет портфолио с внешней ссылкой для общения, без оплаты и формы заказа; это само по себе не подтверждает соответствие условиям. Источник: https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits.
