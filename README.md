# Июньский челлендж 2026 🌱

Трекер привычек и целей на июнь 2026 для Машуни и Ванюши.

## Стек

- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **Prisma** + **PostgreSQL**
- **Railway** (база данных)
- **Vercel** (деплой)

---

## Локальный запуск

### 1. Установить зависимости

```bash
npm install
```

### 2. Настроить переменные окружения

```bash
cp .env.example .env
```

Отредактируй `.env` — укажи `DATABASE_URL` (см. ниже как получить из Railway).

### 3. Применить схему и заполнить базу

```bash
npm run db:push    # Создаёт таблицы в БД
npm run db:seed    # Заполняет данными (Машуня + Ванюша + все задачи)
```

### 4. Запустить приложение

```bash
npm run dev
```

Открой [http://localhost:3000](http://localhost:3000).

---

## База данных в Railway

1. Зайди на [railway.app](https://railway.app) и создай новый проект.
2. Нажми **Add Service → Database → PostgreSQL**.
3. В настройках БД скопируй **DATABASE_URL** (вкладка Connect → Public URL).
4. Вставь его в `.env`:
   ```
   DATABASE_URL="postgresql://..."
   ```

---

## Деплой на Vercel

### Шаг 1 — Загрузи проект на GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/ВАШ_ЛОГИН/habit-tracker.git
git push -u origin main
```

### Шаг 2 — Создай проект на Vercel

1. Зайди на [vercel.com](https://vercel.com).
2. Нажми **Add New → Project** → выбери репозиторий.
3. В разделе **Environment Variables** добавь:
   - `DATABASE_URL` — строка подключения из Railway

### Шаг 3 — Деплой

Vercel задеплоит автоматически при push. После деплоя выполни seed:

```bash
# Локально с DATABASE_URL, указывающим на Railway (Public URL):
npm run db:seed
```

---

## Переменные окружения для Vercel

| Переменная | Описание |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string из Railway |

---

## Команды

```bash
npm run dev          # Запуск в dev-режиме
npm run build        # Production build
npm run db:push      # Применить schema.prisma к БД
npm run db:seed      # Заполнить БД начальными данными
npm run db:studio    # Открыть Prisma Studio (GUI для БД)
npm run db:migrate   # Применить миграции (для production)
```

---

## Где менять задачи и призы

Все данные создаются в `prisma/seed.ts`. Там две секции:

### Изменить приз
```ts
// Ванюша (~строка 15)
prizeTitle: 'билет на матч «Барселоны»',
prizeEmoji: '⚽',

// Машуня (~строка 30)
prizeTitle: 'дайвинг в Египте',
prizeEmoji: '🐠',
```

### Изменить задачи
Каждая задача — объект в массиве `vanyaTasks` или `mashaTasks`. Измени `title`, `targetCount` и т.д., затем запусти `npm run db:seed` снова.

### Изменить план тренировок по неделям
Найди задачи с `type: 'WEEKLY_COUNT'` и измени `targetCount` для нужной недели (1–4).

После любых изменений в seed: **перезапусти** `npm run db:seed` (он сначала очищает все данные!).

---

## Структура проекта

```
habit-tracker/
├── prisma/
│   ├── schema.prisma     # Модель данных
│   └── seed.ts           # Начальные данные
├── src/
│   ├── app/
│   │   ├── page.tsx      # Главная страница (tabs + state)
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── api/
│   │       ├── data/     # GET — все данные
│   │       ├── complete/ # POST — отметить задачу
│   │       ├── weight/   # POST/DELETE — вес
│   │       └── reset/    # POST — сбросить (только dev)
│   ├── components/
│   │   ├── UserDashboard.tsx   # Профиль пользователя
│   │   ├── PrizeCard.tsx       # Карточка приза
│   │   ├── OneTimeTasks.tsx    # Разовые задачи
│   │   ├── DailyCalendar.tsx   # Ежедневный календарь
│   │   ├── WeeklyTrainings.tsx # Недельные тренировки
│   │   ├── CounterTask.tsx     # Счётчик с датами
│   │   ├── WeightTracker.tsx   # Трекер веса
│   │   ├── CelebrationBlock.tsx
│   │   ├── ProgressBar.tsx
│   │   └── progress.ts         # Логика подсчёта прогресса
│   ├── lib/
│   │   ├── prisma.ts     # Prisma client singleton
│   │   └── june2026.ts   # Утилиты для дат июня
│   └── types/
│       └── index.ts      # TypeScript типы
└── README.md
```
