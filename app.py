"""AIONEX development/production entry point."""

from __future__ import annotations

from aionex import create_app
from aionex.config import Settings

settings = Settings.from_env()
app = create_app(settings)


if __name__ == "__main__":
    from waitress import serve

    print(f"AIONEX is available at http://{settings.host}:{settings.port}")
    serve(
        app,
        host=settings.host,
        port=settings.port,
        threads=4,
        channel_timeout=30,
        clear_untrusted_proxy_headers=True,
    )
