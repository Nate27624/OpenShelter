# Open Shelter — Inventory Management Prototype

A **single, cohesive inventory management experience** proposed as a potential integration with [The Open Shelter’s existing website](https://theopenshelter.org/).

**Live prototype:** https://nate27624.github.io/OpenShelter/concepts/

All pages under the previous `/concepts/<name>.html` paths redirect into the relevant section of the unified inventory hub. The standalone concept gallery is retired.

## Scope and project requirements

The [Open Shelter project brief](./docs/) asks for a long-term, user-friendly way to record **donations received** and **supplies distributed**, monitor **low stock**, track **expiring supplies**, and choose which supply needs may be **public**. The current shelter [Needs List](https://theopenshelter.org/needs-list/) already explains donation categories and links to an Amazon list. The prototype is intended to complement that website, **not replace it**.

The application now has one interconnected workflow:

- **Overview:** Inventory counts, critical shortages, near-expiration batches, activity, and quick intake.
- **Inventory:** Searchable categories, quantities, storage locations, public/private indicators and adjustments.
- **Receive donations:** One-click common items or detailed receipt; supports new supply types and optional expiration batches.
- **Distribute supplies:** Item, quantity and reason; avoids negative stock.
- **Alerts & expiration:** Low-stock alerts, adjustable item-specific minimum thresholds, and batch-level expiration watch.
- **Public needs:** Donor-facing needs preview with staff-only eligibility toggles.
- **Activity & corrections:** Transaction history and physical stock reconciliation.

## Technical approach

This is a GitHub Pages-hosted **demonstration**, written in vanilla HTML/CSS/JavaScript. The pages require no build tooling or backend. The mock inventory is stored only in browser `localStorage` and is **not shared between people, devices or browsers**. Reset using the left navigation control. **Do not enter real or sensitive data.**

Proposed production architecture: retain the existing WordPress site for the public donor experience; add an approved public needs widget; create a secure, authenticated inventory API and staff UI with role-based access, server-side audit log, and reliable reconciliation of batches and quantity movements. Do not publish private inventory through GitHub Pages.

## Files

- `docs/concepts/index.html`: public unified app entry point.
- `docs/assets/app.js`: state, inventory logic and seven integrated sections.
- `docs/assets/style.css`: visual style and responsive layout.
- `docs/index.html`: redirect to unified entry point.
- `docs/concepts/01-*.html` to `20-*.html`: backwards-compatible redirects only, **not** separate experiences.

## GitHub Pages setup

The repository is published from `main` / `docs`. See [repository Pages settings](https://github.com/Nate27624/OpenShelter/settings/pages). All prototype data and quantity values are fictional.

## Staff validation before implementation

Confirm actual item taxonomy and storage labels, which items need batch expiration tracking, minimum quantities, how staff approve a public need, who may edit counts and thresholds, and whether one-click inventory actions are usable during a busy donation shift.

## Visual integration with The Open Shelter website

The public prototype deliberately follows the existing [theopenshelter.org](https://theopenshelter.org/) content-page conventions rather than a separate SaaS dashboard aesthetic: official red house logo asset, the seven primary website navigation links, a centered white page, uppercase headings, plain underlined section tabs, simple tables, standard rectangular input fields and buttons, and a quiet footer. The style is independently written to resemble the site's Astra/WordPress presentation; it does not import the site's theme files or modify its WordPress installation. The demo notice remains visible so it cannot be mistaken for a secure staff system.
