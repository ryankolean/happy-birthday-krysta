# Happy Birthday Krysta

Planning repo for Krysta's 35th birthday trip to Mexico, **29 December 2026 to 8 January 2027**. Source of truth for dates, costs, the itinerary and what still has to be booked. The group-facing website gets built from `data/`.

## The shape of it

| | |
|---|---|
| **Mexico City** | 29 Dec to 3 Jan, 5 nights, 8 people |
| **Riviera Maya** | 3 Jan to 8 Jan, 5 nights, 6 people |
| **The birthday** | Saturday 2 January |
| **Per person, doing both legs** | about $4,876 |
| **Per person, city only** | about $4,741 |

Every figure in this repo is **per person**. Group totals are deliberately not tracked: people pay for themselves, and a whole-trip number nobody writes a cheque for only made the figures harder to read.

The one exception is lodging, which carries the whole-place price alongside the per-person split, because a house and a resort residence are booked whole and then divided evenly.

Costs cover flights, lodging, the anchor dinners and the booked activities. They exclude personal spending, travel insurance and anything bought on the ground.

## Repo layout

```
data/        YAML. Single source of truth. The website reads these.
docs/        Narrative reference. Research, comparisons, decisions.
private/     Gitignored. Confirmation numbers, addresses, contact details.
```

Change a fact in `data/`, not in `docs/` and not in the site templates.

| File | Holds |
|---|---|
| `data/trip.yml` | Dates, legs, headcount, exchange rate |
| `data/travelers.yml` | Who is on which leg, and the bed configuration |
| `data/flights.yml` | Every flight, priced |
| `data/lodging.yml` | Both properties, rates, cancellation terms |
| `data/itinerary.yml` | Day by day, all eleven days |
| `data/budget.yml` | Every line item, with status |
| `data/tasks.yml` | Open tasks, owners, deadlines |
| `data/places.yml` | Every dinner, bar, market and sight on the map |
| `data/geocache.json` | Generated. Coordinates keyed by address, do not hand-edit |

## Adding a place to the map

Append to `data/places.yml` with at least a name, a category and an address:

```yaml
  - name: Rosetta
    category: fine          # stay | fine | casual | bar | market | spot
    address: Colima 166, Roma Norte, Mexico City
    neighborhood: Roma Norte
    note: One Michelin star, in a Roma mansion.
    booking: OpenTable.
```

Then:

```bash
npm run geocode && npm run build
```

`geocode` looks up only the addresses it has not seen before and writes them to `data/geocache.json`, so nothing already resolved gets fetched twice. It uses OpenStreetMap's Nominatim at one request per second, so leave it out of CI.

If a place comes back unresolved, the map page names it and the fix is a more specific address. Naming the venue itself often works better than the street (`Quintonil, Isaac Newton, Polanco` resolved when the street number alone did not). You can also set `lat:` and `lon:` directly on the entry to skip geocoding.

**Check what comes back.** The Anthropology Museum first geocoded about 4 km off, because the address had no street number and Nominatim matched the length of Reforma instead. Open the map and look before trusting a pin.

| Doc | Covers |
|---|---|
| `docs/dining.md` | Birthday dinner options and booking windows |
| `docs/nye.md` | New Year's Eve: private chef, potluck, galas |
| `docs/decisions.md` | What was decided and what it beat |
| `docs/open-questions.md` | Known unknowns, with the cost of each |

## Status

Nothing is booked. Both properties were verified available on 2 October 2026. The two things gating everything else are the **New Year's Eve plan** and the **DTW to MEX flight**, which has exactly one nonstop a day on a 130-seat aircraft in holiday week.

See `data/tasks.yml` for what is urgent and `docs/open-questions.md` for what is unresolved.

## Website

**Live at [ryankolean.github.io/happy-birthday-krysta](https://ryankolean.github.io/happy-birthday-krysta/)**

Eight pages, generated from `data/` and `docs/` by `scripts/build.mjs`, deployed by GitHub Actions on every push to `main`.

```bash
npm install
npm run build     # writes site/
npm run serve     # builds, then serves site/ on :4199
```

**Never hand-edit anything under `site/`.** It is generated output and the next build overwrites it. Change `data/*.yml` or `docs/*.md` instead.

### This repo is public, so the discipline matters

A trip itinerary names the exact dates that eight people's homes sit empty. The repo is public so that GitHub Pages works on a free plan, which means **everything committed here is world readable, permanently.**

Keep out: street addresses, confirmation numbers, flight record locators, card details, full legal names, dates of birth, passport numbers, and travelers' personal phone numbers. Those live in `private/`, which is gitignored. There is a template at `docs/private-template.md`.

Published business numbers and public listing URLs are fine. Someone's mobile is not.

The site sends `noindex, nofollow` and ships a `robots.txt` that disallows everything, so it stays link shareable without turning up in search. That is a courtesy, not a security control.

## Full working

The detailed research, including every option considered and rejected, is on the Jira TRAVEL board. This repo is the distilled version.
