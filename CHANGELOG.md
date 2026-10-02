# Changelog

## 0.1.0 (Unreleased)

- Query editor with SELECT, LIMIT, WHERE filters (`eq`, `exists`, `not_exists`, `gt`, `lt`,
  `gte`, `lte`), one aggregation (COUNT, AVG, SUM, MAX, MIN), time buckets and GROUP BY.
- Results rendered as a sparse data frame; the `ts` column becomes the time field.
- Save & test against the backend's `GET /health`.
