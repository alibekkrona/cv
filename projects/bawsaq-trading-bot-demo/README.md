# Bawsaq Trading Assistant

Public architecture snapshot of an experimental Telegram-based market
assistant.

This repository is not a rewritten Flask demonstration and it is not a claim
that an autonomous trading system is already complete. It contains selected
modules from the real Node.js project so that a technical reviewer can inspect
the actual application structure, security boundary, data model, and current
product direction.

## What The Project Is

Bawsaq combines three interaction surfaces:

1. a Telegram bot built with Telegraf;
2. a Telegram Mini App served by Express;
3. an administrator workflow for users and trade signals.

The current implementation provides a controlled environment for:

- onboarding Telegram users;
- approving or rejecting access;
- validating Telegram Mini App sessions;
- viewing selected cryptocurrency market data;
- creating, reviewing, publishing, closing, and canceling trade signals;
- exposing separate user and administrator API surfaces.

The longer-term product direction is a trading automation platform. Automated
order execution, exchange-account custody, risk allocation, and portfolio
management are not represented as completed features in this snapshot.

## Why This Project Matters

The main engineering problem is not displaying a few market prices. It is
building a trustworthy boundary between a social interface, authenticated
users, market information, administrative decisions, and any future financial
execution.

That boundary requires:

- identity verification based on Telegram-signed data;
- explicit access states;
- role-aware APIs;
- validated signal input;
- controlled lifecycle transitions;
- persistent audit-friendly records;
- a clear separation between information and execution.

## Real Technology Stack

- Node.js 20;
- Express;
- Telegraf;
- Telegram Mini Apps;
- EJS and browser-side JavaScript;
- MongoDB and Mongoose;
- Joi validation;
- Binance public market-data API;
- Docker Compose.

The source project currently contains 41 source files and approximately 3,275
lines of JavaScript. This public snapshot deliberately keeps only the modules
that explain its architecture without exposing credentials or pretending that
unfinished functionality is production-ready.

## System Shape

```text
Telegram user
    |
    +--> Telegraf bot commands and callback actions
    |
    +--> Telegram Mini App
             |
             +--> signed initData validation
             +--> user/access lookup
             +--> market and signal APIs
             +--> administrator APIs
                         |
                         +--> application services
                                      |
                                      +--> MongoDB models
                                      +--> Binance market API
```

The Express process is the composition root. It connects MongoDB, configures
the EJS and static-file layers, registers Mini App APIs, registers Telegram bot
routes, starts the HTTP server, and launches the bot.

See [docs/architecture.md](./docs/architecture.md) for a more detailed map.

## Authentication Boundary

A Telegram Mini App does not authenticate itself merely by sending a Telegram
user ID. The client receives `initData`, signed by Telegram, and the server must
verify it.

The implementation in
[`src/Util/telegramMiniApp.js`](./src/Util/telegramMiniApp.js):

1. extracts `initData` from a header, authorization value, body, or query;
2. builds Telegram's canonical data-check string;
3. derives a secret from the bot token;
4. calculates the expected HMAC-SHA256 hash;
5. compares hashes with `crypto.timingSafeEqual`;
6. rejects expired payloads;
7. returns the authenticated Telegram user only after validation.

This is the security boundary used before resolving application access.

## User Access Model

The user model uses an explicit state machine:

```text
new -> pending -> approved
               -> rejected
```

Administrators are configured separately from ordinary access approval.

[`src/Application/UserService.js`](./src/Application/UserService.js) contains:

- Telegram-profile upsert;
- administrator-ID resolution;
- access applications;
- approval and rejection;
- paginated administration queries;
- access-state formatting.

[`src/Infrastructure/Database/Model/UserModel.js`](./src/Infrastructure/Database/Model/UserModel.js)
persists both the current state and decision metadata such as who approved or
rejected a user and when.

## Market Data

[`src/Application/MarketDataService.js`](./src/Application/MarketDataService.js)
requests Binance's public 24-hour ticker endpoint and normalizes a deliberately
small supported-symbol set:

- `BTCUSDT`;
- `ETHUSDT`;
- `SOLUSDT`.

This module is intentionally an information adapter. It does not place orders
and does not require exchange-account credentials.

## Trade Signal Lifecycle

Signals are not stored as unstructured chat messages. They have validated
fields and controlled states.

Core fields:

- symbol;
- side;
- entry zone;
- stop loss;
- take profit;
- comment;
- author;
- publication time.

Lifecycle:

```text
draft -> active -> closed
   |        |
   +--------+-> canceled
```

[`src/Application/SignalService.js`](./src/Application/SignalService.js)
enforces transition rules:

- only drafts may be edited;
- only drafts may be published;
- only active signals may be closed;
- drafts and active signals may be canceled;
- public queries return active signals only.

The corresponding Mongoose schema is available in
[`src/Infrastructure/Database/Model/SignalModel.js`](./src/Infrastructure/Database/Model/SignalModel.js).

## API Separation

The selected routes show two distinct HTTP surfaces.

User API:

```text
GET /api/mini-app/me
GET /api/mini-app/dashboard
GET /api/mini-app/profile
GET /api/mini-app/market
GET /api/mini-app/signals
GET /api/mini-app/signals/:signalId
```

Administrator API:

```text
GET    /api/mini-app/admin/users
POST   /api/mini-app/admin/users/:telegramId/approve
POST   /api/mini-app/admin/users/:telegramId/reject
DELETE /api/mini-app/admin/users/:telegramId

GET   /api/mini-app/admin/signals
POST  /api/mini-app/admin/signals
PATCH /api/mini-app/admin/signals/:signalId
POST  /api/mini-app/admin/signals/:signalId/publish
POST  /api/mini-app/admin/signals/:signalId/close
POST  /api/mini-app/admin/signals/:signalId/cancel
```

The route files are included because they communicate the product boundary more
clearly than a fabricated demo screen.

## Repository Map

```text
.
|-- src/
|   |-- index.js
|   |-- Application/
|   |   |-- MarketDataService.js
|   |   |-- SignalService.js
|   |   |-- UserService.js
|   |   `-- DashboardService.js
|   |-- Infrastructure/
|   |   |-- Database/
|   |   `-- Telegram/
|   |-- Interface/
|   |   |-- Controller/
|   |   |-- Middleware/
|   |   `-- Route/
|   `-- Util/
|-- public/mini-app/
|-- infrastructure/
|-- docs/
|-- package.json
`-- .env.example
```

The browser assets are real Mini App JavaScript and CSS from the source
project. They are included to demonstrate the client-side application surface,
not as a standalone mockup.

## Infrastructure

The development topology consists of:

- one Node.js application container;
- one MongoDB container;
- source mounting for iterative development;
- a persistent MongoDB volume;
- environment-based Telegram and session configuration.

The public copy uses placeholder environment values only. No bot token,
session secret, user identifier, or private exchange credential is included.

## Current Boundary And Next Evolution

Implemented now:

- Telegram bot and callback flow;
- Mini App HTTP surface;
- Telegram signature validation;
- user approval workflow;
- admin/user separation;
- public market-data adapter;
- trade-signal lifecycle;
- MongoDB persistence;
- Docker development environment.

Natural next capabilities:

- exchange-adapter interface;
- encrypted exchange credential storage;
- paper-trading executor;
- risk and position-sizing policy;
- idempotent order commands;
- execution reconciliation;
- portfolio and P&L accounting;
- alerts and strategy evaluation;
- test coverage around financial state transitions.

These future capabilities should be introduced behind explicit policies and
auditable execution boundaries. A trading bot should not evolve from signal
display to live order placement through an implicit shortcut.

## Public Snapshot Boundary

This repository contains selected real project modules and publication-oriented
documentation. It excludes:

- live Telegram credentials;
- private user records;
- private exchange credentials;
- deployment secrets;
- unfinished experiments unrelated to the architecture;
- claims of live automated trading.

The goal is to let a reviewer inspect the engineering direction and actual code
shape without confusing a portfolio snapshot with the complete private
workspace.
