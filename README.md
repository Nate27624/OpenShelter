# Open Shelter Inventory Integration Concepts

This repository contains a **20-page UI prototype gallery**, designed as a potential extension to the existing [The Open Shelter website](https://theopenshelter.org/), with its public [Needs List](https://theopenshelter.org/needs-list/) as an integration point.

**Prototype only:** All sample stock quantities, requests and movements are fictional. Pages are intentionally publicly viewable for design review; staff workflows must be protected by login and a server-side permissions system before using any real data.

## Publishing

GitHub Pages source: `main` branch, `/docs` folder.

To enable hosting: [Repository Settings → Pages](https://github.com/Nate27624/OpenShelter/settings/pages), then **Build and deployment → Deploy from a branch → main → /docs → Save**.

After it publishes, the gallery will be available at:

https://nate27624.github.io/OpenShelter/

Each UI has its own URL, such as:

https://nate27624.github.io/OpenShelter/concepts/04-quick-intake.html

## What it contains

Twenty dedicated concept webpages covering dashboard, inventory list, categories, one-click and detailed donation intake, distribution, count corrections, low stock alerts, expiration batches, publication controls, public needs, approval flows, QR-assisted drop-offs, photo catalog, shelf locator, CSV preview, inventory history, threshold settings, guided intake and volunteer actions.

The `docs/assets/app.js` and `docs/assets/style.css` files are shared by all concepts. There are no external dependencies or remote APIs. Demo interactions share state via localStorage on the same browser and can be reset from the top bar.

The user-provided project PDF and the shelter's current public website inform this prototype. Any real integration will require approval and a secure inventory backend.
