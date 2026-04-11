import type { QueryEditorProps } from "@grafana/data";
import { InlineField, Input, Stack } from "@grafana/ui";
import React, { type ChangeEvent } from "react";
import type { DataSource } from "../datasource";
import type { MyDataSourceOptions, MyQuery } from "../types";

type Props = QueryEditorProps<DataSource, MyQuery, MyDataSourceOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
	const onQueryTextChange = (event: ChangeEvent<HTMLInputElement>) => {
		onChange({ ...query, queryText: event.target.value });
	};

	const onConstantChange = (event: ChangeEvent<HTMLInputElement>) => {
		onChange({ ...query, constant: parseFloat(event.target.value) });
		// executes the query
		onRunQuery();
	};

	const { queryText, constant } = query;

	return (
		<Stack gap={0}>
			<InlineField label="Constant">
				<Input
					id="query-editor-constant"
					onChange={onConstantChange}
					value={constant}
					width={8}
					type="number"
					step="0.1"
				/>
			</InlineField>
			<InlineField label="Query Text" labelWidth={16} tooltip="Not used yet">
				<Input
					id="query-editor-query-text"
					onChange={onQueryTextChange}
					value={queryText || ""}
					required
					placeholder="Enter a query"
				/>
			</InlineField>
		</Stack>
	);
}
