# Columnstore

Query a wide-event store over HTTP from Grafana. Events are rows of arbitrary fields with a
timestamp; the query editor builds select, filter, aggregate, group-by and time-bucket queries and
renders the result as a data frame.

## Requirements

- Grafana 12.3 or later.
- An HTTP backend that implements two endpoints: `GET /health` and
  `POST /query/json?from=&to=`. The request and response shapes are documented in the
  [repository README](https://github.com/bmarinov/getclustered-columnstore-datasource#backend-contract).

## Getting started

1. Add a data source of type Columnstore.
2. Enter the backend URL. Requests go through Grafana's data source proxy.
3. Click Save & test. It calls `GET {url}/health` and expects a 200.
4. In a panel, add fields under SELECT, filters under WHERE, and optionally one aggregation with
   a time bucket and GROUP BY.

## Query editor

| Clause | Meaning |
|---|---|
| SELECT | fields to return; empty returns all fields |
| LIMIT | maximum rows, default 1000 |
| WHERE / AND | filters: `eq`, `exists`, `not exists`, `>`, `<`, `>=`, `<=` |
| AGGREGATE | COUNT, AVG, SUM, MAX or MIN over a column |
| BUCKET | time bucket for the aggregation; `auto` follows the panel interval |
| GROUP BY | fields to group the aggregation by |

## Links

- [Source and issues](https://github.com/bmarinov/getclustered-columnstore-datasource)
- [License: Apache-2.0](https://github.com/bmarinov/getclustered-columnstore-datasource/blob/main/LICENSE)
