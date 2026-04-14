from __future__ import annotations

from pathlib import Path
from zipfile import ZipFile
import urllib.request

import pandas as pd

MOVIELENS_URL = "https://files.grouplens.org/datasets/movielens/ml-latest-small.zip"

DATA_DIR = Path(__file__).resolve().parent / "data"
ZIP_PATH = DATA_DIR / "ml-latest-small.zip"
EXTRACT_DIR = DATA_DIR / "ml-latest-small"
RATINGS_PATH = EXTRACT_DIR / "ratings.csv"
LINKS_PATH = EXTRACT_DIR / "links.csv"


def ensure_movielens_dataset() -> bool:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if RATINGS_PATH.exists() and LINKS_PATH.exists():
        return True

    try:
        urllib.request.urlretrieve(MOVIELENS_URL, ZIP_PATH)
        with ZipFile(ZIP_PATH, "r") as archive:
            archive.extractall(DATA_DIR)
        return RATINGS_PATH.exists() and LINKS_PATH.exists()
    except Exception:
        return False


def load_movielens_user_item_matrix() -> pd.DataFrame:
    if not ensure_movielens_dataset():
        return pd.DataFrame()

    ratings = pd.read_csv(RATINGS_PATH)
    links = pd.read_csv(LINKS_PATH)
    links = links.dropna(subset=["tmdbId"]).copy()
    links["tmdbId"] = links["tmdbId"].astype(int)
    merged = ratings.merge(links[["movieId", "tmdbId"]], on="movieId", how="inner")
    if merged.empty:
        return pd.DataFrame()

    matrix = merged.pivot_table(index="userId", columns="tmdbId", values="rating", fill_value=0.0)
    matrix.index = matrix.index.astype(str)
    return matrix


if __name__ == "__main__":
    ok = ensure_movielens_dataset()
    print("MovieLens dataset ready." if ok else "MovieLens dataset unavailable, using fallback data.")
