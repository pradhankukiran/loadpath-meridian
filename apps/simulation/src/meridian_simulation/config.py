from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    redis_url: str
    modal_llm_endpoint: str | None
    nrel_api_key: str | None
    eia_api_key: str | None
    database_url: str = "sqlite:///storage/simulation.db"
    artifact_dir: str = "storage/artifacts"
    sync_jobs: bool = True
    app_env: str = "local"
    frontend_origins: tuple[str, ...] = ("http://localhost:5173",)

    @classmethod
    def from_env(cls) -> "Settings":
        frontend_origins = tuple(
            origin.strip()
            for origin in os.getenv(
                "FRONTEND_URLS",
                os.getenv("FRONTEND_URL", "http://localhost:5173"),
            ).split(",")
            if origin.strip()
        )

        return cls(
            redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
            database_url=os.getenv("SIMULATION_DATABASE_URL", "sqlite:///storage/simulation.db"),
            artifact_dir=os.getenv("SIMULATION_ARTIFACT_DIR", "storage/artifacts"),
            sync_jobs=os.getenv("SIMULATION_SYNC_JOBS", "true").lower() in {"1", "true", "yes"},
            modal_llm_endpoint=os.getenv("MODAL_LLM_ENDPOINT"),
            nrel_api_key=os.getenv("NREL_API_KEY"),
            eia_api_key=os.getenv("EIA_API_KEY"),
            app_env=os.getenv("APP_ENV", "local"),
            frontend_origins=frontend_origins,
        )
