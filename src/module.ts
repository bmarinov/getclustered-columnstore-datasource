import { DataSourcePlugin } from "@grafana/data";
import { ConfigEditor } from "./components/ConfigEditor";
import { QueryEditor } from "./components/QueryEditor";
import { DataSource } from "./datasource";
import type { ColumnStoreOptions, EventQuery } from "./types";

export const plugin = new DataSourcePlugin<
	DataSource,
	EventQuery,
	ColumnStoreOptions
>(DataSource)
	.setConfigEditor(ConfigEditor)
	.setQueryEditor(QueryEditor);
