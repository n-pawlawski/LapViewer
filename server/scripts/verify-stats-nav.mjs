/**
 * Browser-less verification: login as root, load account page HTML/JS, check Stats nav.
 * Usage: node server/scripts/verify-stats-nav.mjs [baseUrl]
 */
const baseUrl = process.argv[2] ?? "http://localhost:3090";

async function main() {
  const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "root", password: "root" }),
  });
  if (!loginRes.ok) {
    throw new Error(`Login failed: ${loginRes.status} ${await loginRes.text()}`);
  }
  const user = await loginRes.json();
  const cookie = loginRes.headers.getSetCookie?.() ?? [];
  const cookieHeader = cookie.map((c) => c.split(";")[0]).join("; ");
  console.log("Logged in as:", user.displayName, "canManagePermissions:", user.canManagePermissions);

  const accountRes = await fetch(`${baseUrl}/api/account`, {
    headers: { Cookie: cookieHeader },
  });
  const account = await accountRes.json();
  console.log("Account permissions:", account.user.permissions);
  console.log("Permission defs include stats.view:", account.permissionDefinitions.some((p) => p.key === "stats.view"));

  const statsMeRes = await fetch(`${baseUrl}/api/stats/me`, { headers: { Cookie: cookieHeader } });
  console.log("GET /api/stats/me:", statsMeRes.status, await statsMeRes.json());

  const indexRes = await fetch(`${baseUrl}/`);
  const indexHtml = await indexRes.text();
  const jsMatch = indexHtml.match(/src="(\/assets\/index-[^"]+\.js)"/);
  if (!jsMatch) throw new Error("Could not find JS bundle in index.html");
  const jsUrl = `${baseUrl}${jsMatch[1]}`;
  const jsRes = await fetch(jsUrl);
  const js = await jsRes.text();
  const checks = {
    hasAccountStatsRoute: js.includes("/account/stats"),
    hasStatsLabel: js.includes("Stats"),
    hasAccountHubNav: js.includes("account-hub-nav"),
    hasShowStatsNavPattern: js.includes("canManagePermissions"),
  };
  console.log("Client bundle checks:", checks);

  if (!checks.hasAccountStatsRoute || !checks.hasStatsLabel) {
    process.exitCode = 1;
    console.error("FAIL: Client bundle missing stats UI");
  } else {
    console.log("PASS: Client bundle includes stats page and nav");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
