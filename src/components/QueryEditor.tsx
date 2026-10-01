import type { QueryEditorProps } from "@grafana/data";
import {
	Alert,
	Button,
	Combobox,
	type ComboboxOption,
	IconButton,
	InlineField,
	InlineFieldRow,
	Input,
	Stack,
	Tag,
} from "@grafana/ui";
import React, { type ChangeEvent } from "react";
import { type DataSource, windowToNs } from "../datasource";
import type {
	AggregationOp,
	ColumnStoreOptions,
	EventQuery,
	Filter,
	FilterOp,
} from "../types";

type Props = QueryEditorProps<DataSource, EventQuery, ColumnStoreOptions>;

const FILTER_OPS: Array<{ label: string; value: FilterOp }> = [
	{ label: "eq", value: "eq" },
	{ label: "exists", value: "exists" },
	{ label: "not exists", value: "not_exists" },
	{ label: ">", value: "gt" },
	{ label: "<", value: "lt" },
	{ label: ">=", value: "gte" },
	{ label: "<=", value: "lte" },
];

function needsValue(op: FilterOp): boolean {
	return (
		op === "eq" || op === "gt" || op === "lt" || op === "gte" || op === "lte"
	);
}

const AGG_OPS = [
	{ label: "None", value: "" },
	{ label: "COUNT", value: "COUNT" },
	{ label: "AVG", value: "AVG" },
	{ label: "SUM", value: "SUM" },
	{ label: "MAX", value: "MAX" },
	{ label: "MIN", value: "MIN" },
];

export function QueryEditor({ query, onChange, onRunQuery }: Props) {
	const { aggregations, limit, groupBy, filters, select } = query;

	const windowInvalid =
		!!query.window && windowToNs(query.window, 0) === undefined;

	// Fires query when Enter is pressed in a text input.
	const runOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter") {
			onRunQuery();
		}
	};

	// SELECT
	const addSelect = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === "Enter" && e.currentTarget.value) {
			onChange({
				...query,
				select: [...(select ?? []), e.currentTarget.value],
			});
			e.currentTarget.value = "";
			onRunQuery();
		}
	};
	const removeSelect = (i: number) => {
		onChange({ ...query, select: (select ?? []).filter((_, j) => j !== i) });
		onRunQuery();
	};

	// FILTERS
	const addFilter = () => {
		onChange({
			...query,
			filters: [
				...(filters ?? []),
				{ id: crypto.randomUUID(), field: "", op: "eq" as FilterOp },
			],
		});
	};
	const updateFilter = (index: number, patch: Partial<Filter>, run = false) => {
		onChange({
			...query,
			filters: (filters ?? []).map((f, i) =>
				i === index ? { ...f, ...patch } : f,
			),
		});
		if (run) {
			onRunQuery();
		}
	};
	const removeFilter = (index: number) => {
		onChange({
			...query,
			filters: (filters ?? []).filter((_, i) => i !== index),
		});
		onRunQuery();
	};

	// AGGREGATION
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
		<Stack direction="column" gap={0}>
			{/* Row 1: SELECT + LIMIT */}
			<InlineFieldRow>
				<InlineField label="SELECT" grow>
					<Stack direction="row" gap={1}>
						{(select ?? []).map((col, i) => (
							<Tag key={col} name={col} onClick={() => removeSelect(i)} />
						))}
						<Input
							placeholder="field name, Enter to add"
							onKeyDown={addSelect}
							width={24}
						/>
					</Stack>
				</InlineField>
				<InlineField label="LIMIT">
					<Input
						type="number"
						value={limit ?? 1000}
						onChange={(e: ChangeEvent<HTMLInputElement>) =>
							onChange({ ...query, limit: parseInt(e.target.value, 10) })
						}
						onKeyDown={runOnEnter}
						width={8}
					/>
				</InlineField>
			</InlineFieldRow>

			{/* Rows 2+: WHERE / AND filters */}
			{(filters ?? []).map((filter, i) => (
				<InlineFieldRow key={filter.id}>
					<InlineField label={i === 0 ? "WHERE" : "AND"} labelWidth={8}>
						<Input
							value={filter.field}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								updateFilter(i, { field: e.target.value })
							}
							onKeyDown={runOnEnter}
							placeholder="field"
							width={20}
						/>
					</InlineField>
					<InlineField label="">
						<Combobox<string>
							options={FILTER_OPS}
							value={filter.op}
							onChange={(item) => {
								if (item) {
									updateFilter(
										i,
										{ op: item.value as FilterOp },
										item.value === "exists" || item.value === "not_exists",
									);
								}
							}}
							width={10}
						/>
					</InlineField>
					{needsValue(filter.op) && (
						<InlineField label="">
							<Input
								value={String(filter.value ?? "")}
								onChange={(e: ChangeEvent<HTMLInputElement>) =>
									updateFilter(i, { value: e.target.value })
								}
								onKeyDown={runOnEnter}
								placeholder="value"
								width={20}
							/>
						</InlineField>
					)}
					<IconButton
						name="trash-alt"
						tooltip="Remove filter"
						onClick={() => removeFilter(i)}
					/>
				</InlineFieldRow>
			))}
			<InlineFieldRow>
				<Button variant="secondary" size="sm" icon="plus" onClick={addFilter}>
					Add filter
				</Button>
			</InlineFieldRow>

			{/* Last row: AGGREGATE + BUCKET + GROUP BY */}
			<InlineFieldRow>
				<InlineField label="AGGREGATE">
					<Combobox<string>
						options={AGG_OPS}
						onChange={onOpChange}
						value={aggregations?.[0]?.op ?? null}
						width={12}
					/>
				</InlineField>
				{aggregations?.[0]?.op && aggregations[0].op !== "COUNT" && (
					<InlineField label="column">
						<Input
							value={aggregations[0].column}
							onChange={(e: ChangeEvent<HTMLInputElement>) =>
								onChange({
									...query,
									aggregations: [
										{ ...aggregations[0], column: e.target.value },
									],
								})
							}
							onKeyDown={runOnEnter}
							placeholder="field name"
							width={20}
						/>
					</InlineField>
				)}
				{aggregations?.[0]?.op && (
					<InlineField
						label="BUCKET"
						tooltip="Time bucket size for the aggregation. 'auto' follows Grafana's interval."
					>
						<Combobox<string>
							options={[
								{ label: "none", value: "" },
								{ label: "auto", value: "auto" },
								{ label: "10s", value: "10s" },
								{ label: "30s", value: "30s" },
								{ label: "1m", value: "1m" },
								{ label: "5m", value: "5m" },
								{ label: "10m", value: "10m" },
								{ label: "30m", value: "30m" },
								{ label: "1h", value: "1h" },
								{ label: "6h", value: "6h" },
								{ label: "1d", value: "1d" },
							]}
							value={query.window ?? ""}
							onChange={(item) => {
								onChange({ ...query, window: item?.value || undefined });
								onRunQuery();
							}}
							createCustomValue
							customValueDescription="Any duration: 30s, 2m, 6h, …"
							width={10}
						/>
					</InlineField>
				)}
				<InlineField label="GROUP BY">
					<Input
						value={(groupBy ?? []).join(", ")}
						onChange={(e: ChangeEvent<HTMLInputElement>) => {
							const vals = e.target.value
								.split(",")
								.map((s) => s.trim())
								.filter(Boolean);
							onChange({ ...query, groupBy: vals });
						}}
						onKeyDown={runOnEnter}
						placeholder="field1, field2"
						width={24}
					/>
				</InlineField>
			</InlineFieldRow>
			{windowInvalid && (
				<Alert
					title={`Unrecognised window "${query.window}" — use a duration like 30s, 5m, 1h, or "auto"`}
					severity="warning"
				/>
			)}
		</Stack>
	);
}
