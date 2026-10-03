import { expect, test } from "@grafana/plugin-e2e";

test("renders the query editor controls", async ({
	panelEditPage,
	readProvisionedDataSource,
}) => {
	const ds = await readProvisionedDataSource({ fileName: "datasources.yml" });
	await panelEditPage.datasource.set(ds.name);
	const row = panelEditPage.getQueryEditorRow("A");
	await expect(row.getByPlaceholder("field name, Enter to add")).toBeVisible();
	await expect(row.getByRole("button", { name: "Add filter" })).toBeVisible();
});

test("renders rows returned by the backend as a table", async ({
	panelEditPage,
	readProvisionedDataSource,
	page,
}) => {
	const ds = await readProvisionedDataSource({ fileName: "datasources.yml" });
	await panelEditPage.datasource.set(ds.name);
	await panelEditPage.setVisualization("Table");
	await page.route(/\/api\/query\/json\?/, (route) =>
		route.fulfill({
			status: 200,
			contentType: "application/json",
			body: JSON.stringify([
				{ ts: "2026-04-12T10:00:00Z", service: "api", duration_ms: 12 },
				{ ts: "2026-04-12T10:01:00Z", service: "web", duration_ms: 30 },
			]),
		}),
	);
	await expect(
		panelEditPage.refreshPanel({
			waitForResponsePredicateCallback: (response) =>
				response.url().includes("/api/query/json"),
		}),
	).toBeOK();
	await expect(panelEditPage.panel.fieldNames).toContainText([
		"time",
		"service",
		"duration_ms",
	]);
	await expect(panelEditPage.panel.data).toContainText(["api", "web"]);
});
