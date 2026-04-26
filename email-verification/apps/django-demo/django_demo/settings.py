from pathlib import Path
import os

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "dev-only-secret-key")
DEBUG = True
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "django_demo.verify",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
]

ROOT_URLCONF = "django_demo.urls"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": os.environ.get("POSTGRES_DB", "kusala_dev"),
        "USER": os.environ.get("POSTGRES_USER", "kusala"),
        "PASSWORD": os.environ.get("POSTGRES_PASSWORD", "kusala"),
        "HOST": os.environ.get("POSTGRES_HOST", "postgres"),
        "PORT": int(os.environ.get("POSTGRES_PORT", "5432")),
    }
}

USE_TZ = True
TIME_ZONE = "UTC"

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Email (Mailpit in dev)
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
EMAIL_HOST = os.environ.get("SMTP_HOST", "mailpit")
EMAIL_PORT = int(os.environ.get("SMTP_PORT", "1025"))
EMAIL_USE_TLS = False
EMAIL_USE_SSL = False

