import { FieldType } from "@grafana/data";
import rows from "./__fixtures__/rows.json";
import { rowsToFrame } from "./datasource";

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

	it("row 0 memory values match fixture exactly", () => {
		const frame = rowsToFrame(rows, "A");
		const get = (name: string) =>
			frame.fields.find((f) => f.name === name)!.values[0];

		expect(get("system.memory.usage.buffered")).toBe(323584);
		expect(get("system.memory.usage.cached")).toBe(23399723008);
		expect(get("system.memory.usage.free")).toBe(1171554304);
		expect(get("system.memory.usage.slab_reclaimable")).toBe(2073030656);
		expect(get("system.memory.usage.slab_unreclaimable")).toBe(1148198912);
		expect(get("system.memory.usage.used")).toBe(38139408384);
		expect(get("time")).toBe(
			new Date("2026-04-11T16:38:09.937993854Z").getTime(),
		);

		// row 0 has no network fields — they should be null
		expect(get("system.network.connections.ESTABLISHED")).toBeNull();
	});
});
