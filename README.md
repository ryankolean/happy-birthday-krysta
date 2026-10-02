# Happy Birthday Krysta

Planning repo for Krysta's 35th birthday trip to Mexico, **29 December 2026 to 8 January 2027**. Source of truth for dates, costs, the itinerary and what still has to be booked. The group-facing website gets built from `data/`.

## The shape of it

| | |
|---|---|
| **Mexico City** | 29 Dec to 3 Jan, 5 nights, 8 people |
| **Riviera Maya** | 3 Jan to 8 Jan, 5 nights, 6 people |
| **The birthday** | Saturday 2 January |
| **Whole trip, all 8** | about $38,700 |
| **Per person, full trip** | about $4,876 |
| **Per person, city only** | about $4,741 |

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

Not built yet. The content in `data/` is ready for a static site generator. Framework undecided: see `docs/open-questions.md`.

**Before publishing anything:** this repo is private because a public trip itinerary broadcasts exact dates when eight people's homes are empty. Keep the published site free of street addresses, confirmation numbers, flight record locators and anyone's contact details. Those live in `private/`, which is gitignored.

## Full working

The detailed research, including every option considered and rejected, is on the Jira TRAVEL board. This repo is the distilled version.
