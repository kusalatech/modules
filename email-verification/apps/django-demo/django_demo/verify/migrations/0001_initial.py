from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="EmailVerificationToken",
            fields=[
                ("jti", models.TextField(primary_key=True, serialize=False)),
                ("user_id", models.TextField()),
                ("email", models.TextField()),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
                ("used_at", models.DateTimeField(blank=True, null=True)),
            ],
            options={
                "db_table": "email_verification_tokens",
                "indexes": [
                    models.Index(fields=["user_id"], name="email_verif_user_id_idx"),
                    models.Index(fields=["email"], name="email_verif_email_idx"),
                    models.Index(fields=["expires_at"], name="email_verif_expires_at_idx"),
                ],
            },
        ),
    ]

