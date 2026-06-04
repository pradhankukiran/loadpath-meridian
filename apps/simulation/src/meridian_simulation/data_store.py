from __future__ import annotations

SCENARIO_DATASETS: dict[tuple[str, str], list[dict]] = {}


def add_dataset(project_id: str, scenario_id: str, dataset: dict) -> dict:
    key = (project_id, scenario_id)
    SCENARIO_DATASETS.setdefault(key, [])
    SCENARIO_DATASETS[key].insert(0, dataset)
    return dataset


def list_datasets(project_id: str, scenario_id: str) -> list[dict]:
    return SCENARIO_DATASETS.get((project_id, scenario_id), [])


def latest_dataset_summary(project_id: str, scenario_id: str) -> dict | None:
    datasets = list_datasets(project_id, scenario_id)

    if not datasets:
        return None

    return datasets[0]["summary"]
