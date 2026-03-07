import httpx
import time
import logging
from app.config import settings

logger = logging.getLogger("kubeatlas-client")


class KubeAtlasClient:
    """KubeAtlas REST API client with JWT authentication."""

    def __init__(self):
        self.base_url = settings.kubeatlas_api_url.rstrip("/")
        self.email = settings.kubeatlas_api_email
        self.password = settings.kubeatlas_api_password
        self.access_token: str | None = None
        self.token_expires: float = 0
        self.http = httpx.AsyncClient(
            timeout=30.0,
            verify=not settings.tls_skip_verify,
        )

    async def _authenticate(self):
        """Login and store JWT token."""
        resp = await self.http.post(
            f"{self.base_url}/auth/login",
            json={"email": self.email, "password": self.password},
        )
        resp.raise_for_status()
        data = resp.json()
        self.access_token = data["tokens"]["access_token"]
        # Refresh 5 min before expiry
        self.token_expires = time.time() + 3500
        logger.info("Authenticated with KubeAtlas API")

    async def _get_token(self) -> str:
        if not self.access_token or time.time() > self.token_expires:
            await self._authenticate()
        return self.access_token

    async def get(self, path: str) -> dict:
        token = await self._get_token()
        resp = await self.http.get(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()

    async def post(self, path: str, body: dict = None) -> dict:
        token = await self._get_token()
        resp = await self.http.post(
            f"{self.base_url}{path}",
            headers={"Authorization": f"Bearer {token}"},
            json=body,
        )
        resp.raise_for_status()
        return resp.json()

    async def close(self):
        await self.http.aclose()


# Singleton
kubeatlas = KubeAtlasClient()
