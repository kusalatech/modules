import time
from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple

from joserfc import jws
from joserfc.jwk import OKPKey


def normalize_email(email: str) -> str:
    return email.strip().lower()


def now_seconds(now: Optional[float] = None) -> int:
    return int(now if now is not None else time.time())


@dataclass(frozen=True)
class SigningConfig:
    issuer: str
    ttl_seconds: int
    audience: str = "email-verify"
    typ: str = "KUSALA-EMAIL-VERIFY+JWT"
    clock_skew_seconds: int = 60


def sign_email_verification_jwt(*, private_key: OKPKey, kid: str, user_id: str, email: str, config: SigningConfig, nonce: Optional[str] = None, now: Optional[int] = None) -> Tuple[str, Dict[str, Any]]:
    iat = now if now is not None else now_seconds()
    exp = iat + int(config.ttl_seconds)

    payload: Dict[str, Any] = {
        "iss": config.issuer,
        "aud": config.audience,
        "sub": str(user_id),
        "email": normalize_email(email),
        "jti": _jti(),
        "iat": iat,
        "exp": exp,
        "purpose": "email_verification",
    }
    if nonce:
        payload["nonce"] = str(nonce)

    protected = {"alg": "Ed25519", "typ": config.typ, "kid": kid}

    token = jws.serialize_compact(protected, _json_bytes(payload), private_key, algorithms=["Ed25519"])
    return token, payload


def verify_email_verification_jwt(*, token: str, public_key: OKPKey, expected_issuer: str, expected_audience: str = "email-verify", expected_typ: str = "KUSALA-EMAIL-VERIFY+JWT") -> Dict[str, Any]:
    # joserfc verifies signature + header alg allowlist; we also enforce typ/aud/purpose below.
    obj = jws.deserialize_compact(token, public_key, algorithms=["Ed25519"])
    protected = obj.protected

    if protected.get("typ") != expected_typ:
        raise ValueError("Invalid typ")
    if not protected.get("kid"):
        raise ValueError("Missing kid")

    payload = _json_loads(obj.payload)

    if payload.get("iss") != expected_issuer:
        raise ValueError("Invalid issuer")
    if payload.get("aud") != expected_audience:
        raise ValueError("Invalid audience")
    if payload.get("purpose") != "email_verification":
        raise ValueError("Invalid purpose")

    # exp check (NumericDate seconds)
    exp = int(payload.get("exp"))
    if exp <= now_seconds():
        raise ValueError("Token expired")

    return payload


def _jti() -> str:
    # Simple, URL-safe-ish unique id; can be replaced with uuid7 etc.
    return OKPKey.generate_key("Ed25519").thumbprint()


def _json_bytes(obj: Dict[str, Any]) -> bytes:
    import json

    return json.dumps(obj, separators=(",", ":"), sort_keys=True).encode("utf-8")


def _json_loads(data: bytes) -> Dict[str, Any]:
    import json

    return json.loads(data.decode("utf-8"))

