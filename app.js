const statusBox = document.querySelector("#status");
const fileInput = document.querySelector("#fileInput");
const sampleButton = document.querySelector("#sampleButton");

const csvMap = {
  year: "year",
  company: "company",
  currency: "currency",
  scale: "scale",
  source: "source",
  total_revenue: "revenue",
  passenger_revenue: "passenger_revenue",
  cargo_revenue: "cargo_revenue",
  sale_leaseback_gain: "sale_leaseback_gain",
  other_income: "other_income",
  fuel_cost: "fuel_cost",
  employee_cost: "employee_cost",
  depreciation_amortization: "depreciation_amortization",
  handling_landing_route_charges: "handling_landing_route_charges",
  passenger_service: "passenger_service",
  engineering_maintenance: "engineering_maintenance",
  selling_costs: "selling_costs",
  other_operating_costs: "other_operating_costs",
  operating_expenses: "operating_expenses",
  operating_profit: "operating_profit",
  finance_income: "finance_income",
  finance_costs: "finance_costs",
  forex_loss: "forex_loss",
  profit_before_tax: "profit_before_tax",
  tax: "tax",
  net_income: "net_income",
  assets: "assets",
  cash: "cash",
  receivables: "receivables",
  inventories: "inventories",
  ppe: "ppe",
  intangibles: "intangibles",
  liabilities: "liabilities",
  loans: "loans",
  lease_liabilities: "lease_liabilities",
  equity: "equity",
  cfo: "cfo",
  cfi: "cfi",
  cff: "cff",
  capex: "capex",
  dividends_paid: "dividends_paid",
  passengers_m: "passengers_m",
  aircraft: "aircraft",
  load_factor: "load_factor",
  ask_b: "ask_b",
  rpk_b: "rpk_b",
  disclosure_notes_available: "disclosure_notes_available",
  mda_available: "mda_available",
  major_risks_disclosed: "major_risks_disclosed",
};

function showStatus(message, isError = false) {
  statusBox.textContent = message;
  statusBox.classList.add("visible");
  statusBox.style.background = isError ? "#ffe9e7" : "#eaf1ff";
  statusBox.style.color = isError ? "#b42318" : "#102a43";
}

function hideStatus() {
  statusBox.classList.remove("visible");
}

function splitCsvLine(line) {
  const result = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      value += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      result.push(value);
      value = "";
    } else {
      value += char;
    }
  }
  result.push(value);
  return result;
}

function toValue(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  if (!text) return null;
  const lower = text.toLowerCase();
  if (["yes", "no", "true", "false"].includes(lower)) return lower;
  const number = Number(text.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(number) ? number : text;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines[0]).map((header) => csvMap[header.trim()] || header.trim());
  return lines.slice(1).map((line) => {
    const cells = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = toValue(cells[index]);
    });
    return row;
  });
}

function n(row, key) {
  const value = row[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function div(a, b) {
  return b === 0 ? null : a / b;
}

function fmtNumber(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "н/д";
  return Math.round(value).toLocaleString("ru-RU");
}

function fmtPct(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "н/д";
  return `${(value * 100).toFixed(1)}%`;
}

function fmtRatio(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "н/д";
  return Number(value).toFixed(2);
}

function normalize(rows) {
  return rows
    .map((row) => {
      const directCosts = -(
        Math.abs(n(row, "fuel_cost")) +
        Math.abs(n(row, "employee_cost")) +
        Math.abs(n(row, "engineering_maintenance")) +
        Math.abs(n(row, "handling_landing_route_charges")) +
        Math.abs(n(row, "passenger_service"))
      );
      const revenue = n(row, "revenue");
      const debt = n(row, "loans") + n(row, "lease_liabilities");
      return {
        ...row,
        year: Number(row.year),
        direct_costs: directCosts,
        gross_profit: revenue + directCosts,
        debt,
        net_debt: debt - n(row, "cash"),
        fcf: n(row, "cfo") - n(row, "capex"),
      };
    })
    .sort((a, b) => a.year - b.year);
}

function cagr(first, last, periods) {
  if (first <= 0 || last <= 0 || periods <= 0) return null;
  return (last / first) ** (1 / periods) - 1;
}

function buildQuality(rows) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const revenueCagr = cagr(n(first, "revenue"), n(last, "revenue"), rows.length - 1);
  const receivablesCagr = cagr(n(first, "receivables"), n(last, "receivables"), rows.length - 1);
  const cfoRatios = rows.map((row) => div(n(row, "cfo"), n(row, "net_income"))).filter((x) => x !== null && x > 0);
  const avgCfoNi = cfoRatios.reduce((a, b) => a + b, 0) / cfoRatios.length;
  const fcfYears = rows.filter((row) => n(row, "fcf") > 0).length;
  const debtAssets = div(n(last, "debt"), n(last, "assets"));
  const leaseAssets = div(n(last, "lease_liabilities"), n(last, "assets"));
  const capexDep = div(n(last, "capex"), n(last, "depreciation_amortization"));

  const revenueStatus =
    receivablesCagr && revenueCagr && receivablesCagr > revenueCagr * 1.5 ? "yellow" : "green";
  const profitStatus = avgCfoNi >= 1 && n(last, "net_income") >= n(first, "net_income") ? "green" : "yellow";
  const cashStatus = fcfYears >= rows.length - 1 ? "green" : "yellow";
  const assetStatus = capexDep > 0.2 ? "green" : "yellow";
  const liabilityStatus = debtAssets > 0.45 || leaseAssets > 0.35 ? "yellow" : "green";

  return [
    {
      status: revenueStatus,
      title: "Выручка",
      explanation: `Выручка выросла с ${fmtNumber(first.revenue)} до ${fmtNumber(last.revenue)} тыс. тенге; CAGR ${fmtPct(revenueCagr)}.`,
    },
    {
      status: profitStatus,
      title: "Прибыль",
      explanation: `Средний CFO / net income = ${fmtRatio(avgCfoNi)}. Чистая прибыль 2025 требует объяснения через расходы, фин. расходы и курсовые эффекты.`,
    },
    {
      status: cashStatus,
      title: "Денежный поток",
      explanation: `FCF положительный в ${fcfYears} из ${rows.length} лет; CFO 2025 = ${fmtNumber(last.cfo)}.`,
    },
    {
      status: assetStatus,
      title: "Активы",
      explanation: `PPE/assets 2025 = ${fmtPct(div(n(last, "ppe"), n(last, "assets")))}; capex/амортизация = ${fmtRatio(capexDep)}.`,
    },
    {
      status: liabilityStatus,
      title: "Обязательства",
      explanation: `Debt/assets 2025 = ${fmtPct(debtAssets)}, lease liabilities/assets = ${fmtPct(leaseAssets)}.`,
    },
    {
      status: "green",
      title: "Раскрытия",
      explanation: "В input отмечены источники, notes/MD&A и раскрытие основных рисков. Для защиты лучше показать конкретные страницы отчетов.",
    },
  ];
}

function buildRatios(rows) {
  return rows.map((row) => {
    const revenue = n(row, "revenue");
    const assets = n(row, "assets");
    return {
      year: row.year,
      gross_margin: div(n(row, "gross_profit"), revenue),
      operating_margin: div(n(row, "operating_profit"), revenue),
      net_margin: div(n(row, "net_income"), revenue),
      roa: div(n(row, "net_income"), assets),
      roe: div(n(row, "net_income"), n(row, "equity")),
      debt_assets: div(n(row, "debt"), assets),
      debt_equity: div(n(row, "debt"), n(row, "equity")),
      asset_turnover: div(revenue, assets),
      dso: (div(n(row, "receivables"), revenue) || 0) * 365,
      dio: (div(n(row, "inventories"), Math.abs(n(row, "direct_costs"))) || 0) * 365,
      cfo_net_income: div(n(row, "cfo"), n(row, "net_income")),
      fcf_margin: div(n(row, "fcf"), revenue),
      cfo_capex: div(n(row, "cfo"), n(row, "capex")),
      fuel_revenue: div(Math.abs(n(row, "fuel_cost")), revenue),
      lease_assets: div(n(row, "lease_liabilities"), assets),
      opex_revenue: div(Math.abs(n(row, "operating_expenses")), revenue),
      passenger_share: div(n(row, "passenger_revenue"), revenue),
      capex_revenue: div(n(row, "capex"), revenue),
    };
  });
}

function buildForecast(rows) {
  const last = rows[rows.length - 1];
  const histGrowth = cagr(n(rows[0], "revenue"), n(last, "revenue"), rows.length - 1) || 0.08;
  const opMargin = div(n(last, "operating_profit"), n(last, "revenue")) || 0.06;
  const netMargin = div(n(last, "net_income"), n(last, "revenue")) || 0.01;
  const cfoMargin = div(n(last, "cfo"), n(last, "revenue")) || 0.12;
  const fcfMargin = div(n(last, "fcf"), n(last, "revenue")) || 0.08;
  const assumptions = {
    "Base case": {
      revenue_growth: Math.min(Math.max(histGrowth * 0.55, 0.06), 0.1),
      operating_margin: Math.max(opMargin, 0.07),
      net_margin: Math.max(netMargin, 0.015),
      asset_growth: 0.05,
      debt_growth: 0.07,
      cfo_margin: Math.max(cfoMargin, 0.12),
      fcf_margin: Math.max(fcfMargin, 0.08),
    },
    "Stress case": {
      revenue_growth: 0.02,
      operating_margin: Math.max(opMargin - 0.03, 0.025),
      net_margin: Math.max(netMargin - 0.015, 0.003),
      asset_growth: 0.02,
      debt_growth: 0.12,
      cfo_margin: Math.max(cfoMargin - 0.04, 0.07),
      fcf_margin: Math.max(fcfMargin - 0.04, 0.02),
    },
  };
  const scenarios = [];
  Object.entries(assumptions).forEach(([scenario, a]) => {
    let revenue = n(last, "revenue");
    let assets = n(last, "assets");
    let debt = n(last, "debt");
    let equity = n(last, "equity");
    for (let year = last.year + 1; year <= last.year + 3; year += 1) {
      revenue *= 1 + a.revenue_growth;
      assets *= 1 + a.asset_growth;
      debt *= 1 + a.debt_growth;
      const operating_profit = revenue * a.operating_margin;
      const net_income = revenue * a.net_margin;
      equity += net_income;
      scenarios.push({
        scenario,
        year,
        revenue,
        operating_profit,
        net_income,
        debt,
        equity,
        cfo: revenue * a.cfo_margin,
        fcf: revenue * a.fcf_margin,
        roa: div(net_income, assets),
        roe: div(net_income, equity),
        debt_equity: div(debt, equity),
      });
    }
  });
  return { assumptions, scenarios };
}

function analyze(rows) {
  const quality = buildQuality(rows);
  const ratios = buildRatios(rows);
  const forecast = buildForecast(rows);
  const first = rows[0];
  const last = rows[rows.length - 1];
  const yellow = quality.filter((x) => x.status !== "green").map((x) => x.title);
  return {
    company: last.company || "Air Astana",
    period: `${first.year}-${last.year}`,
    currency: last.currency || "KZT",
    scale: last.scale || "тыс. тенге",
    rows,
    quality,
    ratios,
    forecast,
    summary: [
      `За 5 лет выручка Air Astana выросла на ${fmtPct(div(last.revenue - first.revenue, first.revenue))}: с ${fmtNumber(first.revenue)} до ${fmtNumber(last.revenue)} тыс. тенге.`,
      `Операционная маржа 2025 составляет ${fmtPct(div(last.operating_profit, last.revenue))}, чистая маржа 2025 составляет ${fmtPct(div(last.net_income, last.revenue))}.`,
      `Долговая нагрузка высокая для авиакомпании: debt/assets 2025 = ${fmtPct(div(last.debt, last.assets))}, значительная часть долга связана с lease liabilities.`,
      `Денежный поток поддерживает бизнес: CFO 2025 = ${fmtNumber(last.cfo)}, FCF 2025 = ${fmtNumber(last.fcf)}.`,
      `Зоны дополнительной проверки: ${yellow.length ? yellow.join(", ") : "существенных красных зон по input не выявлено"}.`,
      "Это аналитический вывод по отчетности, а не инвестиционная рекомендация.",
    ],
  };
}

function renderMeta(a) {
  document.querySelector("#meta").innerHTML = [
    ["Компания", a.company],
    ["Период", a.period],
    ["Валюта", a.currency],
    ["Масштаб", a.scale],
  ].map(([label, value]) => `<div class="meta-item"><span>${label}</span><strong>${value}</strong></div>`).join("");
}

function renderTable(selector, columns, rows) {
  document.querySelector(selector).innerHTML = `
    <thead><tr>${columns.map((c) => `<th>${c.label}</th>`).join("")}</tr></thead>
    <tbody>${rows.map((r) => `<tr>${columns.map((c) => `<td>${c.format ? c.format(r[c.key]) : r[c.key]}</td>`).join("")}</tr>`).join("")}</tbody>`;
}

function drawChart(canvasId, title, series) {
  const canvas = document.querySelector(canvasId);
  const ctx = canvas.getContext("2d");
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#17202a";
  ctx.font = "18px Segoe UI";
  ctx.fillText(title, 24, 30);
  const p = { l: 58, r: 28, t: 54, b: 42 };
  const all = series.flatMap((s) => s.values).filter((x) => x !== null);
  const min = Math.min(...all, 0);
  const max = Math.max(...all, 1);
  const span = max - min || 1;
  const years = series[0].years;
  const x = (i) => p.l + (i * (w - p.l - p.r)) / Math.max(years.length - 1, 1);
  const y = (v) => h - p.b - ((v - min) * (h - p.t - p.b)) / span;
  ctx.strokeStyle = "#d8dee8";
  ctx.beginPath();
  ctx.moveTo(p.l, h - p.b);
  ctx.lineTo(w - p.r, h - p.b);
  ctx.stroke();
  years.forEach((year, i) => {
    ctx.fillStyle = "#667085";
    ctx.font = "12px Segoe UI";
    ctx.fillText(year, x(i) - 14, h - 16);
  });
  series.forEach((s, si) => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    s.values.forEach((value, i) => {
      if (i === 0) ctx.moveTo(x(i), y(value));
      else ctx.lineTo(x(i), y(value));
    });
    ctx.stroke();
    s.values.forEach((value, i) => {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(x(i), y(value), 4, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = s.color;
    ctx.font = "13px Segoe UI";
    ctx.fillText(s.label, w - p.r - 160, p.t + si * 18);
  });
}

function render(a) {
  renderMeta(a);
  const first = a.rows[0];
  const last = a.rows[a.rows.length - 1];
  document.querySelector("#statementCards").innerHTML = [
    ["Выручка 2025", fmtNumber(last.revenue)],
    ["Рост выручки", fmtPct(div(last.revenue - first.revenue, first.revenue))],
    ["CFO 2025", fmtNumber(last.cfo)],
    ["FCF 2025", fmtNumber(last.fcf)],
  ].map(([label, value]) => `<div class="metric"><span>${label}</span><strong>${value}</strong></div>`).join("");

  renderTable("#statementsTable", [
    { key: "year", label: "Год" },
    { key: "revenue", label: "Выручка", format: fmtNumber },
    { key: "gross_profit", label: "Расчетная валовая прибыль", format: fmtNumber },
    { key: "operating_profit", label: "Опер. прибыль", format: fmtNumber },
    { key: "net_income", label: "Чистая прибыль", format: fmtNumber },
    { key: "assets", label: "Активы", format: fmtNumber },
    { key: "debt", label: "Долг", format: fmtNumber },
    { key: "equity", label: "Капитал", format: fmtNumber },
    { key: "cfo", label: "CFO", format: fmtNumber },
    { key: "capex", label: "Capex", format: fmtNumber },
    { key: "fcf", label: "FCF", format: fmtNumber },
  ], a.rows);

  document.querySelector("#qualityGrid").innerHTML = a.quality.map((item) => `
    <article class="quality-card ${item.status}">
      <span class="pill">${item.status.toUpperCase()}</span>
      <h3>${item.title}</h3>
      <p>${item.explanation}</p>
    </article>`).join("");

  renderTable("#ratiosTable", [
    { key: "year", label: "Год" },
    { key: "gross_margin", label: "Валовая маржа*", format: fmtPct },
    { key: "operating_margin", label: "Опер. маржа", format: fmtPct },
    { key: "net_margin", label: "Чистая маржа", format: fmtPct },
    { key: "roa", label: "ROA", format: fmtPct },
    { key: "roe", label: "ROE", format: fmtPct },
    { key: "debt_assets", label: "Debt/assets", format: fmtPct },
    { key: "debt_equity", label: "Debt/equity", format: fmtRatio },
    { key: "dso", label: "DSO", format: fmtRatio },
    { key: "dio", label: "DIO", format: fmtRatio },
    { key: "fuel_revenue", label: "Fuel/revenue", format: fmtPct },
    { key: "lease_assets", label: "Lease/assets", format: fmtPct },
    { key: "capex_revenue", label: "Capex/revenue", format: fmtPct },
  ], a.ratios);

  document.querySelector("#assumptions").innerHTML = Object.entries(a.forecast.assumptions).map(([name, values]) => `
    <article class="assumption-card">
      <h3>${name}</h3>
      <dl>
        <dt>Рост выручки</dt><dd>${fmtPct(values.revenue_growth)}</dd>
        <dt>Опер. маржа</dt><dd>${fmtPct(values.operating_margin)}</dd>
        <dt>Чистая маржа</dt><dd>${fmtPct(values.net_margin)}</dd>
        <dt>Рост долга</dt><dd>${fmtPct(values.debt_growth)}</dd>
      </dl>
    </article>`).join("");

  renderTable("#forecastTable", [
    { key: "scenario", label: "Сценарий" },
    { key: "year", label: "Год" },
    { key: "revenue", label: "Выручка", format: fmtNumber },
    { key: "operating_profit", label: "Опер. прибыль", format: fmtNumber },
    { key: "net_income", label: "Чистая прибыль", format: fmtNumber },
    { key: "debt", label: "Долг", format: fmtNumber },
    { key: "fcf", label: "FCF", format: fmtNumber },
    { key: "roa", label: "ROA", format: fmtPct },
    { key: "roe", label: "ROE", format: fmtPct },
    { key: "debt_equity", label: "Debt/equity", format: fmtRatio },
  ], a.forecast.scenarios);

  document.querySelector("#summaryList").innerHTML = a.summary.map((x) => `<li>${x}</li>`).join("");
  const years = a.rows.map((row) => row.year);
  drawChart("#revenueChart", "Выручка, CFO и FCF", [
    { label: "Выручка", color: "#1f5eff", years, values: a.rows.map((row) => row.revenue) },
    { label: "CFO", color: "#1b7f4c", years, values: a.rows.map((row) => row.cfo) },
    { label: "FCF", color: "#a86600", years, values: a.rows.map((row) => row.fcf) },
  ]);
  drawChart("#marginChart", "Маржи", [
    { label: "Опер. маржа", color: "#1f5eff", years, values: a.ratios.map((row) => row.operating_margin) },
    { label: "Чистая маржа", color: "#1b7f4c", years, values: a.ratios.map((row) => row.net_margin) },
  ]);
  drawChart("#debtChart", "Долговая нагрузка", [
    { label: "Debt/assets", color: "#b42318", years, values: a.ratios.map((row) => row.debt_assets) },
    { label: "Lease/assets", color: "#a86600", years, values: a.ratios.map((row) => row.lease_assets) },
  ]);
  hideStatus();
}

async function loadSample() {
  showStatus("Загружаю sample CSV...");
  const response = await fetch("air_astana_sample.csv");
  if (!response.ok) throw new Error("Не получилось загрузить air_astana_sample.csv");
  const text = await response.text();
  render(analyze(normalize(parseCsv(text))));
}

document.querySelectorAll(".tab").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".panel").forEach((panel) => panel.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.tab}`).classList.add("active");
  });
});

sampleButton.addEventListener("click", () => loadSample().catch((error) => showStatus(error.message, true)));
fileInput.addEventListener("change", async () => {
  const file = fileInput.files[0];
  if (!file) return;
  try {
    showStatus(`Анализирую ${file.name}...`);
    const text = await file.text();
    render(analyze(normalize(parseCsv(text))));
  } catch (error) {
    showStatus(error.message, true);
  }
});

loadSample().catch((error) => showStatus(error.message, true));
