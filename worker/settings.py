from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql://postgres:postgres@localhost:5432/ops_workflow"
    redis_url: str = "redis://localhost:6379"
    worker_consumer_name: str = "worker-1"
    consumer_group: str = "processors"
    stream_pending: str = "workflow:pending"
    stream_dlq: str = "workflow:dlq"
    max_retries: int = 3
    poll_block_ms: int = 2000

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
