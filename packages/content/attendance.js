import {
  calculateDeficit,
  calculateScenario,
  TARGET_PERCENT,
} from "../core/attendance.mjs";

(function () {
  function injectCalculator(table, subjects) {
    if (!subjects.length) return;

    const calculator = document.createElement("details");
    calculator.style.marginBottom = "12px";
    calculator.innerHTML = `
      <summary style="cursor: pointer; font-weight: bold">What if?</summary>
      <div style="display: flex; flex-wrap: wrap; gap: 8px 12px; margin-top: 8px">
        <label style="flex: 1 1 220px; min-width: 0">
          Subject
          <select class="form-control input-sm"></select>
        </label>
        <div style="display: flex; flex: 0 1 292px; gap: 12px; min-width: 0">
          <label style="flex: 1; min-width: 0">
            Classes to attend
            <input class="form-control input-sm" type="number" min="0" step="1" value="0">
          </label>
          <label style="flex: 1; min-width: 0">
            Classes to miss
            <input class="form-control input-sm" type="number" min="0" step="1" value="0">
          </label>
        </div>
      </div>
      <output style="display: block; margin-top: 4px; font-size: inherit; color: inherit" aria-live="polite"></output>`;

    const select = calculator.querySelector("select");
    const inputs = [...calculator.querySelectorAll("input")];
    const output = calculator.querySelector("output");
    for (const subject of subjects) {
      select.add(new Option(subject.name));
    }

    function update() {
      if (inputs.some((input) => !input.validity.valid)) {
        output.textContent = "Enter whole numbers of classes, zero or more.";
        return;
      }

      const { attended, delivered } = subjects[select.selectedIndex];
      const [futureAttended, futureMissed] = inputs.map((input) =>
        input.value === "" ? 0 : input.valueAsNumber,
      );
      const scenario = calculateScenario(
        attended, delivered, futureAttended, futureMissed,
      );
      if (!scenario) {
        output.textContent = "Enter smaller class counts.";
        return;
      }
      if (scenario.percentage === null) {
        output.textContent = "Projected attendance is available once at least one class is counted.";
        return;
      }

      const { deficit } = scenario;
      const rounded = scenario.percentage.toFixed(2);
      const percentage = deficit < 0 && Number(rounded) >= TARGET_PERCENT
        ? `<${TARGET_PERCENT}%`
        : `${rounded}%`;
      const count = Math.abs(deficit);
      const classes = `${count} more ${count === 1 ? "class" : "classes"}`;
      let guidance = `You meet the ${TARGET_PERCENT}% target. Attend the next class to stay there.`;
      if (deficit < 0) {
        guidance = `Attend ${classes} to reach ${TARGET_PERCENT}%.`;
      } else if (deficit > 0) {
        guidance = `You can miss ${classes} and stay at or above ${TARGET_PERCENT}%.`;
      }
      output.textContent = `Projected attendance ${percentage}. ${guidance}`;
    }

    calculator.addEventListener("input", update);
    update();
    // Keep scenario inputs out of any surrounding ERP form.
    (table.closest("form") ?? table).before(calculator);
  }

  function run() {
    if (window.location.pathname.includes("attendance_report_detail")) return;
    const tables = document.querySelectorAll(".panel-body table.table");
    if (tables.length < 2) return;
    const table = tables[1];
    const rows = table.querySelectorAll("tr");
    if (!rows.length) return;
    if (rows[0].innerText.includes("Attendance Deficit")) return;
    const th = document.createElement("th");
    th.textContent = "Attendance Deficit";
    th.style.fontFamily = "Verdana";
    th.style.fontSize = "11px";
    th.style.textAlign = "center";
    rows[0].insertBefore(th, rows[0].children[rows[0].children.length - 1]);
    const subjects = [];
    for (let i = 1; i < rows.length; i++) {
      const cols = rows[i].querySelectorAll("td");
      if (cols.length < 6) continue;
      const delivered = parseInt(cols[2].innerText);
      const attended = parseInt(cols[3].innerText);
      const deficit = calculateDeficit(attended, delivered);
      const title = cols[1].textContent.trim();
      if (deficit !== null && title) {
        const code = cols[0].textContent.trim();
        subjects.push({ name: code ? `${title} (${code})` : title, attended, delivered });
      }
      const value = deficit ?? 0;
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
      rows[i].insertBefore(td, cols[cols.length - 1]);
    }
    injectCalculator(table, subjects);
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", run);
  } else {
    run();
  }
})();
