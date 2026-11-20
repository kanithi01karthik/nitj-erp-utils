function quantile(sortedPercentages, fraction) {
  // Interpolate at the fractional index between adjacent observations.
  const index = (sortedPercentages.length - 1) * fraction;
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);

  return (
    sortedPercentages[lowerIndex] +
    (sortedPercentages[upperIndex] - sortedPercentages[lowerIndex]) *
      (index - lowerIndex)
  );
}

export function summarizeAttendance(percentages) {
  const count = percentages.length;
  if (count === 0) return null;

  const sorted = [...percentages].sort((a, b) => a - b);
  const q1 = quantile(sorted, 0.25);
  const q3 = quantile(sorted, 0.75);
  const mean =
    percentages.reduce((sum, percentage) => sum + percentage, 0) / count;
  // The report describes all courses in view, so use population variance.
  const squaredDeviations = percentages.reduce(
    (sum, percentage) => sum + (percentage - mean) ** 2,
    0,
  );

  return {
    min: sorted[0],
    q1,
    median: quantile(sorted, 0.5),
    q3,
    max: sorted[count - 1],
    iqr: q3 - q1,
    standardDeviation: Math.sqrt(squaredDeviations / count),
  };
}
