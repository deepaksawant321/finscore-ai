import { expect, test } from "@playwright/test";

const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";
const PASSWORD = "Str0ngPassw0rd!";

async function verificationLink(email: string): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const list = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent("to:" + email)}`)).json();
    const id = list.messages?.[0]?.ID;
    if (id) {
      const msg = await (await fetch(`${MAILPIT}/api/v1/message/${id}`)).json();
      const m = /http:\/\/[^\s]+verify-email\?token=[^\s]+/.exec(msg.Text as string);
      if (m) return m[0];
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("verification email not received");
}

test("register → verify → login → settings → logout", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("checkbox", { name: /I agree to the Terms of Use/ }).check();
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email")).toBeVisible();

  await page.goto(await verificationLink(email));
  await expect(page.getByText("Your email is verified")).toBeVisible();

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/app$/);
  await expect(page.getByText("Start with one question")).toBeVisible(); // a new customer has no score yet

  await page.reload(); // session restored from the httpOnly refresh cookie
  const account = page.getByRole("button", { name: `Account menu for ${email}` });
  await expect(account).toBeVisible();
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(page.getByText("This device")).toBeVisible();

  await account.click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login$/);
});

test("wrong password shows a generic error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.com");
  await page.getByLabel("Password").fill("Wrong-Password-1");
  await page.getByRole("button", { name: "Log in" }).click();
  // Next.js adds its own invisible role=alert route announcer, so match the visible message.
  await expect(page.getByText("Incorrect email or password.")).toBeVisible();
});
