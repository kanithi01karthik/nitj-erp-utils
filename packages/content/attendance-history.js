import { readAttendanceLectures } from "../core/attendance-details.mjs";
import { getAttendanceTrend, getWeeklyAttendance } from "../core/attendance-trends.mjs";
import "./attendance-history.css";

const SVG_NS = "http://www.w3.org/2000/svg";
const DETAIL_PATH = "/erp/attendance_report_detail.php";
const REQUEST_BATCH_SIZE = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const numberFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 });
const slopeFormat = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 1,
  signDisplay: "exceptZero",
});
const trendLabels = { rising: "↗ Rising", stable: "→ Stable", falling: "↘ Falling" };

function findDetailUrl(cell) {
  for (const link of cell.querySelectorAll("a[href]")) {
    let url;
    try {
      url = new URL(link.getAttribute("href"), document.baseURI);
    } catch {
      continue;
    }
    if (url.origin === window.location.origin && url.pathname === DETAIL_PATH) {
      url.hash = "";
      return url.href;
    }
  }
  return null;
}

function renderSparkline(weeks, trend, label) {
  const width = 76;
  const height = 24;
  const inset = 2;
  const firstWeek = weeks[0].week;
  const span = weeks.at(-1).week - firstWeek;
  const xFor = (elapsed) => span === 0
    ? width / 2
    : inset + (elapsed / span) * (width - 2 * inset);
  const yFor = (percentage) => height - inset - (percentage / 100) * (height - 2 * inset);
  const chart = document.createElementNS(SVG_NS, "svg");
  chart.setAttribute("viewBox", `0 0 ${width} ${height}`);
  chart.setAttribute("width", width);
  chart.setAttribute("height", height);
  chart.setAttribute("role", "img");
  chart.setAttribute("aria-label", label);
  chart.setAttribute("tabindex", "0");

  const title = document.createElementNS(SVG_NS, "title");
  title.textContent = label;
  chart.appendChild(title);

  if (trend) {
    const trendline = document.createElementNS(SVG_NS, "line");
    trendline.setAttribute("x1", xFor(0));
    trendline.setAttribute("x2", xFor(span));
    trendline.setAttribute("y1", yFor(trend.intercept));
    trendline.setAttribute("y2", yFor(trend.intercept + trend.slope * span));
    chart.appendChild(trendline);
  }

  const line = document.createElementNS(SVG_NS, "path");
  chart.appendChild(line);

  const commands = [];
  let previousWeek = firstWeek - 2;
  for (const { week, percentage } of weeks) {
    const x = xFor(week - firstWeek);
    const y = yFor(percentage);
    commands.push(`${week === previousWeek + 1 ? "L" : "M"}${x} ${y}`);
    previousWeek = week;

    const dot = document.createElementNS(SVG_NS, "circle");
    dot.setAttribute("cx", x);
    dot.setAttribute("cy", y);
    dot.setAttribute("r", "1.5");
    chart.appendChild(dot);
  }
  line.setAttribute("d", commands.join(" "));
  return chart;
}

function renderHistory(container, weeks, courseCode) {
  if (!weeks.length) {
    container.textContent = "No marked lectures";
    return;
  }

  const trend = getAttendanceTrend(weeks);
  const badge = document.createElement("span");
  badge.className = "nitj-attendance-momentum";
  badge.textContent = trend ? trendLabels[trend.direction] : "Insufficient data";
  if (trend) badge.dataset.direction = trend.direction;

  const first = numberFormat.format(weeks[0].percentage);
  const last = numberFormat.format(weeks.at(-1).percentage);
  const change = weeks.length === 1
    ? `${first}% in one recorded week.`
    : `${first}% to ${last}% across ${weeks.length} recorded weeks.`;
  const slope = trend
    ? `Dashed trend ${slopeFormat.format(trend.slope)} percentage points per week.`
    : "Trend needs at least three recorded weeks.";
  const label = `Weekly attendance for ${courseCode}. ${change} ${slope}`;
  const description = document.createElement("span");
  description.className = "nitj-attendance-history-description";
  description.setAttribute("aria-hidden", "true");
  description.textContent = label;
  container.replaceChildren(renderSparkline(weeks, trend, label), badge, description);
}

async function loadHistory({ url, container, courseCode }) {
  try {
    const response = await fetch(url, {
      credentials: "same-origin",
      mode: "same-origin",
      redirect: "error",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error("Attendance detail request failed");

    const template = document.createElement("template");
    template.innerHTML = await response.text();
    const lectures = readAttendanceLectures(template.content.querySelector(".panel-body"));
    if (!lectures?.length) throw new Error("Attendance detail table is unavailable");

    renderHistory(container, getWeeklyAttendance(lectures), courseCode);
  } catch {
    container.textContent = "History unavailable";
  }
}

export async function loadAttendanceHistories(courses) {
  const entries = courses.map(({ courseCell, detailCell }) => ({
    courseCell,
    courseCode: courseCell.innerText.trim(),
    url: findDetailUrl(detailCell),
  }));
  const linkCounts = new Map();
  for (const { url } of entries) {
    if (url) linkCounts.set(url, (linkCounts.get(url) ?? 0) + 1);
  }

  const requests = [];
  for (const { courseCell, courseCode, url } of entries) {
    const container = document.createElement("div");
    container.className = "nitj-attendance-history";
    // A shared link cannot identify an individual course's report.
    if (linkCounts.get(url) === 1) {
      container.textContent = "Loading history…";
      requests.push({ url, container, courseCode });
    } else {
      container.textContent = "History unavailable";
    }
    courseCell.appendChild(container);
  }

  for (let start = 0; start < requests.length; start += REQUEST_BATCH_SIZE) {
    await Promise.all(requests.slice(start, start + REQUEST_BATCH_SIZE).map(loadHistory));
  }
}
