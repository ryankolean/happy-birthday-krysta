# Open questions

What is unresolved, and what each one costs. Close these in `decisions.md` and update `data/tasks.yml`.

## Gating everything else

### What happens on New Year's Eve
Approach is decided, nothing is ordered. The 2026 takeaway menus do not publish until late November, which means this cannot be closed before then. **Cost of being wrong:** up to $2,000, the difference between the potluck and the St. Regis gala.

### Pujol's booking window
Not on OpenTable, and nobody knows how far ahead they open. This is the birthday dinner and the biggest blind spot on the trip. **Cost of being wrong:** the birthday dinner, which has no substitute at the same tier that is also bookable.

### Em's holiday release
Tock says "Em has not opened reservations for 2 ene." Probing shows 19 December open and 31 December not, so the holiday week is withheld rather than sold out. Nobody knows the release date. Phone +52 55 6450 1302.

### Whether the balloon flies on 2 January
No operator site confirms holiday-period operations, and no 2027 pricing is published anywhere. 2 January is a Saturday in the busiest week of the year, which is when balloon operators fill first. **Cost of being wrong:** $1,690 and the centrepiece of the birthday.

## Money

### The Fives environmental tax
Sources conflict badly, from under $25 for the stay to $270. One email to reservations@thefiveshotels.com settles it. **Spread:** about $245.

### Whether the 32 percent Fives discount survives to booking
And whether it stacks with the 5 percent loyalty discount. **Spread:** about $226 on the loyalty discount alone, more if the promotional rate expires.

### Tulum beach club day
Unpriced. Table minimums for 6 in early January have never been quoted. Three hours of driving round trip. May not survive on its own merits.

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

### Framework
Undecided. Content in `data/` is plain YAML and framework-agnostic on purpose. Astro is the house default and is what `4pm-detroit` uses. Nothing has been installed.

### Hosting, and this is the real question
This repo is **private**, because a public trip itinerary broadcasts the exact dates that eight people's homes are empty.

GitHub Pages from a private repo requires a paid GitHub plan. On a free account the options are:

1. **Upgrade to GitHub Pro.** Private repo, private Pages, about $4 a month.
2. **Make the repo public** and keep every sensitive detail out of it: street addresses, confirmation numbers, flight record locators, phone numbers, full names.
3. **Keep the repo private and share the Claude artifact instead**, which is already published and link-shareable.

Option 2 is workable but the history is forever, so the discipline has to start at the first commit rather than being retrofitted.

### What must never be committed
Street addresses, confirmation numbers, record locators, card details, full legal names, dates of birth, passport numbers, phone numbers, home addresses. Those live in `private/`, which is gitignored.
