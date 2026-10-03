import { expect, test } from "@grafana/plugin-e2e";

test("renders the backend URL field", async ({
	createDataSourceConfigPage,
	readProvisionedDataSource,
	page,
}) => {
	const ds = await readProvisionedDataSource({ fileName: "datasources.yml" });
	await createDataSourceConfigPage({ type: ds.type });
	await expect(
		page.getByRole("textbox", { name: "URL", exact: true }),
	).toBeVisible();
});

test("save & test succeeds when the backend health check answers 200", async ({
	createDataSourceConfigPage,
	readProvisionedDataSource,
	selectors,
	page,
}) => {
	const ds = await readProvisionedDataSource({ fileName: "datasources.yml" });
	const configPage = await createDataSourceConfigPage({ type: ds.type });
	const healthPath = `${selectors.apis.DataSource.proxy(
		configPage.datasource.uid,
		configPage.datasource.id.toString(),
	)}/api/health`;
	await page.route(healthPath, (route) =>
		route.fulfill({ status: 200, body: "OK" }),
	);
	await expect(configPage.saveAndTest({ path: healthPath })).toBeOK();
});

test("save & test shows an error when the backend is unreachable", async ({
	createDataSourceConfigPage,
	readProvisionedDataSource,
	selectors,
}) => {
	const ds = await readProvisionedDataSource({ fileName: "datasources.yml" });
	const configPage = await createDataSourceConfigPage({ type: ds.type });
	const healthPath = `${selectors.apis.DataSource.proxy(
		configPage.datasource.uid,
		configPage.datasource.id.toString(),
	)}/api/health`;
	await expect(configPage.saveAndTest({ path: healthPath })).not.toBeOK();
	await expect(configPage).toHaveAlert("error");
});
