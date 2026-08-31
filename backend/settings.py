import os
from pathlib import Path
from datetime import timedelta
import pymysql
from corsheaders.defaults import default_headers

# ---------------
# Paths base
# ---------------
BASE_DIR = Path(__file__).resolve().parent.parent

# ------------
# Seguridad
# ------------
SECRET_KEY = os.environ.get("SECRET_KEY", "django-insecure-dev-key")
DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "192.168.1.27", "*"]

# ----------
# Entorno
# ----------
ENVIRONMENT = os.environ.get("DJANGO_ENV", "local")
IS_LOCAL = True

# ---------------
# Apps instaladas
# ---------------
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'users',
    'core',
    'cotizaciones_api',
    'compras_api',
    'logistica_api',
    'dashboard_api',
    'notificaciones_api',
    'caja_chica_api',
    'buzon_api',
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'django.contrib.humanize',
]

# ---------------
# Middleware
# ---------------
MIDDLEWARE = [
    'backend.middleware.DisableXFrameOptionsMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    # 'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'backend.urls'
WSGI_APPLICATION = 'backend.wsgi.application'

# ------------
# Templates
# ------------
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / "frontend" / "dist"], # Más limpio
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

# =====================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =====================================================
import pymysql
import datetime
from pymysql.constants import FIELD_TYPE
from pymysql.converters import conversions

def safe_mysql_datetime(value):
    """
    Solución definitiva al error 'str' object has no attribute 'utcoffset'.
    Maneja fechas 'zero' (0000-00-00) y formatos inconsistentes de MySQL.
    """
    if not value or value in (b'0000-00-00 00:00:00', b'0000-00-00', '0000-00-00 00:00:00', '0000-00-00'):
        return None
    
    try:
        # Intento de conversión estándar de pymysql
        return pymysql.converters.convert_datetime(value)
    except Exception:
        # Si falla (ej: formato '2025-06.12'), intentamos limpieza manual
        try:
            if isinstance(value, bytes):
                value = value.decode('utf-8')
            
            # Limpieza básica: cambiar puntos por guiones
            clean_value = value.replace('.', '-').replace('/', '-')
            
            # Intentar parsear solo la parte de la fecha (primeros 10 caracteres)
            return datetime.datetime.strptime(clean_value[:10], '%Y-%m-%d')
        except:
            return None

# Mapeamos los tipos de fecha de MySQL a nuestro conversor seguro
dict_conv = conversions.copy()
dict_conv[FIELD_TYPE.DATETIME] = safe_mysql_datetime
dict_conv[FIELD_TYPE.TIMESTAMP] = safe_mysql_datetime

pymysql.install_as_MySQLdb()

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "proyecto_sigecom",
        "USER": "admin",
        "PASSWORD": "270509",
        "HOST": "127.0.0.1",
        "PORT": "3306",
        "TIME_ZONE": "America/Lima",
        "OPTIONS": {
            "charset": "utf8mb4",
            "conv": dict_conv,
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    },
    "legacy": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "backup_30_08_2026",
        "USER": "admin",
        "PASSWORD": "270509",
        "HOST": "127.0.0.1",
        "PORT": "3306",
        "TIME_ZONE": "America/Lima",
        "OPTIONS": {
            "charset": "utf8mb4",
            "conv": dict_conv,
            "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
        },
    }
}

# Router para asegurar que los modelos usen solo db_vc
DATABASE_ROUTERS = ["backend.db_router.VCRouter"]

#MIGRATION_MODULES = {
#    'cotizaciones_api': None,
#    'logistica_api': None,
#}

# ---------------------------
# Usuario personalizado
# ---------------------------
AUTH_USER_MODEL = "users.Usuario"

# ---------------------------
# Django REST Framework
# ---------------------------
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'backend.authentication.CustomJWTAuthentication',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
}

# ---------------------------
# JWT
# ---------------------------
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=180),
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'BLACKLIST_AFTER_ROTATION': True,
    'USER_ID_FIELD': 'usuario',
}

# ---------
# Caché
# ---------
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,
    }
}

# ------------
# Passwords
# ------------
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',},
]

# -----------------------
# Internacionalización
# -----------------------
LANGUAGE_CODE = 'es-pe'  # Para que los mensajes y formatos sean en español de Perú
TIME_ZONE = 'America/Lima' # Define la zona horaria base como Lima
USE_I18N = True
USE_TZ = True # Lo mantenemos en True para la futura expansión

# -----------------------------
# Archivos estáticos / Media
# -----------------------------
STATIC_URL = '/static/'
STATICFILES_DIRS = [
    BASE_DIR / "frontend" / "dist",
    BASE_DIR / "frontend" / "src" / "assets",
]
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_ROOT = BASE_DIR / 'media'
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

MEDIA_URL = '/media/'
os.makedirs(MEDIA_ROOT, exist_ok=True)

# -------------------
# Límites de subida
# -------------------
DATA_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 50 * 1024 * 1024

# ---------------
# CORS y CSRF
# ---------------
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOW_HEADERS = list(default_headers) + ["content-type", "authorization"]
CORS_ALLOW_METHODS = ["GET","POST","PUT","PATCH","DELETE","OPTIONS"]
CORS_ALLOW_ALL_ORIGINS = True

CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://192.168.1.27:5173",
]
CSRF_COOKIE_SECURE = False
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_SAMESITE = "Lax"

# =====================================================
# OCR / PDF extras
# =====================================================
TESSDATA_PREFIX = os.environ.get("TESSDATA_PREFIX", "/usr/share/tesseract-ocr/5/tessdata")
POPPLER_PATH = os.environ.get("POPPLER_PATH", "/usr/bin")

# =====================================================
# Logs
# =====================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {'console': {'class': 'logging.StreamHandler'}},
    'root': {'handlers': ['console'], 'level': 'INFO'},
}

# =====================================================
# CONFIGURACIÓN DE CORREO (SMTP)
# =====================================================
EMAIL_BACKEND = os.environ.get('DJANGO_EMAIL_BACKEND', 'django.core.mail.backends.smtp.EmailBackend')
EMAIL_HOST = os.environ.get('DJANGO_EMAIL_HOST', 'mail.vc-corporation.com')
EMAIL_PORT = int(os.environ.get('DJANGO_EMAIL_PORT', 465))
EMAIL_USE_SSL = os.environ.get('DJANGO_EMAIL_USE_SSL', 'True') == 'True'
EMAIL_USE_TLS = os.environ.get('DJANGO_EMAIL_USE_TLS', 'False') == 'True'
EMAIL_HOST_USER = os.environ.get('DJANGO_EMAIL_HOST_USER', 'reportes.comercial@vc-corporation.com')
EMAIL_HOST_PASSWORD = os.environ.get('DJANGO_EMAIL_HOST_PASSWORD', 'reportes.comercial1108')
DEFAULT_FROM_EMAIL = EMAIL_HOST_USER

# URL del Frontend para enlaces en correos electrónicos
FRONTEND_URL = os.environ.get('FRONTEND_URL', 'http://localhost:5173')
# Force dev server reload


