from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    database_url: str = "postgresql://user:pass@localhost:5432/syncup"
    debug: bool = False

    # Clerk
    clerk_issuer: str = ""
    clerk_jwks_url: str | None = None
    clerk_secret_key: str = ""
    clerk_webhook_secret: str = ""

    # Brevo SMTP
    brevo_smtp_host: str = "smtp-relay.brevo.com"
    brevo_smtp_port: int = 587
    brevo_smtp_user: str = ""
    brevo_smtp_password: str = ""
    brevo_from_email: str = "noreply@syncup.app"
    brevo_from_name: str = "SyncUp"

    # App URLs
    frontend_url: str = "http://localhost:5173"
    cors_origins: str = "http://localhost:5173"

    @property
    def jwks_url(self) -> str:
        if self.clerk_jwks_url:
            return self.clerk_jwks_url
        issuer = self.clerk_issuer.rstrip("/")
        return f"{issuer}/.well-known/jwks.json"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
