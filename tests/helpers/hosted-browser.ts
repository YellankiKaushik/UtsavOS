import { expect, type BrowserContext, type Page } from "@playwright/test";
const origin = process.env.LIVE_PREVIEW_URL!;
export async function protect(context: BrowserContext) {
  const token = process.env.VERCEL_OIDC_TOKEN;
  if (token)
    await context.route(`${origin}/**`, async (route) =>
      route.continue({
        headers: {
          ...(await route.request().allHeaders()),
          "x-vercel-trusted-oidc-idp-token": token,
        },
      }),
    );
}
export async function login(page: Page, suffix: "A" | "B") {
  await page.goto("/login");
  await page
    .getByLabel("Email address")
    .fill(process.env[`LIVE_USER_${suffix}_EMAIL`]!);
  await page
    .getByLabel("Password", { exact: true })
    .fill(process.env[`LIVE_USER_${suffix}_PASSWORD`]!);
  const authResponse = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/auth/actions" &&
      response.request().method() === "POST",
  );
  await page.getByRole("button", { name: "Sign in to UtsavOS" }).click();
  const response = await authResponse;
  expect(response.status()).toBe(200);
  console.info(
    JSON.stringify({
      step: "hosted login",
      status: response.status(),
      setCookiePresent: !!(await response.headerValue("set-cookie")),
      cookies: (await page.context().cookies(origin)).map((c) => ({
        name: c.name,
        secure: c.secure,
        httpOnly: c.httpOnly,
        sameSite: c.sameSite,
        path: c.path,
      })),
    }),
  );
  await expect(page).toHaveURL(/\/app\/events$/, { timeout: 20000 });
}
export async function read(page: Page, path: string) {
  return page.evaluate(async (path) => {
    const response = await fetch(path);
    return { status: response.status, body: await response.json() };
  }, path);
}
