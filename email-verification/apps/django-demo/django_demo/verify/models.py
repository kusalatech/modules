from django.db import models


class EmailVerificationToken(models.Model):
    jti = models.TextField(primary_key=True)
    user_id = models.TextField()
    email = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    used_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "email_verification_tokens"
        indexes = [
            models.Index(fields=["user_id"]),
            models.Index(fields=["email"]),
            models.Index(fields=["expires_at"]),
        ]

