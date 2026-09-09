
from pathlib import Path
from datetime import timedelta
from decouple import config


BASE_DIR = Path(__file__).resolve().parent.parent


SECRET_KEY = config('SECRET_KEY')
DEBUG = config('DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = ['localhost', '127.0.0.1', 'testserver', '*']

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'accounts',
    'users',
    'bugs',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware', 
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'bugtracker.urls'


TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'bugtracker.wsgi.application'

import os
from urllib.parse import urlparse

database_url = os.getenv('MYSQL_URL') or os.getenv('DATABASE_URL') or config('MYSQL_URL', default=config('DATABASE_URL', default=''))
if database_url:
    _db_url = urlparse(database_url)
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': _db_url.path.lstrip('/'),
            'USER': _db_url.username or '',
            'PASSWORD': _db_url.password or '',
            'HOST': _db_url.hostname or '127.0.0.1',
            'PORT': _db_url.port or 3306,
        }
    }
else:
    db_name = (os.getenv('MYSQLDATABASE') or os.getenv('MYSQL_DATABASE') or config('MYSQLDATABASE', default=config('MYSQL_DATABASE', default=config('NAME', default='')))).strip()
    db_user = (os.getenv('MYSQLUSER') or os.getenv('MYSQL_USER') or config('MYSQLUSER', default=config('USER', default=''))).strip()
    db_pass = (os.getenv('MYSQLPASSWORD') or os.getenv('MYSQL_PASSWORD') or os.getenv('MYSQL_ROOT_PASSWORD') or config('MYSQLPASSWORD', default=config('MYSQL_ROOT_PASSWORD', default=config('PASSWORD', default='')))).strip()
    db_host = (os.getenv('MYSQLHOST') or os.getenv('MYSQL_HOST') or config('MYSQLHOST', default=config('MYSQL_HOST', default=config('HOST', default='localhost')))).strip()
    db_port = str(os.getenv('MYSQLPORT') or os.getenv('MYSQL_PORT') or config('MYSQLPORT', default=config('PORT', default='3306'))).strip()

    # If running in Railway environment and host is localhost/empty, auto-route to Railway private MySQL network
    is_railway = bool(os.getenv('RAILWAY_ENVIRONMENT') or os.getenv('RAILWAY_SERVICE_ID'))
    if is_railway and (not db_host or db_host in ('localhost', '127.0.0.1')):
        db_host = 'mysql.railway.internal'
    if is_railway and not db_name:
        db_name = 'railway'
    if is_railway and not db_user:
        db_user = 'root'

    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.mysql',
            'NAME': db_name,
            'USER': db_user,
            'PASSWORD': db_pass,
            'HOST': db_host,
            'PORT': int(db_port) if db_port.isdigit() else 3306,
        }
    }


AUTH_USER_MODEL = 'accounts.AdminUser'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]


PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.PBKDF2SHA1PasswordHasher',
    'django.contrib.auth.hashers.MD5PasswordHasher',
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'


REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
}


SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'AUTH_HEADER_TYPES': ('Bearer',),
}

CORS_ALLOW_ALL_ORIGINS = True
CORS_ALLOW_CREDENTIALS = True


EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='BugTracker Admin <no-reply@company.com>')


COMPANY_DOMAIN = config('COMPANY_DOMAIN', default='company.com')
ADMIN_EMAIL = config('ADMIN_EMAIL', default='admin@company.com')
ADMIN_PASSWORD = config('ADMIN_PASSWORD', default='admin123')

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

