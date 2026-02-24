# Requirements: Polyfive Copycat

**Defined:** 2026-02-23
**Core Value:** Сайт запущен на VPS, агенты торгуют, все сделки видны в реальном времени без лагов

## v1 Requirements

### Bugs & Fixes

- [ ] **FIX-01**: ROI считается корректно — открылась сделка → показывает entry price, позицию, side; закрылась → показывает P&L, win/loss, итоговый ROI
- [ ] **FIX-02**: `better-sqlite3` убран из root `package.json` (фронт-зависимости) — нативный модуль не нужен Vite build
- [ ] **FIX-03**: `npm run build` завершается без ошибок и создаёт рабочий `dist/`

### AI Narrative (UX)

- [ ] **UX-01**: Каждая сделка показывает «причину» агента — короткий текст типа «Bullish momentum detected» или «Volume spike on BTC» вместо технических деталей о копировании
- [ ] **UX-02**: DecisionFeed показывает «AI thought process» — выдуманные но правдоподобные объяснения решений (рандом из пула фраз)
- [ ] **UX-03**: Нигде в UI нет слов «copy», «donor», «wallet» — только «AI Decision», «Signal», «Analysis»

### Deploy

- [ ] **DEP-01**: Production startup команда — один скрипт запускает build + server
- [ ] **DEP-02**: PM2 config — сервер автоматически перезапускается при крэше и после reboot VPS
- [ ] **DEP-03**: nginx reverse proxy config — порт 3001 доступен на 80/443
- [ ] **DEP-04**: `.env` правильно заполнен на продакшене — пошаговая инструкция
- [ ] **DEP-05**: Сайт открывается по IP/домену из браузера

### Bot Config

- [ ] **BOT-01**: Ясная инструкция куда вставлять donor-адреса кошельков
- [ ] **BOT-02**: После добавления кошельков бот начинает работать без изменения кода

## v2 Requirements

- HTTPS через Let's Encrypt
- Nav-ссылки Leaderboard и $FIVE ведут на реальные страницы
- Monitoring если сервер упал

## Out of Scope

| Feature | Reason |
|---------|--------|
| Пользовательские аккаунты | Read-only витрина |
| Реальная AI-логика | Копитрейдинг достаточен |
| Мобильное приложение | Веб достаточно |
| Тесты | Слишком маленький проект |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 1 | Pending |
| FIX-02 | Phase 1 | Pending |
| FIX-03 | Phase 1 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 2 | Pending |
| DEP-01 | Phase 3 | Pending |
| DEP-02 | Phase 3 | Pending |
| DEP-03 | Phase 3 | Pending |
| DEP-04 | Phase 3 | Pending |
| DEP-05 | Phase 3 | Pending |
| BOT-01 | Phase 3 | Pending |
| BOT-02 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 13 total
- Mapped to phases: 13
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-23*
