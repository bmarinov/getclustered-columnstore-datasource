import {
	type DataQueryRequest,
	type DataSourceInstanceSettings,
	FieldType,
} from "@grafana/data";
import { type BackendSrv, setBackendSrv } from "@grafana/runtime";
import { of } from "rxjs";
import type { ColumnStoreOptions, EventQuery } from "types";
import rows from "./__fixtures__/rows.json";
import { DataSource, rowsToFrame, windowToNs } from "./datasource";

describe("rowsToFrame", () => {
	it("every field has the same length as number of rows", () => {
		const frame = rowsToFrame(rows, "A");
		for (const field of frame.fields) {
			expect(field.values).toHaveLength(rows.length);
		}
	});

	it("time field is present and contains epoch ms numbers", () => {
		const frame = rowsToFrame(rows, "A");
		const timeField = frame.fields.find((f) => f.name === "time");
		expect(timeField).toBeDefined();
		expect(timeField!.type).toBe(FieldType.time);
		expect(timeField!.values.every((v: unknown) => typeof v === "number")).toBe(
			true,
		);
	});

	it("all fields have eq len", () => {
		const frame = rowsToFrame(rows, "A");
		const fieldLen: number = frame.fields[0].values.length;
		for (const field of frame.fields) {
			expect(field.values).toHaveLength(fieldLen);
		}
	});

	it("no field has undefined values (sparse alignment)", () => {
		const frame = rowsToFrame(rows, "A");
		for (const field of frame.fields) {
			for (let i = 0; i < rows.length; i++) {
				expect(field.values[i]).not.toBeUndefined();
			}
		}
	});

	it("row 0 disk values match fixture exactly", () => {
		const frame = rowsToFrame(rows, "A");
		const get = (name: string) =>
			frame.fields.find((f) => f.name === name)!.values[0];

		expect(get("host.name")).toBe("fw3kd");
		expect(get("os.type")).toBe("linux");
		expect(get("system.disk.io.read")).toBe(56620475904);
		expect(get("system.disk.io.write")).toBe(553002447872);
		expect(get("system.disk.operations.read")).toBe(101);
		expect(get("system.disk.operations.write")).toBe(0);
		expect(get("time")).toBe(
			new Date("2026-04-12T08:18:19.921005728Z").getTime(),
		);

		// row 0 has no memory fields — they should be null
		expect(get("system.memory.usage.used")).toBeNull();
	});
});

describe("windowToNs", () => {
	it("returns undefined for empty/undefined", () => {
		expect(windowToNs(undefined, 15000)).toBeUndefined();
		expect(windowToNs("", 15000)).toBeUndefined();
	});
	it("converts fixed durations to nanoseconds", () => {
		expect(windowToNs("10s", 0)).toBe(10_000_000_000);
		expect(windowToNs("1m", 0)).toBe(60_000_000_000);
		expect(windowToNs("5m", 0)).toBe(300_000_000_000);
		expect(windowToNs("1h", 0)).toBe(3_600_000_000_000);
		expect(windowToNs("1d", 0)).toBe(86_400_000_000_000);
	});
	it("auto uses intervalMs converted to ns", () => {
		expect(windowToNs("auto", 15000)).toBe(15_000_000_000);
	});
});

describe("queryParams", () => {
	const mockFetch = jest.fn().mockReturnValue(of({ data: [] }));
	beforeEach(() => {
		mockFetch.mockClear();
		setBackendSrv({ fetch: mockFetch } as unknown as BackendSrv);
	});

	it("forwards select to backend", async () => {
		const ds = new DataSource({
			url: "https://localhost",
			jsonData: {},
		} as unknown as DataSourceInstanceSettings<ColumnStoreOptions>);

		await ds.query({
			targets: [
				{
					select: ["store_buf_rows", "go_memstats_heap_alloc_bytes"],
					limit: 100,
				},
			],
			range: {
				from: { toISOString: () => "2026-01-01T00:00:00Z" },
				to: { toISOString: () => "2026-01-02T00:00:00Z" },
			},
		} as unknown as DataQueryRequest<EventQuery>);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					select: ["store_buf_rows", "go_memstats_heap_alloc_bytes"],
				}),
			}),
		);
	});

	it("forwards fixed window as nanoseconds to backend", async () => {
		const ds = new DataSource({
			url: "https://localhost",
			jsonData: {},
		} as unknown as DataSourceInstanceSettings<ColumnStoreOptions>);

		await ds.query({
			targets: [{ window: "5m", limit: 100 }],
			intervalMs: 0,
			range: {
				from: { toISOString: () => "2026-01-01T00:00:00Z" },
				to: { toISOString: () => "2026-01-02T00:00:00Z" },
			},
		} as unknown as DataQueryRequest<EventQuery>);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ window: 300_000_000_000 }),
			}),
		);
	});

	it("auto window sends intervalMs as nanoseconds", async () => {
		const ds = new DataSource({
			url: "https://localhost",
			jsonData: {},
		} as unknown as DataSourceInstanceSettings<ColumnStoreOptions>);

		await ds.query({
			targets: [{ window: "auto", limit: 100 }],
			intervalMs: 15000,
			range: {
				from: { toISOString: () => "2026-01-01T00:00:00Z" },
				to: { toISOString: () => "2026-01-02T00:00:00Z" },
			},
		} as unknown as DataQueryRequest<EventQuery>);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({ window: 15_000_000_000 }),
			}),
		);
	});

	it("forwards aggregations to backend", async () => {
		const ds = new DataSource({
			url: "https://localhost",
			jsonData: {},
		} as unknown as DataSourceInstanceSettings<ColumnStoreOptions>);

		await ds.query({
			targets: [
				{
					aggregations: [{ op: "AVG", column: "duration_ms" }],
					limit: 125,
				},
			],
			range: {
				from: { toISOString: () => "2026-01-01T00:00:00Z" },
				to: { toISOString: () => "2026-01-02T00:00:00Z" },
			},
		} as unknown as DataQueryRequest<EventQuery>);
		expect(mockFetch).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					aggregations: [{ op: "AVG", column: "duration_ms" }],
				}),
			}),
		);
	});
});
