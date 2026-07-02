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
  current_ratio: "current_ratio",
  quick_ratio: "quick_ratio",
  cash_ratio: "cash_ratio",
  interest_coverage: "interest_coverage",
  net_debt: "net_debt",
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
        net_debt: row.net_debt ?? debt - n(row, "cash"),
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

function buildQualityChecks(rows) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const periods = rows.length - 1;
  const revenueGrowth = div(n(last, "revenue") - n(first, "revenue"), n(first, "revenue"));
  const revenueCagr = cagr(n(first, "revenue"), n(last, "revenue"), periods);
  const receivablesGrowth = div(n(last, "receivables") - n(first, "receivables"), n(first, "receivables"));
  const receivablesToRevenue = div(n(last, "receivables"), n(last, "revenue"));
  const dso = (div(n(last, "receivables"), n(last, "revenue")) || 0) * 365;
  const netIncomeGrowth = div(n(last, "net_income") - n(first, "net_income"), n(first, "net_income"));
  const cfoToNetIncome = div(n(last, "cfo"), n(last, "net_income"));
  const profitCashGap = n(last, "cfo") - n(last, "net_income");
  const assetsGrowth = div(n(last, "assets") - n(first, "assets"), n(first, "assets"));
  const inventoriesToAssets = div(n(last, "inventories"), n(last, "assets"));
  const ppeToAssets = div(n(last, "ppe"), n(last, "assets"));
  const intangiblesToAssets = div(n(last, "intangibles"), n(last, "assets"));
  const capexToDep = div(n(last, "capex"), n(last, "depreciation_amortization"));
  const debtGrowth = div(n(last, "debt") - n(first, "debt"), n(first, "debt"));
  const leaseToAssets = div(n(last, "lease_liabilities"), n(last, "assets"));
  const interestCoverage = div(n(last, "operating_profit"), Math.abs(n(last, "finance_costs")));
  const notesAvailable = last.disclosure_notes_available === "yes" ? "есть" : "требует проверки";
  const mdaAvailable = last.mda_available === "yes" ? "есть" : "требует проверки";
  const risksAvailable = last.major_risks_disclosed === "yes" ? "раскрыты" : "требует проверки";

  return [
    {
      zone: "1. Качество выручки",
      check: "Рост выручки и рост дебиторской задолженности",
      result: `Выручка выросла на ${fmtPct(revenueGrowth)}; CAGR выручки ${fmtPct(revenueCagr)}. Дебиторская задолженность выросла на ${fmtPct(receivablesGrowth)}.`,
    },
    {
      zone: "1. Качество выручки",
      check: "Дебиторская задолженность vs выручка; DSO",
      result: `Дебиторская задолженность / выручка 2025 = ${fmtPct(receivablesToRevenue)}; DSO 2025 = ${fmtRatio(dso)} дней.`,
    },
    {
      zone: "1. Качество выручки",
      check: "Наличие объяснений в отчетности",
      result: `Источник указан в input; объяснения нужно подтверждать через notes/MD&A годового отчета. Статус notes: ${notesAvailable}.`,
    },
    {
      zone: "2. Качество прибыли",
      check: "Динамика чистой прибыли и повторяемость прибыли",
      result: `Чистая прибыль изменилась с ${fmtNumber(first.net_income)} до ${fmtNumber(last.net_income)} тыс. тенге; изменение ${fmtPct(netIncomeGrowth)}. Резкое снижение 2025 требует объяснения.`,
    },
    {
      zone: "2. Качество прибыли",
      check: "Наличие разовых доходов / расходов",
      result: `В input есть sale-and-leaseback gain, прочие доходы и курсовая разница. Эти статьи используются как зона проверки разовых эффектов.`,
    },
    {
      zone: "2. Качество прибыли",
      check: "CFO / net income; расхождение прибыли и денежного потока",
      result: `CFO / net income 2025 = ${fmtRatio(cfoToNetIncome)}. CFO превышает чистую прибыль на ${fmtNumber(profitCashGap)} тыс. тенге.`,
    },
    {
      zone: "3. Качество активов",
      check: "Рост активов; запасы; основные средства",
      result: `Активы выросли на ${fmtPct(assetsGrowth)}. Запасы / активы 2025 = ${fmtPct(inventoriesToAssets)}; PPE / активы = ${fmtPct(ppeToAssets)}.`,
    },
    {
      zone: "3. Качество активов",
      check: "Нематериальные активы; гудвилл; обесценение",
      result: `НМА / активы 2025 = ${fmtPct(intangiblesToAssets)}. Гудвилл и обесценение отдельно в CSV не выделены, их нужно смотреть в notes.`,
    },
    {
      zone: "3. Качество активов",
      check: "Capex и амортизация",
      result: `Capex 2025 = ${fmtNumber(last.capex)}; амортизация 2025 = ${fmtNumber(last.depreciation_amortization)}; Capex / амортизация = ${fmtRatio(capexToDep)}.`,
    },
    {
      zone: "4. Качество обязательств",
      check: "Рост долга; краткосрочный и долгосрочный долг",
      result: `Итого долг вырос на ${fmtPct(debtGrowth)}. В CSV показан общий долг; детализация краткосрочного и долгосрочного долга сохранена в полном Excel input.`,
    },
    {
      zone: "4. Качество обязательств",
      check: "Lease liabilities; interest coverage",
      result: `Lease liabilities / активы 2025 = ${fmtPct(leaseToAssets)}. Interest coverage 2025 = ${fmtRatio(interestCoverage)}.`,
    },
    {
      zone: "4. Качество обязательств",
      check: "Условные обязательства",
      result: "В CSV условные обязательства не выделены отдельной строкой; для финальной защиты нужно ссылаться на соответствующие notes.",
    },
    {
      zone: "5. Качество раскрытий",
      check: "Есть ли notes и MD&A",
      result: `Notes: ${notesAvailable}; MD&A: ${mdaAvailable}. Источник данных указан в input и файле sources.md.`,
    },
    {
      zone: "5. Качество раскрытий",
      check: "Объясняются ли ключевые изменения и раскрыты ли риски",
      result: `Существенные риски: ${risksAvailable}. Для защиты нужно показать, где в годовом отчете объясняются изменения выручки, расходов, долга и cash flow.`,
    },
    {
      zone: "5. Качество раскрытий",
      check: "Какие данные отсутствуют",
      result: "В CSV не выделены гудвилл, условные обязательства и детализация LT/ST долга; эти пункты отмечены как ограничения и проверяются через полный Excel/notes.",
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
      net_debt: n(row, "net_debt"),
      current_ratio: row.current_ratio ?? null,
      quick_ratio: row.quick_ratio ?? null,
      cash_ratio: row.cash_ratio ?? null,
      interest_coverage: row.interest_coverage ?? div(n(row, "operating_profit"), Math.abs(n(row, "finance_costs"))),
      asset_turnover: div(revenue, assets),
      receivables_turnover: div(revenue, n(row, "receivables")),
      inventory_turnover: div(revenue, n(row, "inventories")),
      dso: (div(n(row, "receivables"), revenue) || 0) * 365,
      dio: (div(n(row, "inventories"), Math.abs(n(row, "direct_costs"))) || 0) * 365,
      cfo_net_income: div(n(row, "cfo"), n(row, "net_income")),
      fcf: n(row, "fcf"),
      fcf_margin: div(n(row, "fcf"), revenue),
      cfo_capex: div(n(row, "cfo"), n(row, "capex")),
      fuel_revenue: div(Math.abs(n(row, "fuel_cost")), revenue),
      lease_assets: div(n(row, "lease_liabilities"), assets),
      opex_revenue: div(Math.abs(n(row, "operating_expenses")), revenue),
      passenger_share: div(n(row, "passenger_revenue"), revenue),
      capex_revenue: div(n(row, "capex"), revenue),
      ppe_assets: div(n(row, "ppe"), assets),
    };
  });
}

function buildDirectionRows(rows) {
  const first = rows[0];
  const last = rows[rows.length - 1];
  const changeText = (key) => `${fmtNumber(first[key])} -> ${fmtNumber(last[key])}; изменение ${fmtPct(div(n(last, key) - n(first, key), Math.abs(n(first, key))))}`;
  const positiveCostChange = (key) => `${fmtNumber(first[key])} -> ${fmtNumber(last[key])}; изменение ${fmtPct(div(Math.abs(n(last, key)) - Math.abs(n(first, key)), Math.abs(n(first, key))))}`;

  return {
    income: [
      {
        item: "Выручка",
        dynamics: changeText("revenue"),
        explanation: "Рост отражает расширение операционной деятельности и восстановление спроса на авиаперевозки.",
      },
      {
        item: "Себестоимость / прямые расходы",
        dynamics: positiveCostChange("direct_costs"),
        explanation: "Для Air Astana себестоимость рассчитана через топливо, персонал/экипаж, техническое обслуживание, аэропортовое обслуживание и обслуживание пассажиров.",
      },
      {
        item: "Валовая прибыль",
        dynamics: changeText("gross_profit"),
        explanation: "Расчетная валовая прибыль растет вместе с выручкой, но зависит от давления топлива и операционных расходов.",
      },
      {
        item: "Операционные расходы",
        dynamics: positiveCostChange("operating_expenses"),
        explanation: "Рост расходов связан с масштабом операций, топливом, персоналом, обслуживанием и аэропортовыми расходами.",
      },
      {
        item: "Операционная прибыль",
        dynamics: changeText("operating_profit"),
        explanation: "Операционная прибыль показывает результат основной деятельности до финансовых расходов и налогов.",
      },
      {
        item: "Финансовые доходы / расходы",
        dynamics: `Доходы: ${fmtNumber(first.finance_income)} -> ${fmtNumber(last.finance_income)}; расходы: ${fmtNumber(first.finance_costs)} -> ${fmtNumber(last.finance_costs)}.`,
        explanation: "Финансовые расходы важны из-за долговой и lease-нагрузки авиакомпании.",
      },
      {
        item: "Налог",
        dynamics: changeText("tax"),
        explanation: "Налог влияет на переход от прибыли до налогообложения к чистой прибыли.",
      },
      {
        item: "Чистая прибыль",
        dynamics: changeText("net_income"),
        explanation: "Чистая прибыль в 2025 ниже уровня 2021, поэтому важно объяснять влияние расходов, финансовых расходов и курсовых эффектов.",
      },
    ],
    balance: [
      {
        item: "Активы",
        dynamics: changeText("assets"),
        explanation: "Рост активов показывает увеличение масштаба компании и базы для операционной деятельности.",
      },
      {
        item: "Денежные средства",
        dynamics: changeText("cash"),
        explanation: "Денежные средства важны для оценки ликвидности и устойчивости к стресс-сценарию.",
      },
      {
        item: "Дебиторская задолженность",
        dynamics: changeText("receivables"),
        explanation: "Дебиторка сопоставляется с выручкой и DSO для оценки качества выручки.",
      },
      {
        item: "Запасы",
        dynamics: changeText("inventories"),
        explanation: "Запасы применимы для Air Astana и проверяются как часть качества активов.",
      },
      {
        item: "Основные средства",
        dynamics: changeText("ppe"),
        explanation: "PPE отражает fleet-related assets и инфраструктурную базу авиакомпании.",
      },
      {
        item: "Нематериальные активы",
        dynamics: changeText("intangibles"),
        explanation: "НМА занимают небольшую долю активов, но включены в проверку качества активов.",
      },
      {
        item: "Обязательства",
        dynamics: changeText("liabilities"),
        explanation: "Рост обязательств сопоставляется с активами и капиталом.",
      },
      {
        item: "Займы и кредиты",
        dynamics: changeText("loans"),
        explanation: "Займы отдельно выделены, но для Air Astana также важны lease liabilities.",
      },
      {
        item: "Капитал",
        dynamics: changeText("equity"),
        explanation: "Капитал показывает собственную базу финансирования и влияет на debt/equity.",
      },
    ],
    cashflow: [
      {
        item: "CFO",
        dynamics: changeText("cfo"),
        explanation: "Операционный денежный поток показывает, поддержана ли прибыль денежными поступлениями.",
      },
      {
        item: "CFI",
        dynamics: changeText("cfi"),
        explanation: "Инвестиционный поток связан с capex и размещением/погашением депозитов.",
      },
      {
        item: "CFF",
        dynamics: changeText("cff"),
        explanation: "Финансовый поток отражает выплаты по аренде, займы, выпуск акций и дивиденды.",
      },
      {
        item: "FCF",
        dynamics: changeText("fcf"),
        explanation: "Free cash flow рассчитан как CFO - Capex и показывает денежный остаток после инвестиций.",
      },
      {
        item: "CFO / net income",
        dynamics: `${fmtRatio(div(first.cfo, first.net_income))} -> ${fmtRatio(div(last.cfo, last.net_income))}`,
        explanation: "Показатель показывает, насколько чистая прибыль подтверждается операционным денежным потоком.",
      },
      {
        item: "CFO / capex",
        dynamics: `${fmtRatio(div(first.cfo, first.capex))} -> ${fmtRatio(div(last.cfo, last.capex))}`,
        explanation: "Показывает, покрывает ли операционный денежный поток капитальные вложения.",
      },
      {
        item: "Дивиденды",
        dynamics: changeText("dividends_paid"),
        explanation: "Дивиденды включены, потому что они влияют на денежный поток и капитал.",
      },
      {
        item: "Заимствования",
        dynamics: `Займы: ${fmtNumber(first.loans)} -> ${fmtNumber(last.loans)}; долг всего: ${fmtNumber(first.debt)} -> ${fmtNumber(last.debt)}.`,
        explanation: "Для авиакомпании важно смотреть не только займы, но и lease liabilities в составе долга.",
      },
    ],
  };
}

function buildForecast(rows) {
  const last = rows[rows.length - 1];
  const histGrowth = cagr(n(rows[0], "revenue"), n(last, "revenue"), rows.length - 1) || 0.08;
  const histDebtGrowth = cagr(n(rows[0], "debt"), n(last, "debt"), rows.length - 1) || 0.08;
  const opMargin = div(n(last, "operating_profit"), n(last, "revenue")) || 0.06;
  const netMargin = div(n(last, "net_income"), n(last, "revenue")) || 0.01;
  const cfoMargin = div(n(last, "cfo"), n(last, "revenue")) || 0.12;
  const fcfMargin = div(n(last, "fcf"), n(last, "revenue")) || 0.08;
  const capexRevenue = div(n(last, "capex"), n(last, "revenue")) || 0.04;
  const assumptions = {
    "Base case": {
      revenue_growth: Math.min(Math.max(histGrowth * 0.55, 0.06), 0.1),
      operating_margin: Math.max(opMargin, 0.07),
      net_margin: Math.max(netMargin, 0.015),
      asset_growth: 0.05,
      debt_growth: 0.07,
      capex_revenue: Math.max(capexRevenue, 0.04),
      cfo_margin: Math.max(cfoMargin, 0.12),
      fcf_margin: Math.max(fcfMargin, 0.08),
    },
    "Stress case": {
      revenue_growth: 0.02,
      operating_margin: Math.max(opMargin - 0.03, 0.025),
      net_margin: Math.max(netMargin - 0.015, 0.003),
      asset_growth: 0.02,
      debt_growth: 0.12,
      capex_revenue: Math.max(capexRevenue - 0.01, 0.03),
      cfo_margin: Math.max(cfoMargin - 0.04, 0.07),
      fcf_margin: Math.max(fcfMargin - 0.04, 0.02),
    },
  };
  const assumptionRows = [
    {
      metric: "Рост выручки",
      historical: fmtPct(histGrowth),
      base: fmtPct(assumptions["Base case"].revenue_growth),
      stress: fmtPct(assumptions["Stress case"].revenue_growth),
      rationale: "Base case предполагает умеренное продолжение тренда; stress case учитывает замедление рынка и спроса.",
    },
    {
      metric: "Операционная маржа",
      historical: fmtPct(opMargin),
      base: fmtPct(assumptions["Base case"].operating_margin),
      stress: fmtPct(assumptions["Stress case"].operating_margin),
      rationale: "В стресс-сценарии маржа ниже из-за давления топлива, персонала, обслуживания и аэропортовых расходов.",
    },
    {
      metric: "Чистая маржа",
      historical: fmtPct(netMargin),
      base: fmtPct(assumptions["Base case"].net_margin),
      stress: fmtPct(assumptions["Stress case"].net_margin),
      rationale: "Чистая маржа чувствительна к финансовым расходам, курсовым эффектам и налогам.",
    },
    {
      metric: "Capex / revenue",
      historical: fmtPct(capexRevenue),
      base: fmtPct(assumptions["Base case"].capex_revenue),
      stress: fmtPct(assumptions["Stress case"].capex_revenue),
      rationale: "Base case сохраняет поддерживающие инвестиции; stress case предполагает более осторожный capex.",
    },
    {
      metric: "Debt growth",
      historical: fmtPct(histDebtGrowth),
      base: fmtPct(assumptions["Base case"].debt_growth),
      stress: fmtPct(assumptions["Stress case"].debt_growth),
      rationale: "В stress case долг растет быстрее из-за риска финансирования, lease liabilities и давления на cash flow.",
    },
    {
      metric: "CFO margin",
      historical: fmtPct(cfoMargin),
      base: fmtPct(assumptions["Base case"].cfo_margin),
      stress: fmtPct(assumptions["Stress case"].cfo_margin),
      rationale: "CFO margin показывает, какую часть выручки компания конвертирует в операционный денежный поток.",
    },
    {
      metric: "FCF margin",
      historical: fmtPct(fcfMargin),
      base: fmtPct(assumptions["Base case"].fcf_margin),
      stress: fmtPct(assumptions["Stress case"].fcf_margin),
      rationale: "FCF margin ухудшается в stress case из-за давления на CFO и потребности в инвестициях.",
    },
  ];
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
  return { assumptions, assumptionRows, scenarios };
}

function analyze(rows) {
  const quality = buildQuality(rows);
  const qualityChecks = buildQualityChecks(rows);
  const ratios = buildRatios(rows);
  const directionRows = buildDirectionRows(rows);
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
    qualityChecks,
    ratios,
    directionRows,
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
    { key: "direct_costs", label: "Себестоимость / прямые расходы", format: fmtNumber },
    { key: "gross_profit", label: "Валовая прибыль расчетная", format: fmtNumber },
    { key: "operating_profit", label: "Операционная прибыль", format: fmtNumber },
    { key: "finance_income", label: "Финансовые доходы", format: fmtNumber },
    { key: "finance_costs", label: "Финансовые расходы", format: fmtNumber },
    { key: "tax", label: "Налог", format: fmtNumber },
    { key: "net_income", label: "Чистая прибыль", format: fmtNumber },
    { key: "assets", label: "Активы", format: fmtNumber },
    { key: "cash", label: "Денежные средства", format: fmtNumber },
    { key: "receivables", label: "Дебиторская задолженность", format: fmtNumber },
    { key: "inventories", label: "Запасы", format: fmtNumber },
    { key: "ppe", label: "Основные средства", format: fmtNumber },
    { key: "intangibles", label: "Нематериальные активы", format: fmtNumber },
    { key: "liabilities", label: "Обязательства", format: fmtNumber },
    { key: "loans", label: "Займы и кредиты", format: fmtNumber },
    { key: "debt", label: "Итого долг", format: fmtNumber },
    { key: "equity", label: "Капитал", format: fmtNumber },
    { key: "cfo", label: "CFO", format: fmtNumber },
    { key: "cfi", label: "CFI", format: fmtNumber },
    { key: "cff", label: "CFF", format: fmtNumber },
    { key: "capex", label: "Capex", format: fmtNumber },
    { key: "dividends_paid", label: "Дивиденды", format: fmtNumber },
    { key: "fcf", label: "FCF", format: fmtNumber },
  ], a.rows);

  document.querySelector("#qualityGrid").innerHTML = a.quality.map((item) => `
    <article class="quality-card ${item.status}">
      <span class="pill">${item.status.toUpperCase()}</span>
      <h3>${item.title}</h3>
      <p>${item.explanation}</p>
    </article>`).join("");

  renderTable("#qualityChecksTable", [
    { key: "zone", label: "Зона проверки" },
    { key: "check", label: "Что проверяется" },
    { key: "result", label: "Результат по данным Air Astana" },
  ], a.qualityChecks);

  const directionColumns = [
    { key: "item", label: "Показатель" },
    { key: "dynamics", label: "Динамика 2021 -> 2025" },
    { key: "explanation", label: "Объяснение" },
  ];
  renderTable("#incomeAnalysisTable", directionColumns, a.directionRows.income);
  renderTable("#balanceAnalysisTable", directionColumns, a.directionRows.balance);
  renderTable("#cashflowAnalysisTable", directionColumns, a.directionRows.cashflow);

  renderTable("#ratiosTable", [
    { key: "year", label: "Год" },
    { key: "gross_margin", label: "Валовая маржа*", format: fmtPct },
    { key: "operating_margin", label: "Операционная маржа", format: fmtPct },
    { key: "net_margin", label: "Чистая маржа", format: fmtPct },
    { key: "roa", label: "ROA", format: fmtPct },
    { key: "roe", label: "ROE", format: fmtPct },
    { key: "current_ratio", label: "Current ratio", format: fmtRatio },
    { key: "quick_ratio", label: "Quick ratio", format: fmtRatio },
    { key: "cash_ratio", label: "Cash ratio", format: fmtRatio },
    { key: "debt_equity", label: "Debt / Equity", format: fmtRatio },
    { key: "debt_assets", label: "Debt / Assets", format: fmtPct },
    { key: "net_debt", label: "Net debt", format: fmtNumber },
    { key: "interest_coverage", label: "Interest coverage", format: fmtRatio },
    { key: "asset_turnover", label: "Asset turnover", format: fmtRatio },
    { key: "receivables_turnover", label: "Receivables turnover", format: fmtRatio },
    { key: "inventory_turnover", label: "Inventory turnover", format: fmtRatio },
    { key: "dso", label: "DSO", format: fmtRatio },
    { key: "dio", label: "DIO", format: fmtRatio },
    { key: "cfo_net_income", label: "CFO / net income", format: fmtRatio },
    { key: "fcf", label: "FCF", format: fmtNumber },
    { key: "fcf_margin", label: "FCF margin", format: fmtPct },
    { key: "cfo_capex", label: "CFO / Capex", format: fmtRatio },
  ], a.ratios);

  renderTable("#industryMetricsTable", [
    { key: "year", label: "Год" },
    { key: "fuel_revenue", label: "Fuel costs / revenue", format: fmtPct },
    { key: "lease_assets", label: "Lease liabilities / assets", format: fmtPct },
    { key: "opex_revenue", label: "Operating expenses / revenue", format: fmtPct },
    { key: "passenger_share", label: "Пассажирская выручка / общая выручка", format: fmtPct },
    { key: "capex_revenue", label: "Capex / revenue", format: fmtPct },
    { key: "ppe_assets", label: "Fleet-related assets: PPE / assets", format: fmtPct },
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

  renderTable("#assumptionsTable", [
    { key: "metric", label: "Показатель" },
    { key: "historical", label: "Истор. тренд / 2025" },
    { key: "base", label: "Base case" },
    { key: "stress", label: "Stress case" },
    { key: "rationale", label: "Обоснование" },
  ], a.forecast.assumptionRows);

  renderTable("#forecastTable", [
    { key: "scenario", label: "Сценарий" },
    { key: "year", label: "Год" },
    { key: "revenue", label: "Выручка", format: fmtNumber },
    { key: "operating_profit", label: "Опер. прибыль", format: fmtNumber },
    { key: "net_income", label: "Чистая прибыль", format: fmtNumber },
    { key: "assets", label: "Активы", format: fmtNumber },
    { key: "debt", label: "Долг", format: fmtNumber },
    { key: "equity", label: "Капитал", format: fmtNumber },
    { key: "cfo", label: "CFO", format: fmtNumber },
    { key: "fcf", label: "FCF", format: fmtNumber },
    { key: "roa", label: "ROA", format: fmtPct },
    { key: "roe", label: "ROE", format: fmtPct },
    { key: "debt_equity", label: "Долговая нагрузка: Debt/equity", format: fmtRatio },
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
