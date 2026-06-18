const sampleCsv = `year,company,currency,scale,source,total_revenue,passenger_revenue,cargo_revenue,sale_leaseback_gain,other_income,fuel_cost,employee_cost,depreciation_amortization,handling_landing_route_charges,passenger_service,engineering_maintenance,selling_costs,other_operating_costs,operating_expenses,operating_profit,finance_income,finance_costs,forex_loss,profit_before_tax,tax,net_income,assets,cash,receivables,inventories,ppe,intangibles,liabilities,loans,lease_liabilities,equity,cfo,cfi,cff,capex,dividends_paid,passengers_m,aircraft,load_factor,ask_b,rpk_b,disclosure_notes_available,mda_available,major_risks_disclosed
2021,Air Astana,KZT,тыс. тенге,"Финансовая отчетность Air Astana; листы Баланс и ОДДС,ОПиУ",324906724,305252639,14304293,1989207,3360585,58279112,49590527,51484170,29879880,25961531,40324060,10686310,15086061,281291651,43615073,1026620,20040053,5330611,19271029,-3785461,15485568,475926936,97740953,6103061,22261449,311845960,659790,448302964,26895095,313872397,27623972,118067404,-5562362,-101243828,13497482,0,,,,,,yes,yes,yes
2022,Air Astana,KZT,тыс. тенге,"Финансовая отчетность Air Astana; листы Баланс и ОДДС,ОПиУ",477981818,462171919,10209425,0,5600474,106940565,68827926,62243853,39205987,37131951,58228907,15334093,19958062,407871344,70110474,3261294,18073217,6923638,48374913,-10792015,37582898,578717319,116998633,9857684,22750814,378255700,718495,508270527,5596214,339031770,70446792,163230844,-27796835,-119154847,22227370,0,,,,,,yes,yes,yes
2023,Air Astana,KZT,тыс. тенге,"Финансовая отчетность Air Astana; листы Баланс и ОДДС,ОПиУ",535169502,521074736,10284481,0,3810285,127357770,88102136,73944311,48241120,46124472,49388554,18444763,22280237,473883363,61286139,6757281,22765053,6280403,38997964,-8258890,30739074,619312543,124552167,10693524,30704619,387885139,1289132,522328078,187279,326780002,96984465,142827723,-20967276,-111377266,19035768,0,,,,,,yes,yes,yes
2024,Air Astana,KZT,тыс. тенге,"Финансовая отчетность Air Astana; листы Баланс и ОДДС,ОПиУ",616152033,585810042,12413214,12501395,5427382,143373122,106675293,88717693,56732135,55787727,55443453,20777116,26322947,553829486,62322547,10376957,30618503,9939963,32141038,-6618444,25522594,952063811,256622307,10922813,34724999,558341061,3160112,744892164,302988,466644777,207171647,173127148,-8509373,-62191375,46099340,0,,,,,,yes,yes,yes
2025,Air Astana,KZT,тыс. тенге,"Финансовая отчетность Air Astana; листы Баланс и ОДДС,ОПиУ",758966733,721046502,14272406,19256118,4391707,173137790,136144112,119792081,73605152,73426414,76101528,26630517,34280058,713117652,45849081,11633517,42893475,4142993,10446130,-3423268,7022862,1039663393,239053004,13142263,43686386,604500136,3286956,852964087,2826923,527958850,186699306,127590876,17598903,-152510081,28152607,0,,,,,,yes,yes,yes`;

const inputRows = [
  ["total_revenue", "Выручка"],
  ["passenger_revenue", "Пассажирские перевозки"],
  ["cargo_revenue", "Груз и почта"],
  ["sale_leaseback_gain", "Прибыль от продажи с обратной арендой"],
  ["other_income", "Прочие доходы"],
  ["operating_expenses", "Операционные расходы"],
  ["operating_profit", "Операционная прибыль"],
  ["finance_income", "Финансовые доходы"],
  ["finance_costs", "Финансовые расходы"],
  ["tax", "Налог"],
  ["net_income", "Чистая прибыль"],
  ["assets", "Активы"],
  ["cash", "Денежные средства"],
  ["receivables", "Дебиторская задолженность"],
  ["inventories", "Запасы"],
  ["ppe", "Основные средства"],
  ["intangibles", "Нематериальные активы"],
  ["liabilities", "Обязательства"],
  ["loans", "Займы и кредиты"],
  ["equity", "Капитал"],
  ["cfo", "Операционный денежный поток"],
  ["cfi", "Инвестиционный денежный поток"],
  ["cff", "Финансовый денежный поток"],
  ["capex", "Capex"],
  ["fcf", "FCF = CFO - Capex"],
  ["cfo_net_income", "CFO / чистая прибыль"]
];

let rows = enrichRows(parseCsv(sampleCsv));

document.getElementById("csvInput").addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    rows = enrichRows(parseCsv(reader.result));
    renderInput();
  };
  reader.readAsText(file);
});

document.getElementById("resetData").addEventListener("click", () => {
  rows = enrichRows(parseCsv(sampleCsv));
  document.getElementById("csvInput").value = "";
  renderInput();
});

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/).filter(Boolean);
  const headers = splitCsvLine(lines.shift());
  return lines.map((line) => {
    const cells = splitCsvLine(line);
    const obj = {};
    headers.forEach((header, index) => {
      const raw = cells[index] ?? "";
      const num = Number(raw);
      obj[header] = raw !== "" && Number.isFinite(num) ? num : raw;
    });
    return obj;
  }).sort((a, b) => a.year - b.year);
}

function splitCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) {
      cells.push(current);
      current = "";
    } else current += char;
  }
  cells.push(current);
  return cells;
}

function enrichRows(parsedRows) {
  return parsedRows.map((row) => ({
    ...row,
    fcf: row.cfo - row.capex,
    cfo_net_income: row.cfo / (row.net_income || 1),
    operating_margin: row.operating_profit / row.total_revenue,
    debt: Number(row.loans || 0) + Number(row.lease_liabilities || 0)
  }));
}

function latest() {
  return rows[rows.length - 1];
}

function first() {
  return rows[0];
}

function fmt(value, digits = 0) {
  if (!Number.isFinite(value)) return "n/a";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: digits }).format(value);
}

function renderInput() {
  const start = first();
  const end = latest();
  const balanceDiff = end.assets - end.liabilities - end.equity;
  document.getElementById("periodBadge").textContent = `${start.year}-${end.year}, ${end.currency} ${end.scale}`;

  document.getElementById("summaryCards").innerHTML = [
    ["Компания", end.company],
    ["Период", `${start.year}-${end.year}`],
    ["Источник", "Отчетность + notes / MD&A / раскрытия"],
    ["Sample input", "Excel + CSV"],
    ["Баланс", balanceDiff === 0 ? "сходится" : `разница ${fmt(balanceDiff)}`]
  ].map(([label, value]) => card(label, value)).join("");

  renderTable(
    "statementTable",
    ["Строка", ...rows.map((row) => row.year)],
    inputRows.map(([key, label]) => [
      label,
      ...rows.map((row) => key === "cfo_net_income" ? fmt(row[key], 2) : fmt(row[key]))
    ])
  );

  const checks = [
    `Данные за ${rows.length} лет собраны: ${rows.map((row) => row.year).join(", ")}.`,
    "Sample input file есть: Excel input и CSV input.",
    "Источники указаны на листе Источники и в data/sources.md.",
    `Валюта: ${end.currency}; масштаб: ${end.scale}.`,
    `Базовая арифметика: активы - обязательства - капитал = ${fmt(balanceDiff)}.`,
    "Данные нормализованы: одна строка CSV = один год, один столбец = один показатель.",
    "CFO, CFI, CFF и Capex взяты из ОДДС.",
    "FCF считается как CFO - Capex.",
    "Input можно загрузить через кнопку CSV и использовать в приложении."
  ];
  document.getElementById("inputChecks").innerHTML = checks.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
}

function renderTable(id, headers, data) {
  const head = `<thead><tr>${headers.map((h) => `<th>${escapeHtml(String(h))}</th>`).join("")}</tr></thead>`;
  const body = `<tbody>${data.map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(String(cell))}</td>`).join("")}</tr>`).join("")}</tbody>`;
  document.getElementById(id).innerHTML = head + body;
}

function card(label, value) {
  return `<div class="metric-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong></div>`;
}

function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));
}

renderInput();
