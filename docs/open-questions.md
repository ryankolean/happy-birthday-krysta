# Open questions

What is unresolved, and what each one costs. Close these in `decisions.md` and update `data/tasks.yml`.

## Gating everything else

### What happens on New Year's Eve
Approach is decided on [the New Year's Eve page](nye.html), nothing is ordered. The 2026 takeaway menus do not publish until late November, which means this cannot be closed before then. **Cost of being wrong:** up to $293 each, the difference between the potluck and the St. Regis gala.

### Em's holiday release
Tock says "Em has not opened reservations for 2 ene." Probing shows 19 December open and 31 December not, so the holiday week is withheld rather than sold out. Nobody knows the release date. Phone +52 55 6450 1302. **No longer blocking anything**, since [the birthday lunch](dining.html) is booked at Pujol.

### Whether a Hyatt Privé advisor beats booking direct
Direct now has a written quote, so the Booking.com comparison is closed: $8,420 for the four rooms, $635 under Booking's flexible rate. What is still untested is Privé, Hyatt's advisor-only program, which reportedly adds a property credit of about $100 per stay plus a confirmed upgrade at the same rate. Four reservations might mean four credits. Every source for it is an agency or affiliate blog rather than Hyatt. **Spread:** possibly $400 of credit, possibly nothing. Worth one conversation before paying, not worth delaying the hold.

### The Quintana Roo state tourist tax
Charged per visitor, separate from the hotel bill. Dreams Jade was asked on 30 October and its answer covers its own bill only, which is correct and does not settle this: Visitax is paid to the state rather than to the hotel. Now carried as an estimate at **$15 a head** rather than at nothing. No 2027 figure is published and it is indexed to the UMA, so re-check in December and pay online rather than at the airport desk. **Spread:** $14 to $28 each.

### Tulum beach club day
Unpriced. Table minimums in early January have never been quoted, so there is no per-head figure. Three hours of driving round trip. May not survive on its own merits.

### LAX origin
Unpriced. If anyone is flying from Los Angeles that is a separate search, and LAX to MEX has far more Delta frequency than Detroit.

### Whether the one traveller leaving early takes a connection home
The MEX to DTW nonstop is $1,893 and connections that day run $774 to $956. **Saving:** about $1,040. This was two people until 12 October; now it is one. They have not been asked.

## Logistics

### Firm yes or no from all 7
With a date by which a maybe becomes a no. Nothing non-refundable should be signed before this.

### Silver Medallion benefits on these routes
Whether complimentary Comfort+ extends to Mexico at Silver, and the international checked-bag allowance. Priority boarding and waived same-day change fees are safe. At Silver the group is lowest upgrade priority, so do not count on it on a sold-out holiday A319.

### Four venue addresses never resolved
Minutito, Cursi, Fueguia 1833 and Salazar were on the shortlist and none has a confirmed address.

### Whether a taquiza provider will take a party of 8
Most Mexico City providers set a 50 person minimum. One phone call settles it.

## The website

**Settled.** The repo is **public** and the site is live at [ryankolean.github.io/happy-birthday-krysta](https://ryankolean.github.io/happy-birthday-krysta/). Public was the choice because GitHub Pages from a private repo needs a paid plan, and the group needs to be able to open it.

Built by `scripts/build.mjs` from `data/*.yml` and `docs/*.md`, deployed by GitHub Actions on every push to `main`. No framework, two dependencies.

### What this costs us
Everything in this repo is world readable and permanent. Git history cannot be meaningfully cleaned after the fact.

The site sends `noindex, nofollow` and ships a `robots.txt` disallowing everything, so it stays link shareable without being searchable. **That is a courtesy to crawlers, not a security control.** Anyone with the link sees everything.

### What must never be committed
Street addresses, confirmation numbers, record locators, card details, full legal names, dates of birth, passport numbers, travelers' personal phone numbers, home addresses. Those live in `private/`, which is gitignored. Template at `private-template.md`.

Published business numbers and public listing URLs are fine.

### Still open
Whether to put the exact Airbnb address on the site once booked. Right now only the listing URL and the neighborhood are published, which is the right line. Resist moving it.
