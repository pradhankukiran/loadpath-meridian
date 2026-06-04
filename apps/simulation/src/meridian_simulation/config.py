from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    redis_url: str
    modal_llm_endpoint: str | None
    nrel_api_key: str | None
    eia_api_key: str | None

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            modal_llm_endpoint=os.getenv("MODAL_LLM_ENDPOINT"),
            nrel_api_key=os.getenv("NREL_API_KEY"),
            eia_api_key=os.getenv("EIA_API_KEY"),
        )
