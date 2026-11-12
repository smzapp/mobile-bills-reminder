# Nudge

Bills, payments and appointments, with a different ringtone for each part of your life.

Nudge is a local-first Android app (iOS-compatible architecture) built with Expo SDK 58, Expo
Router and SQLite. It works with no account, no backend and no internet connection.

## What it does

- **Bills** — create, edit, archive and restore bills; record full or partial payments; keep a
  permanent payment history; roll recurring bills forward automatically when they are settled.
- **Schedule** — meetings, appointments, classes, services, events and tasks, as a grouped list or
  a month calendar that also shows bill due dates.
- **Spending** — monthly total against a budget, a six-month trend, a category breakdown and a
  combined transaction list of bill payments and standalone expenses.
- **Categories & ringtones** — every category has its own notification sound, colour and icon, and
  any single bill or activity can override its category's ringtone.
- **Archive** — soft-delete that keeps history, with restore and an explicit permanent delete.
- **App lock** — optional 5-digit PIN, hashed with a per-device salt in the OS keystore.

## Commands

```bash
npx expo start
```

```bash
npm test
```

```bash
npm run typecheck
```

```bash
npx expo lint
```

```bash
npm run generate:tones
```

```bash
npx expo-doctor
```

## Project structure

```
src/
  app/                  Expo Router routes (every file here is a screen)
    (tabs)/             Home, Bills, Schedule, Spending, More
    bills/              detail, create, edit, payment history
    activities/         detail, create, edit
    expenses/           create, edit
    categories/         list and editor
    archive/  settings/  about.tsx
  components/           ui kit, item rows, calendar, charts, security
  features/             form and sheet logic per domain
  database/
    schema/             migrations and row types
    repositories/       all SQL lives here
  services/
    notifications/      channels, permissions, scheduler
    audio/              ringtone preview
    security/           PIN hashing
  providers/            settings, data version, notifications, app lock
  hooks/  constants/  types/  utils/
assets/sounds/          generated notification tones + their spec
scripts/generate-tones.js
```

Business logic stays out of the screens: repositories own SQL, `services/` owns notification and
audio side effects, and `utils/` holds the pure money, date, recurrence and status rules that the
test suite covers.

## Data

SQLite via `expo-sqlite`, opened through `SQLiteProvider` with a versioned `onInit` migration
(`PRAGMA user_version`). Foreign keys and WAL are enabled on every connection.

Tables: `categories`, `bills`, `bill_payments`, `activities`, `reminders`, `expenses`, `budgets`,
`notification_channels`, `app_settings`.

Rules worth knowing:

- **Money is stored as integer minor units** (centavos). No floating-point arithmetic touches a
  financial value; `src/utils/money.ts` is the only place amounts are parsed or formatted.
- **A bill is an obligation, not an expense.** Only recorded payments count towards spending.
- **Partial payments** are individual rows. The balance is derived, never stored.
- **Recurring bills** generate the next occurrence when they are fully paid, with no payment rows
  of their own, so history is never duplicated or overwritten.
- **Archiving never deletes financial history.** Permanent deletion is a separate, confirmed action
  available only from the Archive screen.

## Notifications on Android

The notification engine lives in `src/services/notifications/`. Screens never schedule anything
directly: they write to SQLite, then call `syncBillReminders` / `syncActivityReminders`, which
cancel the old OS notifications and schedule new ones from the database.

### Channel versioning

Android notification channels are immutable once created — only the name and description can be
changed, never the sound. So:

- Each category owns a channel id of the form `<categoryId>_v<n>`.
- Changing a category's ringtone creates `<categoryId>_v<n+1>` and deletes the old channel.
- An item that overrides its category ringtone is scheduled against a shared `tone_<toneId>_v<n>`
  channel, because on Android 8+ the channel decides the sound.
- The mapping is persisted in the `notification_channels` table.

### Reconciliation

`reconcileAllReminders` runs at app start and whenever the app returns to the foreground. It
rebuilds every scheduled notification from the database, which covers reinstalls, permission
changes, timezone changes, OS-dropped alarms and archived or completed items.

### Required native configuration

`app.json` already declares:

- `expo-notifications` plugin with the eight bundled sounds in `sounds`, so they are copied into
  `android/app/src/main/res/raw/` at build time.
- `android.permissions`: `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `VIBRATE`,
  `RECEIVE_BOOT_COMPLETED`.
- `android.package` / `ios.bundleIdentifier`: `com.nudge.reminder`.

Because `expo-notifications`, `expo-sqlite`, `expo-audio` and `expo-secure-store` contain native
code, **custom notification sounds require a development build** — Expo Go cannot play them:

```bash
npx expo run:android
```

```bash
npx eas-cli@latest build --profile development --platform android
```

### Honest limitations

- Android may delay reminders under Doze or battery optimisation. The Settings screen detects when
  exact alarms are not permitted and offers to request them, but no app can guarantee delivery.
- A force-stopped app fires nothing until it is reopened.
- "Ring until dismissed" is not possible with plain local notifications; it needs a full-screen
  intent and a foreground service, which this version does not ship.
- Nothing is backed up or synced. The database lives only on the device.

## Ringtones

The eight bundled tones are generated from plain waveforms by `scripts/generate-tones.js`, driven
by `assets/sounds/tone-specs.json`. They carry no third-party licence. Re-run
`npm run generate:tones` after editing the spec, then rebuild the app so Android picks up the new
`res/raw` files.

## Tests

`npm test` runs the Jest suite over the pure business rules: money parsing and formatting,
recurrence (including month-end clamping and catch-up), bill status derivation across the paid /
partial / overdue / archived matrix, and the date helpers that drive scheduling.

Notification delivery itself has to be verified on a real device: with the app open, backgrounded,
closed, with the phone locked, and after a restart.
