import { calculateStreaks } from "../core/attendance.mjs";

(function () {
  const STORAGE_KEY = "nitj-att-calendar-view";

  function shouldRun() {
    return (
      window.location.href.includes("attendance_report_detail.php") ||
      document.title.includes("Attendance Report")
    );
  }

  function getSavedView() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "calendar";
    } catch {
      return "calendar";
    }
  }

  function saveView(view) {
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {}
  }

  function getSemesterInfo(label) {
    const text = (label || "").toLowerCase();
    const firstHalf = text.includes("january-june");
    const secondHalf = text.includes("july to december");
    const yearMatch = label?.match(/20\d{2}/g);
    const fallbackYear = new Date().getFullYear();
    const year = yearMatch
      ? Number(yearMatch[yearMatch.length - 1])
      : fallbackYear;

    return {
      label:
        label ||
        (firstHalf
          ? `January-June ${year}`
          : secondHalf
            ? `July to December ${year}`
            : `${year}`),
      monthRange: firstHalf
        ? [0, 1, 2, 3, 4, 5]
        : secondHalf
          ? [6, 7, 8, 9, 10, 11]
          : null,
    };
  }

  function setView(view) {
    const calendar = document.getElementById("nitj-att-calendar");
    const toggle = document.getElementById("nitj-view-toggle");
    if (!calendar || !toggle) return;

    const isCalendar = view === "calendar";
    calendar.hidden = !isCalendar;
    toggle.textContent = isCalendar ? "Normal view" : "Calendar view";
    toggle.setAttribute("aria-pressed", isCalendar ? "true" : "false");
    saveView(view);
  }

  function getClassStart(text) {
    const match = text.match(/\b(0?[1-9]|1[0-2]):([0-5]\d)\s*([AP]M)\b/i);
    if (!match) return null;
    const [, hour, minute, period] = match;
    return (Number(hour) % 12) * 60 + Number(minute) +
      (period.toUpperCase() === "PM" ? 720 : 0);
  }

  function escapeText(text) {
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  function injectCalendar() {
    if (document.getElementById("nitj-att-calendar")) return true;

    const panel = document.querySelector(".panel-body");
    if (!panel) return false;

    // ── 1. SCRAPE DATA ───────────────────────────────────────────
    const detailTable =
      panel.querySelector("table.table-bordered.table-striped") ||
      panel.querySelector("table.table-striped") ||
      panel.querySelectorAll("table")[1];
    if (!detailTable) return false;

    const headers = [...detailTable.querySelectorAll("thead tr th")];
    const cells = [...detailTable.querySelectorAll("tbody tr:first-child td")];
    const topicCells = [
      ...detailTable.querySelectorAll("tbody tr:nth-child(2) td"),
    ];

    const classes = [];
    for (let i = 1; i < headers.length - 3; i++) {
      const hdr = headers[i];
      const dateText =
        hdr.querySelector(".label-primary")?.textContent.trim() ?? "";
      const typeText = hdr.querySelector("b")?.textContent.trim() ?? "";
      const cell = cells[i - 1];
      const status = cell?.querySelector(".label-success")
        ? "P"
        : cell?.querySelector(".label-danger")
          ? "A"
          : "?";
      const topic =
        topicCells[i - 1]?.textContent.replace(/\s+/g, " ").trim() ?? "";
      if (dateText) {
        classes.push({
          date: parseDate(dateText),
          startTime: getClassStart(hdr.innerText),
          type: typeText,
          status,
          topic,
        });
      }
    }

    const attended =
      parseInt(
        document.querySelector(".label-primary[style*='14px']")?.textContent,
      ) || 0;
    const delivered =
      parseInt(
        document.querySelector(".label-default[style*='14px']")?.textContent,
      ) || 0;
    const pct = delivered > 0 ? Math.round((attended / delivered) * 100) : 0;

    const semesterCell =
      panel.querySelector("table tbody tr td:nth-child(1)") ?? null;
    const anchor = semesterCell?.closest("div") ?? panel.firstElementChild;
    if (!anchor) return false;

    // ── 2. GROUP BY MONTH ────────────────────────────────────────
    function parseDate(str) {
      const [d, m, y] = str.split("-");
      return new Date(`${m} ${d} ${y}`);
    }

    const months = {};
    classes.forEach((c) => {
      const dt = c.date;
      const key = `${dt.getFullYear()}-${dt.getMonth()}`;
      if (!months[key])
        months[key] = {
          year: dt.getFullYear(),
          month: dt.getMonth(),
          days: {},
        };
      const day = dt.getDate();
      if (!months[key].days[day]) months[key].days[day] = [];
      months[key].days[day].push(c);
    });

    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    // ── 3. BUILD MONTH ───────────────────────────────────────────
    function buildMonth(year, month, daysMap) {
      const firstDay = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      let html = `<div class="nitj-cal-month">
        <div class="nitj-cal-month-title">${MONTH_NAMES[month]} ${year}</div>
        <div class="nitj-cal-dow-row">${DAY_NAMES.map((d) => `<span>${d}</span>`).join("")}</div>
        <div class="nitj-cal-grid">`;

      for (let i = 0; i < firstDay; i++)
        html += `<div class="nitj-cal-empty"></div>`;

      for (let d = 1; d <= daysInMonth; d++) {
        const cls = daysMap[d];
        let cellClass = "nitj-cal-day";
        let status = "";
        let dot = "";
        let tooltip = "";

        if (cls) {
          const allP = cls.every((c) => c.status === "P");
          const allA = cls.every((c) => c.status === "A");
          cellClass += allP ? " nitj-p" : allA ? " nitj-a" : " nitj-mixed";
          status = allP ? "P" : allA ? "A" : "M";
          dot =
            cls.length > 1
              ? `<span class="nitj-multi">${cls.length}</span>`
              : "";

          const rows = cls
            .map(
              (c) => `
            <span class="nitj-tt-row">
              <span class="nitj-tt-topic">${escapeText(c.topic || c.type)}</span>
            </span>`,
            )
            .join("");
          tooltip = `<div class="nitj-tooltip">${rows}</div>`;
        }

        const statusMark = status ? `<span class="nitj-cal-status">${status}</span>` : "";
        const focusable = cls ? ' tabindex="0"' : "";
        html += `<div class="${cellClass}"${focusable}>${d}${statusMark}${dot}${tooltip}</div>`;
      }

      html += `</div></div>`;
      return html;
    }

    // ── 4. INJECT CSS ────────────────────────────────────────────
    if (!document.getElementById("nitj-cal-styles")) {
      const style = document.createElement("style");
      style.id = "nitj-cal-styles";
      style.textContent = `
        #nitj-att-calendar {
          background: var(--nitj-surface);
          color: var(--nitj-ink);
          border: 1px solid var(--nitj-line);
          border-radius: 10px;
          padding: 16px;
          margin: 16px 0;
          font-family: inherit;
        }
        .nitj-cal-header {
          display: flex; justify-content: space-between; align-items: center;
          font-size: 15px; font-weight: bold; margin-bottom: 10px;
          color: var(--nitj-ink);
        }
        .nitj-cal-toolbar {
          display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px 12px;
          margin-bottom: 10px;
        }
        .nitj-term-label {
          font-size: 12px; font-weight: normal;
          color: var(--nitj-secondary); margin-left: 10px;
        }
        .nitj-pct { font-size: 18px; font-weight: bold; }
        .nitj-pct-ok   { color: var(--nitj-success); }
        .nitj-pct-warn { color: var(--nitj-warning); }
        .nitj-view-toggle {
          border: 1px solid var(--nitj-control);
          background: var(--nitj-raised);
          color: var(--nitj-ink);
          border-radius: 999px; padding: 6px 12px; font-size: 12px;
          cursor: pointer; font-family: inherit;
        }
        .nitj-view-toggle:hover { background: var(--nitj-hover); }
        .nitj-cal-stats {
          display: flex; gap: 16px; flex-wrap: wrap;
          font-size: 12px; color: var(--nitj-secondary); margin-bottom: 14px;
        }
        .nitj-cal-stats b { color: var(--nitj-ink); }
        .nitj-legend { display: flex; align-items: center; gap: 5px; }
        .nitj-legend-mark {
          width: 10px; height: 10px; border-radius: 50%; display: inline-block;
        }
        .nitj-dot-p { background: var(--nitj-success); }
        .nitj-dot-a { background: var(--nitj-missed); }
        .nitj-dot-m { background: var(--nitj-warning); }
        .nitj-cal-months {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr));
          gap: 16px;
        }
        .nitj-cal-month {
          background: var(--nitj-raised);
          border: 1px solid var(--nitj-line);
          border-radius: 8px; padding: 10px;
        }
        .nitj-cal-month-title {
          font-size: 13px; font-weight: bold; color: var(--nitj-blue);
          text-align: center; margin-bottom: 8px;
        }
        .nitj-cal-dow-row {
          display: grid; grid-template-columns: repeat(7, 1fr);
          font-size: 10px; color: var(--nitj-secondary);
          text-align: center; margin-bottom: 4px;
        }
        .nitj-cal-grid {
          display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px;
        }
        .nitj-cal-day, .nitj-cal-empty {
          height: 26px; border-radius: 4px;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; position: relative; overflow: visible;
        }
        .nitj-cal-day {
          color: var(--nitj-secondary);
          background: var(--nitj-input);
        }
        .nitj-p     { background: var(--nitj-success-bg); color: var(--nitj-success); font-weight: bold; }
        .nitj-a     { background: var(--nitj-danger-bg); color: var(--nitj-danger); font-weight: bold; }
        .nitj-mixed { background: var(--nitj-warning-bg); color: var(--nitj-warning); font-weight: bold; }
        .nitj-cal-status { font-size: 9px; margin-inline-start: 2px; }
        .nitj-multi {
          position: absolute; top: 0; right: 2px;
          font-size: 8px;
        }

        /* ── Tooltip ─────────────────────────────────────────── */
        .nitj-tooltip {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          background: var(--nitj-tooltip);
          border: 1px solid var(--nitj-tooltip-border);
          border-radius: 6px;
          padding: 7px 10px;
          min-width: 150px;
          max-width: 220px;
          z-index: 9999;
          box-shadow: var(--nitj-tooltip-shadow);
          flex-direction: column;
          gap: 5px;
        }
        .nitj-cal-day:not([data-nitj-tooltip-dismissed]):is(:hover, :focus) .nitj-tooltip { display: flex; }
        .nitj-cal-day:focus-visible {
          z-index: 1;
          outline: 2px solid var(--nitj-focus);
          outline-offset: 1px;
        }
        .nitj-cal-day:nth-child(7n + 1) .nitj-tooltip,
        .nitj-cal-day:nth-child(7n + 2) .nitj-tooltip {
          left: 0;
          transform: none;
        }
        .nitj-cal-day:nth-child(7n) .nitj-tooltip,
        .nitj-cal-day:nth-child(7n + 6) .nitj-tooltip {
          left: auto;
          right: 0;
          transform: none;
        }
        .nitj-tt-row { display: flex; flex-direction: column; gap: 2px; }
        .nitj-tt-row + .nitj-tt-row { border-top: 1px solid var(--nitj-line); padding-top: 5px; }
        .nitj-tt-topic { font-size: 11px; color: var(--nitj-ink); line-height: 1.4; overflow-wrap: anywhere; }

        #nitj-view-controls { margin: 16px 0 10px; }
        #nitj-view-controls, #nitj-att-calendar { color: var(--nitj-ink); }

        .nitj-streaks {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(min(100%, 156px), 1fr));
          gap: 8px;
          max-width: 384px;
          margin: 0;
        }
        .nitj-streak {
          --nitj-streak-tone: var(--nitj-success);
          position: relative;
          min-width: 0;
          padding: 10px 12px 10px 50px;
          border: 1px solid var(--nitj-line);
          border-radius: 10px;
          background: var(--nitj-card);
          color: var(--nitj-ink);
          overflow-wrap: anywhere;
        }
        .nitj-streak--longest { --nitj-streak-tone: var(--nitj-blue); }
        .nitj-streak--empty { --nitj-streak-tone: var(--nitj-secondary); }
        .nitj-streak dt {
          color: var(--nitj-secondary);
          font-size: 12px;
          font-weight: 600;
        }
        .nitj-streak dd {
          margin: 2px 0 0;
          font-size: 18px;
          font-variant-numeric: tabular-nums;
          font-weight: 700;
          line-height: 1.2;
        }
        .nitj-streak--empty dd {
          color: var(--nitj-secondary);
          font-size: 14px;
        }
        .nitj-streak-icon {
          position: absolute;
          top: 50%;
          inset-inline-start: 11px;
          display: grid;
          place-items: center;
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: color-mix(in srgb, var(--nitj-streak-tone) 14%, transparent);
          color: var(--nitj-streak-tone);
          transform: translateY(-50%);
        }
        .nitj-streak-icon::before {
          grid-area: 1 / 1;
          width: 6px;
          height: 11px;
          border: solid currentColor;
          border-width: 0 2px 2px 0;
          transform: translateY(-1px) rotate(45deg);
          content: "";
        }
        .nitj-streak--longest .nitj-streak-icon::before {
          width: 8px;
          height: 8px;
          border-width: 2px 2px 0 0;
          transform: translateY(-3px) rotate(-45deg);
        }
        .nitj-streak--longest .nitj-streak-icon::after {
          grid-area: 1 / 1;
          width: 2px;
          height: 12px;
          background: currentColor;
          content: "";
        }
      `;
      document.head.appendChild(style);
    }

    // ── 5. RENDER ────────────────────────────────────────────────
    const semesterLabel = semesterCell?.textContent.trim() || "";
    const semesterInfo = getSemesterInfo(semesterLabel);

    const renderedMonths = Object.values(months)
      .filter((m) =>
        semesterInfo.monthRange
          ? semesterInfo.monthRange.includes(m.month)
          : true,
      )
      .sort((a, b) => a.year - b.year || a.month - b.month);

    const classDays = classes.some(({ date }) => Number.isNaN(date.getTime()))
      ? []
      : renderedMonths.flatMap(({ days }) => Object.values(days));
    const streaks = calculateStreaks(classDays);
    const streakCard = (label, count, variant) => `
      <div class="nitj-streak nitj-streak--${variant}${count === null ? " nitj-streak--empty" : ""}">
        <dt><span class="nitj-streak-icon" aria-hidden="true"></span>${label}</dt>
        <dd>${count === null ? "Unavailable" : `${count} ${count === 1 ? "class" : "classes"}`}</dd>
      </div>`;

    const shellHTML = `
      <div id="nitj-calendar-shell">
        <div id="nitj-view-controls">
          <div class="nitj-cal-toolbar">
            <div class="nitj-cal-header">
              <span class="nitj-pct ${pct >= 75 ? "nitj-pct-ok" : "nitj-pct-warn"}">${pct}%</span>
              <span class="nitj-term-label">${escapeText(semesterInfo.label)}</span>
            </div>
            <button id="nitj-view-toggle" type="button" class="nitj-view-toggle" aria-pressed="true">
              Normal view
            </button>
          </div>
          <dl class="nitj-streaks">
            ${streakCard("Current Streak", streaks.current, "current")}
            ${streakCard("Longest Streak", streaks.longest, "longest")}
          </dl>
        </div>
        <div id="nitj-att-calendar" hidden>
          <div class="nitj-cal-stats">
            <span>Total classes: <b>${delivered}</b></span>
            <span>Attended: <b>${attended}</b></span>
            <span>Absent: <b>${delivered - attended}</b></span>
            <span class="nitj-legend"><span class="nitj-legend-mark nitj-dot-p"></span>P Present</span>
            <span class="nitj-legend"><span class="nitj-legend-mark nitj-dot-a"></span>A Absent</span>
            <span class="nitj-legend"><span class="nitj-legend-mark nitj-dot-m"></span>M Mixed or unmarked</span>
          </div>
          <div class="nitj-cal-months">
            ${renderedMonths.map((m) => buildMonth(m.year, m.month, m.days)).join("")}
          </div>
        </div>
      </div>`;

    anchor.insertAdjacentHTML("afterend", shellHTML);

    const calendar = document.getElementById("nitj-att-calendar");
    const resetTooltip = (event) => {
      const day = event.target.closest("[data-nitj-tooltip-dismissed]");
      if (day && !day.contains(event.relatedTarget)) delete day.dataset.nitjTooltipDismissed;
    };
    calendar.addEventListener("pointerout", resetTooltip);
    calendar.addEventListener("focusout", resetTooltip);
    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      for (const day of calendar.querySelectorAll(".nitj-cal-day[tabindex]:is(:focus, :hover)")) {
        day.dataset.nitjTooltipDismissed = "";
      }
    });

    const toggle = document.getElementById("nitj-view-toggle");
    if (toggle && !toggle.dataset.bound) {
      toggle.dataset.bound = "true";
      toggle.addEventListener("click", () => {
        const nextView =
          document.getElementById("nitj-att-calendar")?.hidden === true
            ? "calendar"
            : "normal";
        setView(nextView);
      });
    }

    setView(getSavedView());
    return true;
  }

  function boot() {
    if (!shouldRun()) return;
    if (injectCalendar()) return;

    const observer = new MutationObserver(() => {
      if (injectCalendar()) observer.disconnect();
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
