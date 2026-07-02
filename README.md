# Air Astana Financial Analysis

Веб-приложение для анализа финансовой отчетности Air Astana по методологии:

`Отчетность -> Качество -> Анализ -> Прогноз -> Вывод`

## Что внутри

- `index.html` - главная страница GitHub Pages;
- `app.js` - расчеты, quality scorecard, коэффициенты, forecast;
- `styles.css` - оформление;
- `air_astana_sample.csv` - sample input для приложения;
- `air_astana_input_complete.xlsx` - полный Excel input;
- `methodology_air_astana.md` - методология;
- `AI_USE_DISCLOSURE.md` - раскрытие использования ИИ;
- `sources.md` - источники и комментарии к ним.

## Как открыть приложение

Если GitHub Pages включен, сайт откроется по ссылке вида:

```text
https://malinursaidikarimova-cmd.github.io/Air-Astana/
```

## Что делает приложение

- читает CSV input;
- показывает отчетность за 2021-2025;
- проверяет качество выручки, прибыли, cash flow, активов, обязательств и раскрытий;
- считает финансовые коэффициенты;
- считает отраслевые метрики Air Astana;
- строит 3-летний Base case и Stress case forecast;
- формирует аналитический вывод без инвестиционной рекомендации.

## Ограничения

- GitHub Pages является статическим хостингом, поэтому версия на GitHub Pages читает CSV.
- Полный Excel input приложен отдельно как `air_astana_input_complete.xlsx`.
- Forecast является сценарным и не является инвестиционной рекомендацией.
