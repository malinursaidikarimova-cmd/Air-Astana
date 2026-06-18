# Источники данных

Проект использует финансовую отчетность Air Astana за 2021-2025 годы.

Валюта и масштаб input-файла: KZT, тыс. тенге.

## Основные файлы input

- `data/инпутАФО.xlsx` - основной Excel input workbook.
- `data/air_astana_sample.csv` - CSV input для веб-приложения.

## Листы Excel input

- `Баланс` - отчет о финансовом положении.
- `ОПиУ` - отчет о прибыли или убытке.
- `ОДДС` - отчет о движении денежных средств.
- `Коэффициенты` - расчет финансовых коэффициентов.
- `Инпут` - нормализованная таблица для приложения.
- `Проверки` - контрольные проверки input.
- `Источники` - карта источников.

## Использованные источники

- Air Astana financial statements for 2021.
- Air Astana financial statements for 2022.
- Air Astana consolidated financial statements 2023: https://ir.airastana.com/media/8dc44aa8f61bda7/aa-fs-2023-conso-usd.pdf
- Air Astana consolidated financial statements 2024: https://ir.airastana.com/media/8dd62d1cc357574/fs-aa-usd-2024-conso-eng-final-signed.pdf
- Air Astana consolidated financial statements 2025: https://ir.airastana.com/media/8de832fbd001d0b/fs-aa-usd-2025-eng-final-formatted-signed-final.pdf
- Air Astana Investor Relations: https://ir.airastana.com/

## Ограничения источников

- В отчетности авиакомпании нет классической строки gross profit, поэтому анализ использует операционную маржу и отраслевые cost ratios.
- Debt proxy считается как loans + lease liabilities, потому что IFRS 16 lease liabilities являются важной debt-like нагрузкой для авиакомпании.
- Capex взят из ОДДС как приобретение основных средств.
- Для сопоставимости 2021-2025 данные приведены к единой валюте и масштабу в Excel input.
