# Input guide

Этот файл описывает, как устроен input для веб-приложения.

## Главный Excel input

Файл: `data/инпутАФО.xlsx`

Он содержит листы:

- `Баланс`
- `ОПиУ`
- `ОДДС`
- `Коэффициенты`
- `Инпут`
- `Проверки`
- `Источники`

## CSV input для приложения

Файл: `data/air_astana_sample.csv`

Именно CSV используется веб-приложением как машинно-читаемый input. Он создан на основе листа `Инпут` из Excel.

## Обязательные поля

- `year`
- `company`
- `currency`
- `scale`
- `source`
- `total_revenue`
- `operating_profit`
- `net_income`
- `assets`
- `liabilities`
- `equity`
- `cash`
- `receivables`
- `inventories`
- `ppe`
- `intangibles`
- `loans`
- `lease_liabilities`
- `cfo`
- `cfi`
- `cff`
- `capex`

## Проверки input

- Валюта одинаковая по всем годам: KZT.
- Масштаб одинаковый по всем годам: тыс. тенге.
- Баланс сходится: `assets = liabilities + equity`.
- CFO, CFI, CFF и Capex берутся из ОДДС.
- FCF рассчитывается как `CFO - Capex`.
- CFO / чистая прибыль рассчитывается как `CFO / net_income`.

## Как обновлять данные

1. Обновить листы `Баланс`, `ОПиУ`, `ОДДС`.
2. Проверить, что лист `Инпут` подтягивает данные формулами.
3. Проверить лист `Проверки`.
4. Экспортировать лист `Инпут` в CSV.
5. Заменить `data/air_astana_sample.csv`.
6. Проверить приложение в браузере.
