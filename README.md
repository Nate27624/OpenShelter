# Open Shelter Inventory Integration Concepts

This repository contains a **20-page UI prototype gallery**, designed as a potential extension to the existing [The Open Shelter website](https://theopenshelter.org/), with its public [Needs List](https://theopenshelter.org/needs-list/) as an integration point.

**Prototype only:** All sample stock quantities, requests and movements are fictional. Pages are intentionally publicly viewable for design review; staff workflows must be protected by login and a server-side permissions system before using any real data.

## Publishing

GitHub Pages content: `main` branch, `/docs` folder. Public gallery has its own entry point at `docs/concepts/index.html`.

GitHub Pages is enabled. The publishing source must target the `main` branch and the `/docs` directory. See [Pages settings](https://github.com/Nate27624/OpenShelter/settings/pages).

After it publishes, the gallery will be available at:

https://nate27624.github.io/OpenShelter/concepts/

Each UI has its own URL, such as:

https://nate27624.github.io/OpenShelter/concepts/04-quick-intake.html

## What it contains

Twenty dedicated concept webpages covering dashboard, inventory list, categories, one-click and detailed donation intake, distribution, count corrections, low stock alerts, expiration batches, publication controls, public needs, approval flows, QR-assisted drop-offs, photo catalog, shelf locator, CSV preview, inventory history, threshold settings, guided intake and volunteer actions.

The `docs/assets/app.js` and `docs/assets/style.css` files are shared by all concepts. There are no external dependencies or remote APIs. Demo interactions share state via localStorage on the same browser and can be reset from the top bar.

The user-provided project PDF and the shelter's current public website inform this prototype. Any real integration will require approval and a secure inventory backend.

## Visual design alignment

The prototype retains the official Open Shelter house mark and links to the original WordPress website. A single, unified stylesheet (`docs/assets/style.css`) now defines typography, branded accent colors, gallery cards, forms, tables, alerts, keyboard focus styles, and responsive breakpoints. The public gallery has a prominent hero and two distinct review paths: donor-facing and staff-facing concepts.

**Design boundary:** This is a deliberate, independently authored design proposal informed by the existing WordPress/Astra website, not a pixel-identical copy of the site's installed theme. The staff designs remain fictional public mockups, not real inventory tools.

## Review

Open `https://nate27624.github.io/OpenShelter/concepts/` to explore all 20 unique HTML URLs. Internal links move between concepts. The examples share only browser-local test data. Reload the site and use **Reset demo** to restore defaults when needed.
