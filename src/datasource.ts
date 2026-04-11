import {
	type CoreApp,
	createDataFrame,
	type DataFrame,
	type DataQueryRequest,
	type DataQueryResponse,
	DataSourceApi,
	type DataSourceInstanceSettings,
	FieldType,
} from "@grafana/data";
import { getBackendSrv, isFetchError } from "@grafana/runtime";
import { lastValueFrom } from "rxjs";
import {
	type ColumnStoreOptions,
	type DataSourceResponse,
	DEFAULT_QUERY,
	type EventQuery,
} from "./types";

export class DataSource extends DataSourceApi<EventQuery, ColumnStoreOptions> {
	baseUrl: string;

	constructor(
		instanceSettings: DataSourceInstanceSettings<ColumnStoreOptions>,
	) {
		super(instanceSettings);
		this.baseUrl = instanceSettings.url!;
	}

	getDefaultQuery(_: CoreApp): Partial<EventQuery> {
		return DEFAULT_QUERY;
	}

	async query(
		options: DataQueryRequest<EventQuery>,
	): Promise<DataQueryResponse> {
		if (options.targets.length === 0) {
			return Promise.resolve({ data: [] });
		}

		const { range } = options;
		const from = range!.from.toISOString();
		const to = range!.to.toISOString();

		const response = await lastValueFrom(
			getBackendSrv().fetch<Array<Record<string, unknown>>>({
				url: `${this.baseUrl}/api/query/json?from=${from}&to=${to}`,
				method: "POST",
				headers: { "Content-Type": "application/json" },
				data: {
					limit: options.targets[0].limit,
					aggregations: options.targets[0].aggregations,
					groupBy: options.targets[0].groupBy,
					filters: (options.targets[0].filters ?? []).map(({ id: _, ...f }) => f),
				},
			}),
		);

		const df: DataFrame = rowsToFrame(response.data, options.targets[0].refId);

		return {
			data: [df],
		};
	}

	async request(url: string, params?: string) {
		const response = getBackendSrv().fetch<DataSourceResponse>({
			url: `${this.baseUrl}/api${url}${params?.length ? `?${params}` : ""}`,
		});
		return lastValueFrom(response);
	}

	/**
	 * Checks whether we can connect to the API.
	 */
	async testDatasource() {
		const defaultErrorMessage = "Cannot connect to API";

		try {
			const response = await this.request("/health");
			if (response.status === 200) {
				return {
					status: "success",
					message: "Success",
				};
			} else {
				return {
					status: "error",
					message: response.statusText
						? response.statusText
						: defaultErrorMessage,
				};
			}
		} catch (err) {
			let message = "";
			if (typeof err === "string") {
				message = err;
			} else if (isFetchError(err)) {
				message =
					"Fetch error: " +
					(err.statusText ? err.statusText : defaultErrorMessage);
				if (err.data && err.data.error && err.data.error.code) {
					message += ": " + err.data.error.code + ". " + err.data.error.message;
				}
			}
			return {
				status: "error",
				message,
			};
		}
	}
}

export function rowsToFrame(
	data: Array<Record<string, unknown>>,
	refId: string,
): DataFrame {
	// pass 1: discover all keys
	const allKeys = new Set<string>();
	for (const row of data) {
		for (const key of Object.keys(row)) {
			allKeys.add(key);
		}
	}

	const frames = new Map<string, unknown[]>();
	for (const key of allKeys) {
		frames.set(key, []);
	}

	// pass 2: push value or null for every key on every row
	for (const row of data) {
		for (const key of allKeys) {
			frames.get(key)!.push(key in row ? row[key] : null);
		}
	}

	const fields = Array.from(frames.entries()).map(([key, values]) => {
		if (key === "ts") {
			return {
				name: "time",
				type: FieldType.time,
				values: values.map((v) => new Date(v as string).getTime()),
			};
		}
		const sample = values.find((v) => v !== null);
		const type =
			typeof sample === "number" ? FieldType.number : FieldType.string;
		return { name: key, type, values };
	});
	return createDataFrame({ refId, fields });
}
