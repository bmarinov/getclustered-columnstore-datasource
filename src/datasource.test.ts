import {
	type DataQueryRequest,
	type DataSourceInstanceSettings,
	FieldType,
} from "@grafana/data";
import { type BackendSrv, setBackendSrv } from "@grafana/runtime";
import { of } from "rxjs";
import type { ColumnStoreOptions, EventQuery } from "types";
import rows from "./__fixtures__/rows.json";
import { DataSource, rowsToFrame } from "./datasource";

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

describe("queryParams", () => {
	const mockFetch = jest.fn().mockReturnValue(of({ data: [] }));
	beforeEach(() => {
		mockFetch.mockClear();
		setBackendSrv({ fetch: mockFetch } as unknown as BackendSrv);
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
