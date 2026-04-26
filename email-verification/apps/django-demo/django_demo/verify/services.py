import os
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional, Tuple

from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone as dj_timezone

from joserfc.jwk import OKPKey

from kusala_email_verification.token import SigningConfig, sign_email_verification_jwt, verify_email_verification_jwt

from .models import EmailVerificationToken


@dataclass(frozen=True)
class DemoKeyMaterial:
    kid: str
    secret: OKPKey
    public: OKPKey


def _demo_keys() -> DemoKeyMaterial:
    # Demo-only: ephemeral keys. In real usage, load stable key material from env/secret store.
    sk = OKPKey.generate_key("Ed25519")
    pk = OKPKey.import_key(sk.as_dict(private=False))
    return DemoKeyMaterial(kid="demo-k1", secret=sk, public=pk)


def _issuer() -> str:
    return os.environ.get("ISSUER", "kusala-studio")


def _base_url() -> str:
    return os.environ.get("BASE_URL", "http://localhost:8000")


def _from_email() -> str:
    return os.environ.get("FROM_EMAIL", "no-reply@kusala.local")


def start_email_verification(*, user_id: str, email: str, ttl_seconds: int = 60 * 30, keys: Optional[DemoKeyMaterial] = None) -> Dict[str, Any]:
    keys = keys or _demo_keys()

    token, claims = sign_email_verification_jwt(
        private_key=keys.secret,
        kid=keys.kid,
        user_id=user_id,
        email=email,
        config=SigningConfig(issuer=_issuer(), ttl_seconds=ttl_seconds),
    )

    expires_at = datetime.fromtimestamp(int(claims["exp"]), tz=timezone.utc)

    EmailVerificationToken.objects.get_or_create(
        jti=claims["jti"],
        defaults={
            "user_id": claims["sub"],
            "email": claims["email"],
            "expires_at": expires_at,
        },
    )

    link = f"{_base_url()}/confirm?token={token}"

    send_mail(
        subject="Verify your email",
        message=f"Click to verify: {link}",
        from_email=_from_email(),
        recipient_list=[claims["email"]],
        fail_silently=False,
    )

    return {"token": token, "claims": claims, "link": link}


def confirm_email_verification(*, token: str, keys: Optional[DemoKeyMaterial] = None) -> Tuple[bool, Dict[str, Any]]:
    keys = keys or _demo_keys()

    claims = verify_email_verification_jwt(
        token=token,
        public_key=keys.public,
        expected_issuer=_issuer(),
    )

    now = dj_timezone.now()

    with transaction.atomic():
        # Lock row to avoid double-consume
        try:
            rec = EmailVerificationToken.objects.select_for_update().get(jti=claims["jti"])
        except EmailVerificationToken.DoesNotExist:
            return False, {"ok": False, "reason": "not_found"}

        if rec.used_at is not None:
            return False, {"ok": False, "reason": "already_used"}

        if rec.expires_at <= now:
            return False, {"ok": False, "reason": "expired"}

        rec.used_at = now
        rec.save(update_fields=["used_at"])

    return True, {"ok": True, "verified": True, "userId": claims["sub"], "email": claims["email"]}

