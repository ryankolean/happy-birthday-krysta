# happy-birthday-krysta

Planning repo for Krysta's 35th birthday trip to Mexico, 29 Dec 2026 to 8 Jan 2027. Holds the trip content and will hold the group-facing website.

## Hard rules

**This repo is private and must stay that way unless the PII question in `docs/open-questions.md` is resolved first.** A public trip itinerary broadcasts the exact dates eight people's homes are empty.

**Never commit:** street addresses, confirmation numbers, flight record locators, card or payment details, surnames, dates of birth, passport numbers, phone numbers of travelers, home addresses. Those go in `private/`, which is gitignored. Repo history is forever, so this discipline starts at the first commit.

**First names are fine, surnames are not.** Ryan decided this on 1 November 2026, because roles alone made the data unreadable when coordinating seven people. A first name plus a trip date is weak identification; a full legal name plus the dates a house is empty is not. So a bare first name is fine in `data/` and on the site, while `Firstname Lastname` is not and lives only in `private/roster.md`. The role ids stay as the keys, because the whole repo is wired to them.

Do not write a real surname here to illustrate the rule. That is exactly how this file leaked one on 1 November 2026. Use `Firstname Lastname` or a plainly fictional name. `npm run check:pii` scans every tracked file against the roster and is the thing that should have caught it.

Published business phone numbers and public listing URLs are fine. Someone's personal mobile is not.

## How the money works

**One card. Ryan's.** He fronts Casa KM, Dreams Jade, Pujol and the lucha libre, and everybody pays him back a single set amount. Nobody settles with a hotel, a resort or a restaurant directly, at any point, for anything. The only thing owed after the trip is each person's share of the Pujol drinks.

**The set amount is $2,346 for the six doing both legs and $304 for the one doing the city only.** It is not an estimate and not a target. It is four real charges divided by the heads on each, and the derivation lives in `data/budget.yml` under `set_amount_back_check`, which the costs page renders. Six at $2,346 plus one at $304 is $14,380 against $14,386.46 of charges, so the whole trip reconciles to $6.46 of rounding.

**A supplier's billing schedule is not this group's arrangement.** Dreams Jade wants one night per room at booking and the balance at check-in. That says when Ryan's card gets hit, not who pays. Every resort, hotel and restaurant on this trip has its own schedule and none of them changes who owes what. Read any sentence about when money moves as a fact about a supplier until it says otherwise explicitly.

**A sentence that contradicts `per_person.both_legs` is a bug.** Do not reason on top of it, do not reconcile it, do not invent a mechanism that makes both true. Find which one is wrong, fix it, and say so. On 10 November 2026 a stale sentence saying each room settles its own balance at the desk was read as the operating model, and an entire $467 shortfall was invented out of it that had never existed. `docs/decisions.md` records that at the top. If a figure here is ever doubted, redo the four lines in `set_amount_back_check` rather than arguing from prose.

**Who has paid is in `private/ledger.md` and never in `data/`.** What everybody owes is identical for everybody and is published. Who is behind is not, and this repo is world readable and permanent.

## Where things live

`data/*.yml` is the single source of truth. Change a fact there, not in `docs/` and not in a site template.

`docs/*.md` is narrative reference: research, comparisons, the decision log, open questions.

`private/` is gitignored. Confirmation numbers and real contact details.

## Conventions

- **Dates** are ISO: `2027-01-02`. **Times** are 24 hour: `"19:30"`, quoted in YAML so they stay strings.
- **Money** is USD unless the key says `mxn`. Convert at the rate in `data/trip.yml`, currently 18.79 MXN/USD, and update that one place when it moves. Nothing in the build converts currency, so changing it there does not change any figure: grep for the old rate and fix every hand-computed USD number with it. The 17.0 that sat there from September to 1 November was eleven percent out.
- **Price status** on every budget line: `quoted` means a live price seen on the operator's own site, `estimate` means a real market price for a comparable thing that was never quoted for us, `open` means undecided and the figure is a placeholder. Do not blur these. A lot of this plan's earlier errors came from an estimate hardening into a fact.
- **No em dashes** anywhere. Hyphen inline, colon in headings.
- **No emojis.**
- Traveler roles (`couple_a`, `single_b`) stay as the keys in committed files. First names may be carried alongside them as a `first_names` field for readability. Surnames never leave `private/roster.md`.

## The map

`data/places.yml` holds every venue. `data/geocache.json` is generated by `npm run geocode` and keyed by address string, so it is never hand-edited and never re-fetches a resolved address.

Categories are fixed in the `categories` block at the top of `places.yml`. Adding a seventh means picking a colour that stays legible on both themes, so prefer reusing one of the six.

**Never put the exact Airbnb address on the map.** The `stay` pin is deliberately the middle of whichever neighbourhood we are staying in, with `precision: approximate`, and the page says so. That stays true after booking. Airbnb's own published circle is roughly 150m and narrows the house to a block, so do not use it either, even though the listing page exposes it.

Because the pin is coarser than the house, every walk figure on the map is a floor. The map page prints both the pinned number and the one measured from the listing's circle, so nobody reads the pessimistic figure as the real one.

**Validate what the geocoder matched, not just that it returned something.** `Del Valle Norte, Benito Juarez, Mexico City` resolved to Avenida Division del Norte, 2.35 km from the colonia, and passed the bounding-box check because it is still inside the city. Check `matched` in `data/geocache.json` names the place you asked for, and purge the entry if it does not.

Geocoding is a network call to a public service at one request per second. It runs locally and on purpose, never in CI.

## When updating a fact

1. Change `data/`.
2. If it was a decision, add it to `docs/decisions.md` with what it beat.
3. If it closes an open question, remove it from `docs/open-questions.md`.
4. Update `data/tasks.yml` status.
5. Note the verification date. Several numbers here are live quotes with a shelf life.

## Numbers that need re-verifying before anyone pays

- Casa KM is booked and partly paid; the second payment of $2,251.42 auto-charges 14 December 2026. The Fives is still only verified available, not booked.
- The Fives 32 percent discount is promotional and may not survive.
- Flight fares were priced 2026-09-25 and will climb through the fall.
- New Year's Eve takeaway prices on file are from the 2023 cycle. Add 30 to 40 percent.
- The balloon rate is a 2026 price for a 2027 date.

## Git

Conventional commits, imperative, lowercase, no trailing period. Direct to `main`. Do not force push. Do not bypass GPG signing.

## Full working

The detailed research, including every rejected option, is on the Jira TRAVEL board. This repo is the distilled version. Where the two disagree, this repo is newer.
