from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # LiteLLM connection
    litellm_base_url: str = "https://LITELLM_ROUTE_URL_BURAYA"
    litellm_api_key: str = "LITELLM_API_KEY_BURAYA"
    litellm_model: str = "gpt-3.5-turbo"  # LiteLLM model adı (config'ine göre değiştir)

    # KubeAtlas API connection (same namespace)
    kubeatlas_api_url: str = "http://kubeatlas-api:8080/api/v1"
    kubeatlas_api_email: str = "admin@kubeatlas.local"
    kubeatlas_api_password: str = ""

    # Server
    server_port: int = 8090
    tls_skip_verify: bool = False

    class Config:
        env_prefix = ""
        case_sensitive = False


settings = Settings()
