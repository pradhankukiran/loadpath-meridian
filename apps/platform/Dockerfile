FROM composer:2

WORKDIR /app

RUN docker-php-ext-install pdo_mysql

ENV PORT=8080

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --optimize

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 CMD php -r '$port = getenv("PORT") ?: "8080"; $body = @file_get_contents("http://127.0.0.1:".$port."/api/health"); exit($body === false ? 1 : 0);'

CMD ["sh", "-c", "php artisan migrate --force && if [ \"${PLATFORM_SEED_DEMO_DATA:-false}\" = \"true\" ]; then php artisan db:seed --force; fi && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
