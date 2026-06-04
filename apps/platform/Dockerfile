FROM composer:2

WORKDIR /app

RUN docker-php-ext-install pdo_mysql

COPY composer.json composer.lock ./
RUN composer install --no-dev --prefer-dist --no-interaction --no-scripts

COPY . .
RUN composer dump-autoload --optimize

EXPOSE 8080

CMD ["sh", "-c", "php artisan migrate --force --seed && php artisan serve --host=0.0.0.0 --port=${PORT:-8080}"]
