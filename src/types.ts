import type { DataSourceJsonData } from "@grafana/data";
import type { DataQuery } from "@grafana/schema";

export interface EventQuery extends DataQuery {
	limit: number;
	aggregations: Array<Aggregation>;
	groupBy: Array<string>;
	filters: Array<Filter>;
}

export type FilterOp = "eq" | "exists";

export type Filter = {
	id: string;
	field: string;
	op: FilterOp;
	value?: string | number | boolean;
};

export type Aggregation = {
	op: AggregationOp;
	column: string;
};

export type AggregationOp = "COUNT" | "MAX" | "MIN" | "SUM" | "AVG";

export const DEFAULT_QUERY: Partial<EventQuery> = {
	limit: 1000,
};

export interface DataPoint {
	Time: number;
	Value: number;
}

export interface DataSourceResponse {
	datapoints: DataPoint[];
}

/**
 * These are options configured for each DataSource instance
 */
export interface ColumnStoreOptions extends DataSourceJsonData {
	url?: string;
}

/**
 * Value that is used in the backend, but never sent over HTTP to the frontend
 */
export interface MySecureJsonData {
	apiKey?: string;
}
