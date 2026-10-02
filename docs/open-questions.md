# Open questions

What is unresolved, and what each one costs. Close these in `decisions.md` and update `data/tasks.yml`.

## Gating everything else

### What happens on New Year's Eve
Approach is decided on [the New Year's Eve page](nye.html), nothing is ordered. The 2026 takeaway menus do not publish until late November, which means this cannot be closed before then. **Cost of being wrong:** up to $293 each, the difference between the potluck and the St. Regis gala.

### Pujol's booking window
Not on OpenTable, and nobody knows how far ahead they open. This is [the birthday dinner](dining.html) and the biggest blind spot on the trip. **Cost of being wrong:** the birthday dinner, which has no substitute at the same tier that is also bookable.

### Em's holiday release
Tock says "Em has not opened reservations for 2 ene." Probing shows 19 December open and 31 December not, so the holiday week is withheld rather than sold out. Nobody knows the release date. Phone +52 55 6450 1302.

### Whether the balloon flies on 2 January
No operator site confirms holiday-period operations, and no 2027 pricing is published anywhere. 2 January is a Saturday in the busiest week of the year, which is when balloon operators fill first. **Cost of being wrong:** $211 each, and the centrepiece of [the birthday](itinerary.html).

## Money

### The Fives environmental tax
Sources conflict badly, from under $25 for the stay to $270. One email to reservations@thefiveshotels.com settles it. **Spread:** about $41 each.

### Whether the 32 percent Fives discount survives to booking
And whether it stacks with the 5 percent loyalty discount. **Spread:** about $38 each on the loyalty discount alone, more if the promotional rate expires.

### Tulum beach club day
Unpriced. Table minimums in early January have never been quoted, so there is no per-head figure. Three hours of driving round trip. May not survive on its own merits.

### LAX origin
Unpriced. If anyone is flying from Los Angeles that is a separate search, and LAX to MEX has far more Delta frequency than Detroit.

### Whether Couple B takes a connection home
The MEX to DTW nonstop is $1,893 and connections that day run $774 to $956. **Saving:** about $1,040 each. They have not been asked.

## Logistics

### Firm yes or no from all 8
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
