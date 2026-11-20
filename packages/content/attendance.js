import { summarizeAttendance } from "../core/attendance-statistics.mjs";
import { renderAttendanceBoxPlot } from "./attendance-boxplot.js";
import { loadAttendanceHistories } from "./attendance-history.js";
import "./attendance-summary.css";

(function () {
  //TODO: Somehow make this 0.73 for female students and 0.75 for male students.
  const TARGET = 0.75;

  function renderSummary(table, percentages) {
    const summary = document.createElement("section");
    summary.className = "nitj-attendance-summary";

    const heading = document.createElement("h2");
    heading.id = "nitj-attendance-summary-heading";
    heading.textContent = "Attendance summary";
    summary.setAttribute("aria-labelledby", heading.id);

    const count = document.createElement("p");
    const stats = summarizeAttendance(percentages);
    count.textContent = stats
      ? `${percentages.length} ${percentages.length === 1 ? "course" : "courses"}`
      : "No courses with recorded attendance.";
    summary.append(heading, count);

    if (stats) {
      const formatter = new Intl.NumberFormat(undefined, {
        maximumFractionDigits: 1,
      });
      const metrics = [
        ["Minimum", stats.min, "%"],
        ["Q1", stats.q1, "%"],
        ["Median", stats.median, "%"],
        ["Q3", stats.q3, "%"],
        ["Maximum", stats.max, "%"],
        ["IQR", stats.iqr, " pp"],
        ["Std. deviation", stats.standardDeviation, " pp"],
      ];
      const list = document.createElement("dl");

      for (const [label, value, unit] of metrics) {
        const metric = document.createElement("div");
        const term = document.createElement("dt");
        const description = document.createElement("dd");
        term.textContent = label;
        description.textContent = `${formatter.format(value)}${unit}`;
        metric.append(term, description);
        list.appendChild(metric);
      }

      summary.append(list, renderAttendanceBoxPlot(stats, formatter));
    }

    const caption = table.createCaption();
    caption.classList.add("nitj-attendance-summary-caption");
    caption.prepend(summary);
  }

  function run() {
    if (window.location.pathname.includes("attendance_report_detail")) return;
    const tables = document.querySelectorAll(".panel-body table.table");
    if (tables.length < 2) return;
    const table = tables[1];
    const rows = table.querySelectorAll("tr");
    if (!rows.length) return;
    const header = rows[0];
    if (header.innerText.includes("Attendance Deficit")) return;
    const originalColumnCount = header.cells.length;
    const reportHeader = header.lastElementChild;
    for (const label of ["Weekly trend", "Attendance Deficit"]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = label;
      th.style.fontFamily = "Verdana";
      th.style.fontSize = "11px";
      th.style.textAlign = "center";
      header.insertBefore(th, reportHeader);
    }

    const percentages = [];
    const courses = [];
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const cols = row.querySelectorAll("td");
      if (cols.length < 6) {
        if (cols.length === 1 && cols[0].colSpan === originalColumnCount) {
          cols[0].colSpan += 2;
        }
        continue;
      }
      const deliveredText = cols[2].innerText.trim();
      const attendedText = cols[3].innerText.trim();
      const delivered = parseInt(deliveredText, 10);
      const attended = parseInt(attendedText, 10);
      const courseCode = cols[0].innerText.trim();
      const isCourseRow =
        row.parentElement.tagName !== "TFOOT" &&
        cols[0].colSpan === 1 &&
        courseCode !== "" &&
        !/^(grand total|total|overall total|overall)$/i.test(courseCode);
      const hasValidCounts =
        /^\d+$/.test(deliveredText) &&
        /^\d+$/.test(attendedText) &&
        Number.isSafeInteger(delivered) &&
        Number.isSafeInteger(attended) &&
        delivered > 0 &&
        attended <= delivered;
      const detailCell = cols[cols.length - 1];
      const trendCell = document.createElement("td");
      trendCell.className = "nitj-attendance-history";
      row.insertBefore(trendCell, detailCell);
      if (isCourseRow && hasValidCounts) {
        percentages.push((attended / delivered) * 100);
        courses.push({ courseCode, detailCell, trendCell });
      } else {
        trendCell.textContent = "—";
      }

      let value = 0;
      if (attended / delivered >= TARGET) {
        while (attended / (delivered + value + 1) >= TARGET) {
          value++;
        }
      } else {
        while ((attended + value) / (delivered + value) < TARGET) {
          value++;
        }
        value = -value;
      }
      const td = document.createElement("td");
      td.setAttribute("align", "center");
      td.style.color = "#000000";
      td.style.fontFamily = "Verdana";
      td.style.fontSize = "12px";
      td.style.verticalAlign = "middle";
      const badge = document.createElement("span");
      badge.classList.add("label");
      badge.style.fontSize = "12px";
      if (value > 0) {
        badge.classList.add("label-success");
        badge.textContent = value;
      } else if (value === 0) {
        badge.classList.add("label-default");
        badge.textContent = "0";
      } else {
        badge.classList.add("label-danger");
        badge.textContent = value;
      }
      td.appendChild(badge);
      row.insertBefore(td, detailCell);
    }

    renderSummary(table, percentages);
    void loadAttendanceHistories(courses);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
