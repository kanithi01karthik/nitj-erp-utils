import assert from "node:assert/strict";
import test from "node:test";
import { calculateDeficit, calculateScenario } from "../packages/core/attendance.mjs";

test("deficit keeps the existing signed badge values at and around 75%", () => {
  assert.equal(calculateDeficit(18, 22), 2);
  assert.equal(calculateDeficit(18, 23), 1);
  assert.equal(calculateDeficit(18, 24), 0);
  assert.equal(calculateDeficit(18, 25), -3);
  assert.equal(calculateDeficit(0, 1), -3);
  assert.equal(calculateDeficit(0, 0), 0);
});

test("what-if applies attended and missed classes to the selected totals", () => {
  assert.deepEqual(calculateScenario(18, 24, 3, 1), { percentage: 75, deficit: 0 });
  assert.deepEqual(calculateScenario(18, 24, 2, 0), { percentage: (20 / 26) * 100, deficit: 0 });
  assert.deepEqual(calculateScenario(18, 24, 0, 1), { percentage: 72, deficit: -3 });
  assert.deepEqual(calculateScenario(18, 25, 6, 0), { percentage: (24 / 31) * 100, deficit: 1 });
});

test("zero delivered classes have no percentage until a class is counted", () => {
  assert.deepEqual(calculateScenario(0, 0, 0, 0), { percentage: null, deficit: 0 });
  assert.deepEqual(calculateScenario(0, 0, 1, 0), { percentage: 100, deficit: 0 });
  assert.deepEqual(calculateScenario(0, 0, 0, 1), { percentage: 0, deficit: -3 });
});

test("invalid counts are rejected before calculating a projection", () => {
  for (const count of [-1, 0.5, NaN, Infinity, "1", Number.MAX_SAFE_INTEGER + 1]) {
    assert.equal(calculateScenario(18, 24, count, 0), null);
    assert.equal(calculateScenario(18, 24, 0, count), null);
  }
  assert.equal(calculateDeficit(25, 24), null);
  assert.equal(calculateScenario(25, 24, 0, 2), null);
  assert.equal(calculateScenario(18, 24, 0, Math.floor(Number.MAX_SAFE_INTEGER / 4)), null);
});

test("deficit uses the exact target even when the percentage rounds to 75%", () => {
  const scenario = calculateScenario(18, 24, 300000, 100001);
  assert.equal(scenario.percentage.toFixed(2), "75.00");
  assert.equal(scenario.deficit, -3);
});
