# Open Shelter — Inventory Integration Concepts

A public prototype gallery of **20 individually addressable webpages** for a possible inventory extension to [The Open Shelter’s existing website](https://theopenshelter.org/).

**This is not the shelter's website or a live inventory service.** Every quantity, transaction, and request in these demos is fictional. The public-facing concepts are ideas for extending the existing [Needs List](https://theopenshelter.org/needs-list/). Staff pages are intentionally accessible **only as non-sensitive public prototypes**; any real staff system requires authentication, authorization and a backend.

## Pages

The GitHub Pages source is **main branch → /docs**. After GitHub Pages is enabled, the gallery URL is `https://nate27624.github.io/OpenShelter/`. Each design has a separate URL in `/concepts/` (for example, `/concepts/04-quick-intake.html`).

Pages 01–20 include: dashboard, directory, categories, quick intake, detailed intake, distribution, corrections, shortages, expiration batches, visibility, public needs, request approval, QR drop-off, photo catalog, locator, import, history, thresholds, guided intake, and volunteer actions.

The designs are simple HTML, CSS and JavaScript with no dependencies. Sample interactions share browser-local demo state using localStorage. Use **Reset demo data** to restore the original examples. Changes are *not* shared between browsers, visitors, or shelter staff.

## Integration approach

- Keep the existing WordPress/Astra website and existing navigation.
- Embed an optional, approved **public needs widget** into the current Needs List page or link to it. Do not replace the existing Amazon needs list.
- Host staff workflows behind a separate authenticated application or protected WordPress integration. Never expose live inventory via GitHub Pages.
- Use server-managed inventory movements, batch expiration records, minimum stock thresholds, and explicit publication approval.
- Validate the flows with shelter staff before implementation. The uploaded project brief explicitly prioritizes fast entry, stock in/out, low-stock alerts, expirations, and public/private access.

## GitHub Pages setup

If not yet enabled: open **Settings → Pages → Build and deployment → Deploy from a branch**, select **main**, **/docs**, then **Save**. GitHub Pages may take several minutes to publish. GitHub's repository Pages setting cannot be modified through the available connector.

No build step needed. Local testing can be done by opening `docs/index.html` in a browser.
