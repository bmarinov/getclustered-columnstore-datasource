import type { QueryEditorProps } from "@grafana/data";
import {
	Combobox,
	type ComboboxOption,
	InlineField,
	Input,
	Stack,
} from "@grafana/ui";
import React, { type ChangeEvent } from "react";
import type { DataSource } from "../datasource";
import type { AggregationOp, ColumnStoreOptions, EventQuery } from "../types";

type Props = QueryEditorProps<DataSource, EventQuery, ColumnStoreOptions>;

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
	const { aggregations, limit, groupBy } = query;

	const onOpChange = (item: ComboboxOption<string> | null) => {
		if (!item?.value) {
			onChange({ ...query, aggregations: [] });
			onRunQuery();
			return;
		}
		const current = aggregations?.[0] ?? {
			op: item.value as AggregationOp,
			column: "",
		};
		onChange({
			...query,
			aggregations: [{ ...current, op: item.value as AggregationOp }],
		});
		onRunQuery();
	};

	return (
		<Stack gap={0}>
			<InlineField label="Aggregation">
				<Combobox<string>
					options={[
						{ label: "None", value: "" },
						{ label: "COUNT", value: "COUNT" },
						{ label: "AVG", value: "AVG" },
						{ label: "SUM", value: "SUM" },
						{ label: "MAX", value: "MAX" },
						{ label: "MIN", value: "MIN" },
					]}
					onChange={onOpChange}
					value={aggregations?.[0]?.op ?? null}
				/>
			</InlineField>
			{aggregations?.[0]?.op && aggregations[0].op !== "COUNT" && (
				<InlineField label="Column">
					<Input
						value={aggregations[0].column}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							onChange({
								...query,
								aggregations: [{ ...aggregations[0], column: e.target.value }],
							});
						}}
						onBlur={onRunQuery}
						placeholder="field name"
					/>
				</InlineField>
			)}
			<InlineField label="Group By">
				<Input
					value={(groupBy ?? []).join(", ")}
					onChange={(e: ChangeEvent<HTMLInputElement>) => {
						const vals = e.target.value
							.split(",")
							.map((s) => s.trim())
							.filter(Boolean);
						onChange({ ...query, groupBy: vals });
					}}
					onBlur={onRunQuery}
					placeholder="field1, field2"
				/>
			</InlineField>
			<InlineField label="Limit">
				<Input
					type="number"
					value={limit ?? 1000}
					onChange={(e: ChangeEvent<HTMLInputElement>) => {
						onChange({ ...query, limit: parseInt(e.target.value, 10) });
					}}
					onBlur={onRunQuery}
					width={8}
				/>
			</InlineField>
		</Stack>
	);
}
