# Open Shelter — Inventory Management Prototype

A **single, cohesive inventory management experience** proposed as a potential integration with [The Open Shelter’s existing website](https://theopenshelter.org/).

**Live prototype:** https://nate27624.github.io/OpenShelter/concepts/

All pages under the previous `/concepts/<name>.html` paths redirect into the relevant section of the unified inventory hub. The standalone concept gallery is retired.

## Scope and project requirements

The [Open Shelter project brief](./docs/) asks for a long-term, user-friendly way to record **donations received** and **supplies distributed**, monitor **low stock**, track **expiring supplies**, and choose which supply needs may be **public**. The current shelter [Needs List](https://theopenshelter.org/needs-list/) already explains donation categories and links to an Amazon list. The prototype is intended to complement that website, **not replace it**.

The application has **two distinct views** in its topmost navigation: **Public Facing** (default, `#public`) displays only the visitor inventory and purchase-report workflow, while **Admin View** (`#admin`) opens the management demonstration directly on **Inventory**, with Inventory, Receive, Distribute, Alerts, and Activity & Corrections tabs. The public view does not display the management navigation or admin controls.

- **Inventory:** The single canonical item list drives receiving, distribution, alerts and Public Facing. Each item has one total derived from its per-location quantities. The Inventory tab shows shelf breakdowns, supports location search, and offers adding, renaming, removing unused locations, and relocating quantities without changing the item total.
- **Receive donations:** A pending purchase-reports queue at the top. **Mark received** opens a staff confirmation form where storage location (including a new location) and expiration date are optional; stock increases and a dated lot is recorded only after **Confirm receipt**. **Dismiss** discards an unreceived report without changing stock. The regular detailed donation intake form follows. The detailed form uses the canonical item dropdown, supports new supply types, and includes an **optional storage location** dropdown with an inline **Add a new location** option. Unspecified locations are tracked as **Unassigned** rather than guessed.
- **Distribute supplies:** Full distribution form with canonical item selection, quantity and reason, with an optional source shelf dropdown. If no location is provided, the demo deducts from unassigned stock first, then stored shelves in alphabetical order; selecting a shelf avoids implicit shelf allocation. Distribution cannot make a quantity negative.
- **Alerts & expiration:** Low-stock alerts, adjustable item-specific minimum thresholds, and batch-level expiration watch.
- **Public Facing (public landing view):** A clean visitor inventory table grouped by category, with **Item and on-hand count → More needed → I've purchased this** in consistent, aligned columns. The public count appears beneath each item name with **On the way** beneath it. The raw target number is not shown publicly: **More needed** is calculated as `max(0, minimum stock target - on hand - donor-reported pending)`. Unit labels are intentionally omitted in the public view until a trustworthy item/unit catalog is available. Search, category filtering, purchase reporting, and privacy controls remain supported; pending quantities are unverified.
- **Activity & Corrections:** Transaction history and a unified per-item editor. Select a supply from the physical-count correction dropdown, adjust its recorded count or public-visibility toggle, and save both settings together. The Public Facing preview then reflects saved visibility and stock updates.

## Canonical inventory data

Existing demo inventory is migrated in place from a single `location` string per item into per-item `stockLocations` quantities. Item `qty` is recalculated from the location entries after every stock operation. Staff can receive the same item at multiple shelves without duplicating the canonical item, and Inventory exposes the breakdown. The location-name registry is shared across receiving, distribution and stock relocation. New item types default to private visibility. These fields live in the current browser's demo data, not a backend inventory service.

## Technical approach

This is a GitHub Pages-hosted **demonstration**, written in vanilla HTML/CSS/JavaScript. **The Admin View is not protected or authenticated**; its separate navigation and `#admin` URL fragment are organizational only. Before storing real shelter records, staff functionality would require a separate authenticated application/backend, server-side authorization, and private data access controls. The pages require no build tooling or backend. The mock inventory is stored only in browser `localStorage` and is **not shared between people, devices or browsers**. **Donor purchase reports are also local to the same browser:** a donor on another device does not create a staff-visible report; nothing is sent to the shelter. The purchase-report and receipt-confirmation interactions are only a proof of concept and should not be promoted as a live donation intake channel. Do not collect personal contact details or payments in this prototype. Reset using the **Reset example data** link above the current section. **Do not enter real or sensitive data.**

Proposed production architecture: retain the existing WordPress site for the public donor experience; add an approved public inventory availability display and donor purchase-report form; create a secure, authenticated inventory API and staff UI with role-based access, receipt-confirmation queue, server-side audit log, email or workflow notifications as staff prefer, validation/rate limiting for public submissions, and reliable reconciliation of batches and quantity movements. A donor-reported purchase is **not physical inventory** until staff verifies delivery. Do not publish private inventory through GitHub Pages.

## Files

- `docs/concepts/index.html`: public unified app entry point.
- `docs/assets/app.js`: state, inventory logic and seven integrated sections.
- `docs/assets/style.css`: visual style and responsive layout.
- `docs/index.html`: redirect to unified entry point.
- `docs/concepts/01-*.html` to `20-*.html`: backwards-compatible redirects only, **not** separate experiences.

## GitHub Pages setup

The repository is published from `main` / `docs`. See [repository Pages settings](https://github.com/Nate27624/OpenShelter/settings/pages). All prototype data and quantity values are fictional.

## Staff validation before implementation

Confirm actual item taxonomy and storage labels, which items need batch expiration tracking, minimum quantities, which supplies and quantities can be shown to visitors, how often public availability should refresh, who may edit visibility and counts, and whether one-click inventory actions are usable during a busy donation shift. Inventory on hand does not necessarily equal inventory available for distribution; production data may require reservations or eligibility rules.

## Visual integration with The Open Shelter website

The public prototype deliberately follows the existing [theopenshelter.org](https://theopenshelter.org/) content-page conventions rather than a separate SaaS dashboard aesthetic: official red house logo asset, the seven primary website navigation links, a centered white page, uppercase headings, plain underlined section tabs, simple tables, standard rectangular input fields and buttons, and a quiet footer. The style is independently written to resemble the site's Astra/WordPress presentation; it does not import the site's theme files or modify its WordPress installation. The demo notice remains visible so it cannot be mistaken for a secure staff system.
