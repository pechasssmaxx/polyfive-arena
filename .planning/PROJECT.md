# Creative Copycat Bot

## What This Is

Витрина «ИИ-агенты соревнуются на Polymarket»: сайт, где несколько «AI-персонажей» (Claude, ChatGPT, Gemini, Grok, DeepSeek) торгуют на 5-минутных рынках Polymarket и видно кто зарабатывает больше. Под капотом каждый агент — это реальный кошелёк с copy-trading движком, который копирует донорский кошелёк. Пользователь видит лайв-график баланса каждого агента, открытые позиции, историю сделок и P&L.

## Core Value

Каждая сделка каждого агента отображается на сайте в реальном времени без лагов и зависаний, а балансы и графики честно отражают реальные данные кошельков.

## Requirements

### Validated

- ✓ React-дашборд с тёмной темой (PerformanceChart, ModelStats, ActivePositions, TradeHistory, DecisionFeed) — existing
- ✓ 5 AI-агентов (Claude, ChatGPT, Gemini, Grok, DeepSeek) с логотипами и персонажами — existing
- ✓ Express backend с REST API + SSE real-time поток — existing
- ✓ SQLite база данных (trades, balances, agent stats) — existing
- ✓ Copy-trading движок (мониторинг донора + CLOB ордер-исполнение) — existing
- ✓ WebSocket + polling бэкап для захвата сделок — existing
- ✓ Polygon on-chain listener для market events — existing
- ✓ Дедупликация сделок через lastSeenTs — existing
- ✓ Equity snapshots для построения графиков — existing

### Active

- [ ] Бот работает без вылетов и зависаний 24/7
- [ ] Все сделки отображаются на фронте без лагов (< 3 сек задержки)
- [ ] График P&L каждого агента корректно строится по реальным данным
- [ ] Деплой на VPS — сайт доступен по ссылке
- [ ] Конфигурация production (env, process manager, nginx/proxy)

### Out of Scope

- Реальная AI-логика принятия решений — агенты копируют доноров, не думают сами
- Пользовательские аккаунты / авторизация — только read-only витрина
- Мобильное приложение — веб-версия достаточна

## Context

- Фронтенд полностью готов (все компоненты, лидерборды, графики)
- Бэкенд-сервисы написаны, но нужна проверка надёжности
- В `seungmaeda_repo/` — оригинальный upstream-движок, в `server/services/` — кастомный слой
- Два SQLite файла: `polyfive_copycat.db` (активный) и `polyfive.db` (старый/неизвестно)
- TypeScript strict mode выключен (`noImplicitAny=false`, `strictNullChecks=false`)
- HTTP proxy через `global-agent` для геоблокировки

## Constraints

- **Tech Stack**: TypeScript + React + Express + SQLite — не менять без необходимости
- **API**: Polymarket CLOB API v5, WebSocket live data — зависит от внешнего сервиса
- **Deploy**: Нужен Node.js runtime + SQLite + сетевой доступ к Polymarket/Polygon
- **Keys**: Приватные ключи агентов в `.env` — никогда не в git

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Copy-trade vs AI-торговля | Проще, надёжнее, предсказуемо | — Pending |
| SQLite vs Postgres | Один файл, не нужен отдельный сервер | — Pending |
| SSE vs WebSocket для фронта | SSE проще, read-only подходит | — Pending |

---
*Last updated: 2026-02-23 after initialization*
