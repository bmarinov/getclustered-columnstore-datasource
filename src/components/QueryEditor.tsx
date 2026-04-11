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
import type { AggregationOp, ColumnStoreOptions, EventQuery, Filter, FilterOp } from "../types";

type Props = QueryEditorProps<DataSource, EventQuery, ColumnStoreOptions>;

const FILTER_OPS: Array<{ label: string; value: FilterOp }> = [
	{ label: "eq", value: "eq" },
	{ label: "exists", value: "exists" },
];

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
	const { aggregations, limit, groupBy, filters } = query;

	const updateFilter = (index: number, patch: Partial<Filter>) => {
		const updated = (filters ?? []).map((f, i) => (i === index ? { ...f, ...patch } : f));
		onChange({ ...query, filters: updated });
	};

	const addFilter = () => {
		onChange({ ...query, filters: [...(filters ?? []), { id: crypto.randomUUID(), field: "", op: "eq" as FilterOp }] });
	};

	const removeFilter = (index: number) => {
		onChange({ ...query, filters: (filters ?? []).filter((_, i) => i !== index) });
		onRunQuery();
	};

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
			{(filters ?? []).map((filter, i) => (
				<Stack key={filter.id} gap={0}>
					<InlineField label="Field">
						<Input
							value={filter.field}
							onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter(i, { field: e.target.value })}
							onBlur={onRunQuery}
							placeholder="field name"
						/>
					</InlineField>
					<InlineField label="Op">
						<Combobox<string>
							options={FILTER_OPS}
							value={filter.op}
							onChange={(item) => { if (item) { updateFilter(i, { op: item.value as FilterOp }); } }}
						/>
					</InlineField>
					{filter.op === "eq" && (
						<InlineField label="Value">
							<Input
								value={String(filter.value ?? "")}
								onChange={(e: ChangeEvent<HTMLInputElement>) => updateFilter(i, { value: e.target.value })}
								onBlur={onRunQuery}
								placeholder="value"
							/>
						</InlineField>
					)}
					<button type="button" onClick={() => removeFilter(i)}>✕</button>
				</Stack>
			))}
			<button type="button" onClick={addFilter}>+ Add Filter</button>
		</Stack>
	);
}
