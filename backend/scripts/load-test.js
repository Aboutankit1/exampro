/**
 * Load test — reproduces the shared-IP rate-limiting issue.
 *
 * All requests below run from THIS one machine, so the server sees them all
 * as coming from the same IP — exactly like 30+ students on one campus WiFi
 * would look to the server. If real students start getting HTTP 429 (Too Many
 * Requests) during a normal exam, this is why.
 *
 * PREREQUISITES:
 *   - The backend must be running locally: `npm run dev` (in another terminal)
 *   - A working MONGO_URI must be set in backend/.env — the server won't boot
 *     without a database connection, even though this test only hits the
 *     lightweight /api/health route (which doesn't touch MongoDB itself).
 *
 * USAGE:
 *   node scripts/load-test.js [concurrentStudents] [requestsPerStudent] [inFlight]
 *
 * EXAMPLES:
 *   node scripts/load-test.js                 -> 30 students x 20 requests (default)
 *   node scripts/load-test.js 200 20           -> 200 students x 20 requests
 *   node scripts/load-test.js 200 20 100       -> same, but 100 requests in flight at once
 */

const BASE_URL = process.env.TEST_URL || "http://localhost:5000";
const STUDENTS = Number(process.argv[2]) || 30;
const REQUESTS_PER_STUDENT = Number(process.argv[3]) || 20;
const CONCURRENCY = Number(process.argv[4]) || 50; // requests in flight at once — mimics real traffic better than firing everything at once, and avoids hitting this machine's own socket limits

const hitHealthEndpoint = async (studentId, reqNum) => {
  try {
    const res = await fetch(`${BASE_URL}/api/health`);
    return { studentId, reqNum, status: res.status };
  } catch (err) {
    return { studentId, reqNum, status: "ERROR", error: err.message };
  }
};

const run = async () => {
  console.log(
    `\nSimulating ${STUDENTS} students x ${REQUESTS_PER_STUDENT} requests each ` +
      `(all from this one machine/IP, just like one campus WiFi; ${CONCURRENCY} in flight at a time)...\n`
  );

  const jobs = [];
  for (let s = 0; s < STUDENTS; s++) {
    for (let r = 0; r < REQUESTS_PER_STUDENT; r++) {
      jobs.push([s, r]);
    }
  }

  const results = [];
  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const batch = jobs.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(batch.map(([s, r]) => hitHealthEndpoint(s, r)));
    results.push(...batchResults);
  }

  const total = results.length;
  const ok = results.filter((r) => r.status === 200).length;
  const blocked = results.filter((r) => r.status === 429).length;
  const errors = results.filter((r) => r.status === "ERROR").length;

  console.log(`Total requests sent:   ${total}`);
  console.log(`Succeeded (200):       ${ok}`);
  console.log(`Rate-limited (429):    ${blocked}`);
  console.log(`Network errors:        ${errors}`);
  if (errors > 0) {
    console.log(`  (a sample error, if any: ${results.find((r) => r.status === "ERROR")?.error})`);
  }

  if (blocked > 0) {
    console.log(
      `\n${blocked} request(s) were blocked with 429. This is the shared-IP rate-limit bug — ` +
        `in a real exam with ${STUDENTS}+ students on the same campus WiFi, real students would ` +
        `see this same "Too many requests" error mid-exam.`
    );
  } else if (errors === 0) {
    console.log(
      `\nNothing got blocked at this volume. Try a bigger number to trigger it, e.g.:\n` +
        `  node scripts/load-test.js 200 20`
    );
  }
};

run();
