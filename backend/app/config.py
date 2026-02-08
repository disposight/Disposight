from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    # App
    app_name: str = "DispoSight"
    debug: bool = False
    api_prefix: str = "/api/v1"

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""

    # Database
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/disposight"

    # Redis
    redis_url: str = "redis://localhost:6379"

    # Claude API
    anthropic_api_key: str = ""

    # OpenAI (fallback)
    openai_api_key: str = ""

    # Resend
    resend_api_key: str = ""
    from_email: str = "alerts@disposight.com"

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_starter_price_id: str = ""
    stripe_pro_price_id: str = ""
    stripe_enterprise_price_id: str = ""

    # Frontend
    frontend_url: str = "http://localhost:3000"

    # SEC EDGAR
    sec_user_agent: str = "DispoSight contact@disposight.com"

    # CourtListener
    courtlistener_api_key: str = ""

    # Firecrawl
    firecrawl_api_key: str = ""


settings = Settings()
