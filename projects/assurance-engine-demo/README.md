# Distribution Assurance Platform

A public architecture snapshot of a real browser-automation and verification
system developed for monitoring expected digital-product placement on
third-party websites.

The original project began as a lobby scraper. It evolved into an
evidence-driven assurance platform capable of explaining not only whether a
product was found, but whether the source, market, lobby, category and
extraction process were trustworthy enough to support that business result.

This repository is not a rewritten Python demonstration. It reflects the real
Node.js architecture, infrastructure topology and engineering decisions of the
working project.

## The Business Problem

A promotion or distribution agreement creates an expectation:

```text
operator
  -> brand and market
  -> promoted product
  -> expected category
  -> expected placement or visibility
  -> promotion period and responsible account manager
```

The company must verify that the expected product is actually visible on the
external brand website.

This is more difficult than ordinary page scraping because target sites are:

- dynamic JavaScript applications;
- market- and country-dependent;
- protected by geographic restrictions;
- sometimes available only through specific VPN routes;
- capable of redirecting to service shells or restriction pages;
- built with changing navigation and category structures;
- occasionally protected by login, CAPTCHA or anti-bot systems;
- able to use Shadow DOM or client-side rendering;
- inconsistent across desktop, mobile and regional variants.

## Why `Found / Not Found` Was Insufficient

An early scanner could receive HTML and search it for a product name. When the
product was missing, the result looked like `not found`.

But the same output could mean:

- the product was genuinely absent;
- the wrong market was opened;
- the VPN route failed;
- a geographic restriction page loaded;
- the lobby never loaded;
- the requested category was not selected;
- extraction inspected the wrong DOM;
- authentication was required;
- CAPTCHA blocked access;
- the browser pipeline failed.

Treating all of these as the same business result creates false negative
reports.

## Evidence-First Assurance Model

The platform proves milestones in order:

```text
source reached
  -> lobby verified
  -> requested category verified
  -> product collection verified
  -> placement assessed
```

Only after the preceding milestones pass may the engine claim:

- `placement_verified`;
- `expected_placement_not_observed`.

Otherwise the business verdict remains:

- `placement_unverifiable`.

See [Assurance Architecture](docs/assurance-architecture.md).

## Semantic Result Separation

Every assessment separates four different questions.

### Business Verdict

What may the business safely conclude?

```text
placement_verified
expected_placement_not_observed
placement_unverifiable
```

### Technical Condition

What happened technically?

```text
access.*
content.*
navigation.*
extraction.*
pipeline.*
placement.*
```

### Resolution Disposition

How should the condition be handled?

```text
none
automatically_recoverable
noc_action_required
development_required
human_review_required
```

### Owner

Which part of the organization or system should react?

```text
business
NOC / operations
development
assurance engine
human reviewer
```

This prevents a technical access problem from becoming an incorrect commercial
conclusion.

## Adaptive Resolution Loop

The project is designed to grow through reusable conditions and capabilities,
not through an endless collection of brand-name `if` statements.

```text
browser evidence
  -> Assurance Model
  -> Condition Registry
  -> Capability Registry
  -> deterministic or local-LLM advisor
  -> Policy Guard
  -> Controlled Executor
  -> before/after evidence comparison
  -> verified profile feedback
```

### Condition Registry

Classifies stable, brand-independent technical conditions and assigns a failed
milestone, disposition and owner.

### Capability Registry

Describes reusable responses such as:

- retrying a bounded host variant;
- retrying a verified category route;
- selecting an allowed access route;
- requesting authentication or human review.

A capability is executable only when it has:

1. an applicable condition;
2. a bounded decision contract;
3. deterministic policy;
4. a controlled executor;
5. before/after evidence verification;
6. regression coverage.

### Brand Profiles

Brand-specific knowledge is data, not core scanner logic:

- allowed hosts;
- market and VPN preferences;
- verified category routes;
- login/session configuration;
- successful evidence sources;
- bounded strategy history.

## Promotion-Oriented Domain

The project is evolving from manually scanning a product and all linked sites
toward scanning a promotion target:

```text
Promotion
  -> Promotion Target
      -> Operator
      -> Brand / market
      -> Product
      -> Category expectation
      -> Promotion dates
      -> Responsible account manager
      -> Assurance result
```

This model aligns the scanner with the actual operational workflow: verify only
the products and placements that the business expects during a promotion.

## Real Technology Stack

- Node.js and CommonJS;
- Express and EJS;
- MongoDB and Mongoose;
- Puppeteer, `puppeteer-extra` and real-browser/stealth tooling;
- OpenVPN control service;
- OpenAI-compatible strategy advisor;
- local Ollama / Llama strategy advisor;
- Bootstrap administrative interface;
- Node.js test runner;
- Docker Compose.

The [package.json](package.json) preserves the representative runtime
dependency surface while exposing only commands that work inside this public
snapshot.

## Infrastructure

The original topology is included without runtime secrets:

- [development Compose](infrastructure/docker-compose.development.yml);
- [production Compose](infrastructure/docker-compose.production.yml);
- [application image](infrastructure/Dockerfile.app);
- [VPN service image](infrastructure/Dockerfile.vpn).

```text
browser application
  shares network namespace with VPN service
        |
        +-- OpenVPN access routes
        +-- remote MongoDB in production
        +-- local Ollama advisor
        +-- optional OpenAI-compatible advisor
```

The application container shares the VPN network namespace so browser traffic
uses the selected access route.

## Source Architecture

```text
src/
├── Application/
│   ├── Assurance/
│   ├── Strategy/
│   ├── Service/
│   └── UseCase/
├── Domain/
├── Infrastructure/
│   ├── Database/
│   ├── Scraping/
│   ├── Strategy/
│   └── Logging/
└── Interface/
    ├── Controller/
    ├── Middleware/
    ├── Route/
    └── View/
```

The project was restructured from a large monolithic implementation into
layered application, domain, infrastructure and interface boundaries.

## Testing Surface

The real project includes focused tests for:

- assurance milestone and verdict derivation;
- runtime assurance gating;
- condition and capability registry completeness;
- strategy context construction;
- structured advisor decisions;
- local LLM integration;
- policy guards;
- controlled strategy execution;
- profile feedback;
- terminal evidence;
- page readiness;
- promotion assurance;
- administrative result visibility.

Relevant scripts are visible in `package.json`, including `test:assurance`,
`test:promotion`, `test:strategy` and focused strategy suites.

## Runnable Reference Implementation

The [`examples/reference`](examples/reference/) directory now contains a
coherent public-safe implementation rather than two shortened snippets.

It includes 17 JavaScript files and approximately 1,300 lines covering:

- business verdict and milestone derivation;
- evidence scoring and before/after comparison;
- condition and capability registries;
- assurance and AI input gates;
- deterministic capability selection;
- host, market, category-route, confidence, and applicability policy checks;
- controlled execution through an injected attempt runner;
- profile feedback accepted only from verified improvements;
- promotion-target validation;
- end-to-end resolution orchestration;
- neutral fixtures, a runnable demo, and 10 automated tests.

Run it without external services:

```bash
npm run demo
npm test
```

Start with the [reference implementation guide](examples/reference/README.md)
or inspect the [full pipeline diagram](docs/assurance-architecture.md).

The implementation is independently written from the architecture and does
not contain company data or copied corporate modules.

## Public Boundary

This snapshot does not publish:

- real operators, brands, promotions or games;
- credentials and authentication secrets;
- VPN configuration files;
- production URLs;
- customer data;
- raw scan traces and screenshots;
- the complete corporate repository.

It exists to show the scale, architecture, technical reasoning and evolution of
the system without disclosing operational data.

## Portfolio Context

This project demonstrates:

- modernization of a large browser-automation system;
- business-first domain analysis;
- browser and VPN infrastructure;
- dynamic-site and anti-bot investigation;
- evidence-driven decision modeling;
- deterministic and LLM-assisted classification;
- policy-controlled automation;
- extensible condition/capability architecture;
- full-stack administrative workflows;
- production-oriented Docker infrastructure;
- test-driven evolution from scraper to assurance platform.
