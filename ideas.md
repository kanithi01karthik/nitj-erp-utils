# DVPD Feature Ideas for NITJ ERP Utils

This document outlines feature and visualization ideas for the **NITJ ERP Utils** browser extension, mapped directly to the **Data Visualization and Prescriptive Data (DVPD)** syllabus. All features are designed to run purely client-side within extension content scripts using data already scraped from `v1.nitj.ac.in/erp/*`, with zero external server or library dependencies (using vanilla JavaScript, SVG, and Canvas).

---

## Table of Contents

- [Unit 1: Introduction, Data Types & Similarity Measures](#unit-1-introduction-data-types--similarity-measures)
  - [1. Data-Type Semantic Badges](#1-data-type-semantic-badges)
  - [2. Subject Attendance Cosine Similarity & Distance Matrix](#2-subject-attendance-cosine-similarity--distance-matrix)
- [Unit 2: Data Gathering, Pre-Processing & Quality](#unit-2-data-gathering-pre-processing--quality)
  - [3. Missing Data & Schedule Anomaly Highlighter](#3-missing-data--schedule-anomaly-highlighter)
  - [4. Normalization & Feature Scaling Toggle](#4-normalization--feature-scaling-toggle)
- [Unit 3: Statistics of Data](#unit-3-statistics-of-data)
  - [5. Five-Number Summary Footbar & IQR](#5-five-number-summary-footbar--iqr)
  - [6. Compact Box-and-Whisker Plot](#6-compact-box-and-whisker-plot)
  - [7. Standard Deviation (±1σ) Band](#7-standard-deviation-1σ-band)
  - [8. Descriptive Statistics Popover](#8-descriptive-statistics-popover)
- [Unit 4: Prescriptive Analytics & Projections](#unit-4-prescriptive-analytics--projections)
  - [9. Linear Regression Trendline & Momentum](#9-linear-regression-trendline--momentum)
  - [10. "What-If" Scenario Optimizer (Bunk / Recovery Calculator)](#10-what-if-scenario-optimizer-bunk--recovery-calculator)
- [Unit 5: Data Visualization Typology & Tufte Principles](#unit-5-data-visualization-typology--tufte-principles)
  - [11. GitHub-Style Intensity Heatmap Calendar (Implemented)](#11-github-style-intensity-heatmap-calendar-implemented)
  - [12. 10×10 Waffle Chart](#12-1010-waffle-chart)
  - [13. High-Density Inline Sparklines](#13-high-density-inline-sparklines)
  - [14. Interactive Multidimensional Bubble Plot](#14-interactive-multidimensional-bubble-plot)
  - [15. Topic Frequency Word Cloud](#15-topic-frequency-word-cloud)
  - [16. Cumulative Stacked Area Chart](#16-cumulative-stacked-area-chart)
  - [17. Semi-Circular Safety Gauge](#17-semi-circular-safety-gauge)
  - [18. Attendance Streak Counter (Run-Length Encoding)](#18-attendance-streak-counter-run-length-encoding)
  - [19. Tufte "Data-Ink Maximizer" Mode Toggle](#19-tufte-data-ink-maximizer-mode-toggle)
- [Recommended Implementation Roadmap](#recommended-implementation-roadmap)

---

## Unit 1: Introduction, Data Types & Similarity Measures

### 1. Data-Type Semantic Badges
* **Syllabus Mapping**: *Data Types: Nominal, Binary, Ordinal, Numeric, Discrete, Continuous*.
* **Concept**: Classify every column and data field in the ERP attendance and grades tables by its mathematical data scale:
  * Attendance Count $\rightarrow$ **Discrete Numeric**
  * Attendance % $\rightarrow$ **Continuous Ratio**
  * Present / Absent $\rightarrow$ **Binary**
  * Letter Grades (A+, A, B) $\rightarrow$ **Ordinal**
  * Subject Name / Code $\rightarrow$ **Nominal**
* **UI**: Subtle, colored pill tags next to column headers and cells that display a tooltip explaining why the metric falls into that data classification.
* **Technical Complexity**: Low (pure DOM badge injection).

### 2. Subject Attendance Cosine Similarity & Distance Matrix
* **Syllabus Mapping**: *Similarity & Distance Measures (Euclidean Distance, Cosine Similarity)*.
* **Concept**: Vectorize each subject's day-by-day attendance history into binary vectors $\mathbf{u}, \mathbf{v} \in \{0, 1\}^D$ (where $1 = \text{Present}$, $0 = \text{Absent}$ across the date span). Calculate pairwise Cosine Similarity:
  $$\text{Cosine Similarity} = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\|_2 \|\mathbf{v}\|_2}$$
  and Euclidean Distance:
  $$d(\mathbf{u}, \mathbf{v}) = \sqrt{\sum_{i=1}^D (u_i - v_i)^2}$$
* **UI**: A small dropdown or collapsible card showing which subjects have the highest behavioral correlation (e.g., *"Subject A and Subject B attendance share 89% similarity"*).
* **Technical Complexity**: Medium (in-memory vector dot-products).

---

## Unit 2: Data Gathering, Pre-Processing & Quality

### 3. Missing Data & Schedule Anomaly Highlighter
* **Syllabus Mapping**: *Data Quality, Consistency checking, Heterogeneous and missing data, Noise elimination*.
* **Concept**: Passively validates tabular lecture records against standard university scheduling heuristics to identify:
  * Missing delivery records (e.g. gaps between logged dates).
  * Duplicate lecture records logged with identical timestamps.
  * Off-schedule or weekend classes.
* **UI**: Non-intrusive warning badge (`⚠️ Data Anomaly`) on affected rows with an explanatory popover detailing the inconsistency.
* **Technical Complexity**: Low (date parsing and interval threshold checking).

### 4. Normalization & Feature Scaling Toggle
* **Syllabus Mapping**: *Data Transformation, Normalization (Min-Max Scaling, Z-Score Standardisation)*.
* **Concept**: A quick-toggle control on the attendance table that dynamically transforms raw attendance percentages into normalized scales:
  * **Raw Scale**: $x \in [0, 100]\%$
  * **Min-Max Normalized**:
    $$x_{\text{norm}} = \frac{x - x_{\min}}{x_{\max} - x_{\min}} \in [0, 1]$$
  * **Z-Score Standardized**:
    $$z = \frac{x - \mu}{\sigma}$$
    (showing how many standard deviations above or below your subject average a given course sits).
* **UI**: Segmented button pills: `[ Raw % | Min-Max | Z-Score ]`.
* **Technical Complexity**: Low (in-place text swap).

---

## Unit 3: Statistics of Data

### 5. Five-Number Summary Footbar & IQR
* **Syllabus Mapping**: *Measures of Central Tendency (Mean, Median, Mode); Measures of Dispersion (Variance, Standard Deviation, Range, Quartiles, Percentiles)*.
* **Concept**: A statistical summary bar attached to the bottom of the aggregate attendance table computing:
  * Minimum ($\text{Min}$)
  * First Quartile ($Q_1$, 25th percentile)
  * Median ($Q_2$, 50th percentile)
  * Third Quartile ($Q_3$, 75th percentile)
  * Maximum ($\text{Max}$)
  * Interquartile Range ($\text{IQR} = Q_3 - Q_1$)
  * Standard Deviation ($\sigma$)
* **UI**: A compact footer card matching the dark theme layout.
* **Technical Complexity**: Low (sorting and quartile math).

### 6. Compact Box-and-Whisker Plot
* **Syllabus Mapping**: *Boxplot, Statistical graphics, Outlier detection*.
* **Concept**: Generates an inline horizontal SVG box plot visualizing the distribution of attendance percentages across all enrolled subjects:
  * Shaded box covering $Q_1$ to $Q_3$.
  * Prominent median bar.
  * Whiskers extending to $\text{Max}(x_{\min}, Q_1 - 1.5 \times \text{IQR})$ and $\text{Min}(x_{\max}, Q_3 + 1.5 \times \text{IQR})$.
  * Individual point markers for statistical outliers outside the whiskers.
* **UI**: Embedded right beside the overall percentage badge on `attendance_report.php`.
* **Technical Complexity**: Low–Medium (pure SVG path generation).

### 7. Standard Deviation (±1σ) Band
* **Syllabus Mapping**: *Variance, Standard Deviation, Dispersion*.
* **Concept**: Overlays a shaded $\pm 1\sigma$ band around your aggregate subject mean $\mu$. Subjects falling outside the band are instantly identified as high-volatility or high-risk.
* **Technical Complexity**: Low.

### 8. Descriptive Statistics Popover
* **Syllabus Mapping**: *Descriptive Statistics*.
* **Concept**: Hovering over any subject row exposes an interactive statistical card showing lecture count, mean frequency per week, standard deviation, and variance.
* **Technical Complexity**: Low.

---

## Unit 4: Prescriptive Analytics & Projections

### 9. Linear Regression Trendline & Momentum
* **Syllabus Mapping**: *Regression, Prescriptive Analytics, Time-series insight finding*.
* **Concept**: Computes Ordinary Least Squares (OLS) linear regression over cumulative lecture attendance dates $(t_i, y_i)$:
  $$\text{Slope } m = \frac{N\sum t_i y_i - \sum t_i \sum y_i}{N\sum t_i^2 - (\sum t_i)^2}$$
  Categorizes trajectory into momentum classes:
  * $m > 0$: ↗ **Upward Momentum**
  * $m \approx 0$: → **Stable Attendance**
  * $m < 0$: ↘ **Declining Trajectory (Burnout Warning)**
* **UI**: Directional arrow pill tag + estimated end-of-semester percentage projection based on trend.
* **Technical Complexity**: Low (closed-form OLS calculation).

### 10. "What-If" Scenario Optimizer (Bunk / Recovery Calculator)
* **Syllabus Mapping**: *Prescriptive Analytics, Designing experiment scenarios*.
* **Concept**: Prescriptive simulation calculator:
  * *"If I miss the next $k$ lectures, my attendance drops to $X\%$."*
  * *"To recover to $75\%$ or $80\%$, I must attend the next $N$ classes consecutively."*
  Formula:
  $$N_{\text{needed}} = \left\lceil \frac{\text{Target} \times D - A}{1 - \text{Target}} \right\rceil$$
* **UI**: Integrated card with quick increment stepper buttons (`+1`, `+3`, `+5 classes`) and custom number inputs.
* **Technical Complexity**: Low.

---

## Unit 5: Data Visualization Typology & Tufte Principles

### 11. GitHub-Style Intensity Heatmap Calendar (Implemented)
* **Syllabus Mapping**: *Visualization Typology, Density Matrices, Visual Storytelling*.
* **Concept**: 5-tier diverging color scale based on daily lecture attendance ratio:
  * $100\%$ Attended $\rightarrow$ Deep Green (`.nitj-heat-p4`)
  * $60\%–99\%$ Attended $\rightarrow$ Light Green (`.nitj-heat-p3`)
  * $40\%–59\%$ Attended $\rightarrow$ Amber/Mixed (`.nitj-heat-mid`)
  * $1\%–39\%$ Attended $\rightarrow$ Light Red (`.nitj-heat-a3`)
  * $0\%$ Attended $\rightarrow$ Deep Red (`.nitj-heat-a4`)
* **Status**: **Fully implemented and merged into `main`!**

### 12. 10×10 Waffle Chart
* **Syllabus Mapping**: *Waffle charts, Visualization Typology, Data-ink ratio*.
* **Concept**: A $10 \times 10$ grid of 100 rounded tiles representing aggregate percentage. For example, $78\%$ attendance displays 78 green tiles and 22 red tiles, offering significantly superior cognitive perception compared to circular pie charts.
* **UI**: Placed on the main dashboard sidebar or header.
* **Technical Complexity**: Very Low (pure CSS grid).

### 13. High-Density Inline Sparklines
* **Syllabus Mapping**: *Tufte's Design Principles (Sparklines, High Data Density)*.
* **Concept**: Word-sized, high-density SVG line graphs embedded inside each table row. Displays the semester trajectory (attendance dips and recoveries) without axes, labels, or decorative borders.
* **UI**: Embedded directly next to the subject code column.
* **Technical Complexity**: Low (SVG `<polyline>`).

### 14. Interactive Multidimensional Bubble Plot
* **Syllabus Mapping**: *Bubble-plot, Multidimensional Visualization*.
* **Concept**: A 2D bubble chart plotting:
  * **X-Axis**: Classes Delivered (Class Volume)
  * **Y-Axis**: Attendance %
  * **Bubble Radius**: Total Subject Credits
  * **Bubble Color**: Green ($>75\%$) vs. Red ($<75\%$)
  * **Quadrant lines**: Safe zone vs. Deficit zone.
* **UI**: Interactive SVG or Canvas modal/toggle on `attendance_report.php`.
* **Technical Complexity**: Medium.

### 15. Topic Frequency Word Cloud
* **Syllabus Mapping**: *Word clouds, Unstructured text data visualization*.
* **Concept**: Scrapes the lecture topics recorded in the detailed attendance view, cleans common stop-words, and renders an SVG/Canvas word cloud where font size is proportional to topic frequency (e.g. *Graph*, *Trees*, *Sort*, *Matrix*).
* **UI**: Collapsible tab inside the calendar view header.
* **Technical Complexity**: Medium.

### 16. Cumulative Stacked Area Chart
* **Syllabus Mapping**: *Area-plot, Time series graphics*.
* **Concept**: Displays cumulative classes held over time with two stacked colored areas: bottom band = Attended Lectures (Green), top band = Absent Lectures (Red).
* **UI**: Modal or toggleable view in `attendance_report_detail.php`.
* **Technical Complexity**: Medium (SVG `<path>` area fill).

### 17. Semi-Circular Safety Gauge
* **Syllabus Mapping**: *Dashboard Design, Visual Storytelling*.
* **Concept**: An SVG speedometer gauge with distinct color arcs:
  * $<70\%$: Red (Deficit)
  * $70\%–75\%$: Yellow (Warning)
  * $>75\%$: Green (Safe)
  Animated needle pointing to current aggregate attendance.
* **Technical Complexity**: Low–Medium.

### 18. Attendance Streak Counter (Run-Length Encoding)
* **Syllabus Mapping**: *Discrete sequence analysis, Gestalt's Law of Continuity*.
* **Concept**: Calculates your active unbroken streak of attended lectures, plus the maximum historical streak of the semester (e.g. `🔥 14 Classes Attended in a Row!`).
* **Technical Complexity**: Very Low (simple array loop).

### 19. Tufte "Data-Ink Maximizer" Mode Toggle
* **Syllabus Mapping**: *Tufte's Design Principles, Data-Ink Ratio, Gestalt's Laws*.
* **Concept**: A toggle switch that strips all heavy Bootstrap borders, zebra striping, saturated backgrounds, and visual noise—leaving only high data-ink typography, clean white space, and minimalist sparklines.
* **UI**: Toggle switch: `[ Data-Ink Mode: ON / OFF ]`.
* **Technical Complexity**: Low (CSS class toggle).

---

## Recommended Implementation Roadmap

| Batch | Features Included | Primary Focus | Effort |
| :--- | :--- | :--- | :--- |
| **Batch 1 (Quick Wins)** | #10 "What-If" Calculator<br>#12 Waffle Chart<br>#18 Streak Counter | High daily student utility, immediate visual pop | 1–2 hours |
| **Batch 2 (Core Statistics)** | #5 Five-Number Summary<br>#9 Linear Regression Momentum<br>#13 Inline Sparklines | Pure Units 3 & 4 mathematical depth and Tufte design | 2–3 hours |
| **Batch 3 (Advanced Charts)** | #6 Boxplot<br>#14 Bubble Plot<br>#15 Topic Word Cloud | Rich visual presentation for project / portfolio showcasing | 3–4 hours |
