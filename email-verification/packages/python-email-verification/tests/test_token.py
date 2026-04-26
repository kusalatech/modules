import pytest

from joserfc.jwk import OKPKey

from kusala_email_verification.token import (
    SigningConfig,
    normalize_email,
    sign_email_verification_jwt,
    verify_email_verification_jwt,
)


def test_normalize_email():
    assert normalize_email(" USER@Example.COM ") == "user@example.com"


def test_sign_verify_round_trip_ed25519():
    sk = OKPKey.generate_key("Ed25519")
    pk = OKPKey.import_key(sk.as_dict(private=False))

    token, claims = sign_email_verification_jwt(
        private_key=sk,
        kid="k1",
        user_id="user-123",
        email="USER@Example.com",
        config=SigningConfig(issuer="kusala-studio", ttl_seconds=60),
    )

    out = verify_email_verification_jwt(
        token=token,
        public_key=pk,
        expected_issuer="kusala-studio",
    )

    assert out["sub"] == "user-123"
    assert out["email"] == "user@example.com"
    assert out["jti"] == claims["jti"]
    assert out["purpose"] == "email_verification"


def test_verify_rejects_wrong_issuer():
    sk = OKPKey.generate_key("Ed25519")
    pk = OKPKey.import_key(sk.as_dict(private=False))

    token, _claims = sign_email_verification_jwt(
        private_key=sk,
        kid="k1",
        user_id="u1",
        email="u1@example.com",
        config=SigningConfig(issuer="issuer-a", ttl_seconds=60),
    )

    with pytest.raises(ValueError):
        verify_email_verification_jwt(token=token, public_key=pk, expected_issuer="issuer-b")

