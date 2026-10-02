# happy-birthday-krysta

Planning repo for Krysta's 35th birthday trip to Mexico, 29 Dec 2026 to 8 Jan 2027. Holds the trip content and will hold the group-facing website.

## Hard rules

**This repo is private and must stay that way unless the PII question in `docs/open-questions.md` is resolved first.** A public trip itinerary broadcasts the exact dates eight people's homes are empty.

**Never commit:** street addresses, confirmation numbers, flight record locators, card or payment details, full legal names, dates of birth, passport numbers, phone numbers of travelers, home addresses. Those go in `private/`, which is gitignored. Repo history is forever, so this discipline starts at the first commit.

Published business phone numbers and public listing URLs are fine. Someone's personal mobile is not.

## Where things live

`data/*.yml` is the single source of truth. Change a fact there, not in `docs/` and not in a site template.

`docs/*.md` is narrative reference: research, comparisons, the decision log, open questions.

`private/` is gitignored. Confirmation numbers and real contact details.

## Conventions

- **Dates** are ISO: `2027-01-02`. **Times** are 24 hour: `"19:30"`, quoted in YAML so they stay strings.
- **Money** is USD unless the key says `mxn`. Convert at the rate in `data/trip.yml`, currently 17.0 MXN/USD, and update that one place when it moves.
- **Price status** on every budget line: `quoted` means a live price seen on the operator's own site, `estimate` means a real market price for a comparable thing that was never quoted for us, `open` means undecided and the figure is a placeholder. Do not blur these. A lot of this plan's earlier errors came from an estimate hardening into a fact.
- **No em dashes** anywhere. Hyphen inline, colon in headings.
- **No emojis.**
- Traveler names stay as roles (`couple_a`, `single_b`) in committed files.

## When updating a fact

1. Change `data/`.
2. If it was a decision, add it to `docs/decisions.md` with what it beat.
3. If it closes an open question, remove it from `docs/open-questions.md`.
4. Update `data/tasks.yml` status.
5. Note the verification date. Several numbers here are live quotes with a shelf life.

## Numbers that need re-verifying before anyone pays

- Both properties were verified available 2026-10-02. Neither is booked.
- The Fives 32 percent discount is promotional and may not survive.
- Flight fares were priced 2026-09-25 and will climb through the fall.
- New Year's Eve takeaway prices on file are from the 2023 cycle. Add 30 to 40 percent.
- The balloon rate is a 2026 price for a 2027 date.

## Git

Conventional commits, imperative, lowercase, no trailing period. Direct to `main`. Do not force push. Do not bypass GPG signing.

## Full working

The detailed research, including every rejected option, is on the Jira TRAVEL board. This repo is the distilled version. Where the two disagree, this repo is newer.
