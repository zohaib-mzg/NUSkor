/**
 * Runtime guard sanity check for the public-site build.
 *
 * Usage (against a production server):
 *   npm run build && npm run start   # in another terminal
 *   node scripts/check-guards.mjs
 *
 * Asserts, while signed out:
 *   - public routes respond 200 (they must load logged-out)
 *   - guarded routes redirect to / (portal) or /admin/login (admin)
 *   - app-flow routes are still reachable (no bounce to /login)
 *
 * Exits with code 1 if any check fails.
 */

const BASE = process.env.CHECK_BASE_URL ?? "http://localhost:3000";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/contact",
  "/privacy-policy",
  "/terms",
  "/disclaimer",
  "/cookie-policy",
  "/features",
  "/how-it-works",
  "/for-students",
  "/for-tas",
  "/faq",
  "/glossary",
  "/blog",
  "/tools",
  "/resources",
  "/updates",
  "/tools/cgpa-calculator",
  "/blog/how-cgpa-is-calculated",
  "/blog/category/grades-gpa",
  "/sitemap.xml",
  "/robots.txt",
  "/ads.txt",
];

const GUARDED_ROUTES = [
  "/dashboard",
  "/marks",
  "/evaluations",
  "/announcements",
  "/settings",
  "/ta/sections",
  "/admin",
];

// Authenticated app flow: the page itself redirects to /login while signed out
// (middleware treats it as reachable, the page requires a user).
const APP_REDIRECT_ROUTES = [{ path: "/ta-apply", to: "/login" }];

const FLOW_ROUTES = ["/login", "/admin/login", "/join", "/access-denied"];

let failures = 0;

function pass(msg) {
  console.log(`  PASS  ${msg}`);
}

function fail(msg) {
  failures++;
  console.log(`  FAIL  ${msg}`);
}

async function fetchManual(path) {
  const res = await fetch(new URL(path, BASE), { redirect: "manual" });
  return {
    status: res.status,
    location: res.headers.get("location") ?? "",
  };
}

function isRedirectToLogin({ status, location }) {
  return status >= 300 && status < 400 && location.includes("/login");
}

function redirectPath({ location }) {
  try {
    return new URL(location, BASE).pathname;
  } catch {
    return "";
  }
}

async function checkPublic(path) {
  try {
    const res = await fetchManual(path);
    if (res.status === 200) {
      pass(`public ${path} -> 200`);
    } else if (isRedirectToLogin(res)) {
      fail(`public ${path} -> ${res.status} redirects to login!`);
    } else {
      fail(`public ${path} -> expected 200, got ${res.status}`);
    }
  } catch (err) {
    fail(`public ${path} -> network error: ${err.message}`);
  }
}

async function checkGuarded(path) {
  const expected = path.startsWith("/admin") ? "/admin/login" : "/";
  try {
    const res = await fetchManual(path);
    if (redirectPath(res) === expected) {
      pass(`guarded ${path} -> ${res.status} to ${expected}`);
    } else {
      fail(
        `guarded ${path} -> expected redirect to ${expected}, got ${
          res.status
        } ${redirectPath(res) || res.location || ""}`.trim()
      );
    }
  } catch (err) {
    fail(`guarded ${path} -> network error: ${err.message}`);
  }
}

async function checkAppRedirect({ path, to }) {
  try {
    const res = await fetchManual(path);
    if (redirectPath(res) === to) {
      pass(`app redirect ${path} -> ${res.status} to ${to}`);
    } else {
      fail(
        `app redirect ${path} -> expected redirect to ${to}, got ${
          res.status
        } ${redirectPath(res) || res.location || ""}`.trim()
      );
    }
  } catch (err) {
    fail(`app redirect ${path} -> network error: ${err.message}`);
  }
}

async function checkFlow(path) {
  try {
    const res = await fetchManual(path);
    if (isRedirectToLogin(res)) {
      fail(`flow ${path} -> unexpectedly bounced to login (${res.location})`);
    } else {
      pass(`flow ${path} -> reachable (status ${res.status})`);
    }
  } catch (err) {
    fail(`flow ${path} -> network error: ${err.message}`);
  }
}

async function checkNoAds(path) {
  try {
    const res = await fetch(new URL(path, BASE));
    const html = await res.text();
    if (html.includes("adsbygoogle")) {
      fail(`auth ${path} -> contains "adsbygoogle"`);
    } else {
      pass(`auth ${path} -> no ad script`);
    }
  } catch (err) {
    fail(`auth ${path} -> network error: ${err.message}`);
  }
}

console.log(`Guard checks against ${BASE}\n`);

console.log("Public routes (expect 200 while signed out):");
for (const route of PUBLIC_ROUTES) await checkPublic(route);

console.log("\nGuarded routes (expect redirect to / or /admin/login while signed out):");
for (const route of GUARDED_ROUTES) await checkGuarded(route);

console.log("\nAuthenticated app-redirect routes (expect redirect while signed out):");
for (const route of APP_REDIRECT_ROUTES) await checkAppRedirect(route);

console.log("\nApp-flow routes (expect reachable while signed out):");
for (const route of FLOW_ROUTES) await checkFlow(route);

console.log("\nAuth surfaces (expect no ad scripts):");
for (const route of ["/login", "/admin/login"]) await checkNoAds(route);

console.log(
  failures === 0
    ? "\nAll guard checks passed."
    : `\n${failures} guard check(s) FAILED.`
);
process.exit(failures === 0 ? 0 : 1);
