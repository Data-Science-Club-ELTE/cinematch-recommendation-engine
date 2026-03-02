# CineMatch

## Brief project description

`CineMatch` helps people find movies and TV shows they are likely to enjoy. Instead of only showing what is popular, it tries to learn what each person might like and suggests better matches. The goal is to make choosing what to watch faster, easier, and less stressful.

## Team

| Name                | Expected responsibilities |
| :------------------ | :------------------------ |
| Teerath Kumar       | Co-Lead                   |
| Akpaeva Madina      | Team Member               |
| Enemuo Ivan Tadinma | Team Member               |
| Samsiani Elene      | Team Member               |

## The _Problem_ behind the project

Users face decision fatigue because there are too many entertainment options and not enough meaningful personalization. Many recommendation systems over-prioritize popularity and fail to adapt to user-specific taste, recency, and diversity. CineMatch addresses this by building a hybrid recommender that can move beyond "most popular" outputs and support richer discovery for both users and creators.

## Challenges

- Integrating heterogeneous data sources (TMDB metadata + MovieLens interactions) into a consistent schema.
- Handling cold-start scenarios for new users and newly added content.
- Balancing accuracy with diversity, novelty, and fairness in ranked recommendations.
- Building explainable recommendation logic users can trust.
- Designing for production constraints: scalable APIs, vector search efficiency, and retraining workflows.

## Expectations

We expect CineMatch to deliver stronger recommendation quality than simple popularity baselines through a hybrid ranking approach that combines collaborative filtering, embedding similarity, popularity adjustment, and recency weighting. We also expect measurable improvements in ranking quality and discovery quality, tracked through `Hit Rate@K`, `Recall@K`, `NDCG@K`, diversity, and novelty metrics. Over time, the system should support real-user interaction feedback and periodic model retraining.

## Tools & Technologies

- `Python`
- `FastAPI`
- `PostgreSQL`
- `FAISS`
- `Streamlit` (prototype UI)
- `React` (advanced UI phase)
- `Docker`
- `TMDB API`
- `MovieLens dataset`
- `Sentence Transformers` (content embeddings)
- `ALS` matrix factorization
- `LightGBM` / `XGBoost` (learning-to-rank)

## How to run the Project

> [!WARNING]
> This section is reserved for guidance on how to run the project components. This becomes relevant after code has been pushed to the repository, and is expected to be maintained according to the evolving state of the project.

## Results

> [!CAUTION]
> This section is reserved for discussing the project results at the **end of the semester**.

At this stage, final semester results are pending. The project will report outcomes at the end of the semester using:

- Recommendation quality: `Hit Rate@K`, `Recall@K`, `NDCG@K`
- Discovery quality: diversity and novelty metrics
- System readiness milestones aligned with the project roadmap (prototype -> hybrid model -> deployment -> retraining loop)
