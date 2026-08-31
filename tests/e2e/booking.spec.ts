import { expect, test } from "@playwright/test";

test("guest can complete a booking inquiry", async ({ page }) => {
  await page.route("**/api/leads", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ received: true, leadId: "fixture-lead" }),
    });
  });
  await page.goto("/book");
  await page.getByLabel("Guest name").fill("Sarah Johnson");
  await page.getByLabel("Email").fill("sarah@example.com");
  await page.getByLabel("Desired date").fill("2099-05-17");
  await page.getByLabel("Party size").fill("6");
  await page.getByLabel("Guest list").check();
  await page.getByLabel(/I agree that Promotr/).check();
  await page.getByRole("button", { name: "Send booking inquiry" }).click();
  await expect(page).toHaveURL(/\/book\/success$/);
  await expect(
    page.getByRole("heading", { name: "We've got your request." }),
  ).toBeVisible();
  await expect(page.getByText(/not a confirmed booking/i)).toBeVisible();
});
