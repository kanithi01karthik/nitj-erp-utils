const TARGET_NUMERATOR = 3;
const TARGET_DENOMINATOR = 4;
const MAX_CLASSES = Math.floor(Number.MAX_SAFE_INTEGER / TARGET_DENOMINATOR);

export const TARGET_PERCENT = (100 * TARGET_NUMERATOR) / TARGET_DENOMINATOR;

function isClassCount(value) {
  return Number.isSafeInteger(value) && value >= 0 && value <= MAX_CLASSES;
}

function hasValidTotals(attended, delivered) {
  return isClassCount(attended) && isClassCount(delivered) && attended <= delivered;
}

export function calculateDeficit(attended, delivered) {
  if (!hasValidTotals(attended, delivered)) return null;

  // At 3/4, a present class adds one to the margin and a missed class costs three.
  const margin = TARGET_DENOMINATOR * attended - TARGET_NUMERATOR * delivered;
  return margin < 0 ? margin : Math.floor(margin / TARGET_NUMERATOR);
}

export function calculateScenario(attended, delivered, futureAttended, futureMissed) {
  if (
    !hasValidTotals(attended, delivered) ||
    !isClassCount(futureAttended) ||
    !isClassCount(futureMissed)
  ) return null;

  const projectedAttended = attended + futureAttended;
  const projectedDelivered = delivered + futureAttended + futureMissed;
  const deficit = calculateDeficit(projectedAttended, projectedDelivered);
  if (deficit === null) return null;

  return {
    percentage: projectedDelivered ? (projectedAttended / projectedDelivered) * 100 : null,
    deficit,
  };
}

export function calculateStreaks(classDays) {
  let current = 0;
  let longest = null;
  let latestStatus;

  for (const day of classDays) {
    // shortcut: use ERP column order for incomplete start times, revisit if explicit ordering becomes available.
    const ordered = day.every((entry) => entry.startTime !== null)
      ? [...day].sort((a, b) => a.startTime - b.startTime)
      : day;

    for (const { status } of ordered) {
      current = status === "P" ? current + 1 : 0;
      if (status === "P" || status === "A") {
        longest = Math.max(longest ?? 0, current);
      }
      latestStatus = status;
    }
  }

  return {
    current: latestStatus === "P" || latestStatus === "A" ? current : null,
    longest,
  };
}
