# Watching the fares after buying

Written 2 November 2026, after the Delta legs were bought and before the
Cancun hop was.

A fare dropping is only worth knowing about if the ticket can be repriced.
That is the whole point of this page: one of the two bookings can, the other
cannot, and chasing the wrong one wastes an afternoon.

## The short version

| Booking | Paid | Repriceable | Watch it |
|---|---|---|---|
| Delta, both long legs | $1,548.27 each | Yes, as an eCredit | Yes |
| Aeromexico, MEX to CUN | $260.25 each | Not without a change fee | No |

## Delta, where the money is

Both Delta tickets are Delta Comfort Classic, which is Main Cabin or above.
Delta removed change fees on those fares, so the itinerary can be repriced
without penalty. If the same flights sell for less later, an agent can
reprice the booking and issue the difference as an **eCredit**, not cash.

How to claim it:

1. Find the current price for the **same flights on the same dates**, same
   cabin, same number of passengers.
2. Open the Fly Delta app, go to Help or Message Us, and ask an agent to
   reprice the booking. Give the record locator, which is in
   `private/delta-flights-booking.md`.
3. Ask for the difference as an eCredit. They will check the live fare
   themselves, so have the figure ready but expect them to confirm it.
4. The eCredit lands on the SkyMiles account it was issued against. Both
   SkyMiles numbers are in 1Password under `Delta SkyMiles - Krysta` and
   `Delta SkyMiles - Ryan`.

Two things to know before calling:

- **Do not cancel and rebook yourself.** Delta's website will not let you
  select the identical flight you already hold, and cancelling first turns a
  clean reprice into a messier eCredit-and-rebuy. Go through an agent.
- **This trip already used eCredits.** $500 came off each ticket on 1
  November, which is why the Amex was charged $2,096.54 rather than the
  $3,096.54 ticket value. Any new eCredit stacks on the same basis and
  expires a year from issue, so it is only worth having if there is another
  trip to spend it on.

Worth acting above roughly **$25 per person**. There is no fee for asking, so
the only cost of a smaller claim is the time on chat.

The reprice route is documented by travel sites rather than by Delta itself,
which publishes the no-change-fee policy but not a price-drop guarantee.
Treat the eCredit as something an agent can do rather than something they
must do, and ask politely.

## Aeromexico, where it is not

The Cancun hop is AM Plus Classic. Free changes on that route begin one tier
higher, at AM Plus Flex, which costs $331.05 against Classic's $260.25. So a
Classic ticket that drops $30 cannot be moved onto the lower fare without
paying a change fee that is likely larger than the drop.

Aeromexico also has no equivalent of the Delta goodwill reprice. There is no
one to ask.

So this one is bought and forgotten. The only reason to look again is if the
whole trip changes shape and the flight has to move anyway.

## How the alerts work

Google Flights price tracking, on the two Delta dates, emailed to Ryan. It is
free, it needs no account beyond the Google one that already exists, and it
watches the route rather than the booking, which is the right signal: if the
route is cheaper, the reprice is worth asking about.

**Do not build a checker that scrapes the airlines.** Both sites sit behind
bot protection, Akamai and RiskX on the Aeromexico booking flow, and a job
running on a schedule would be blocked or silently start returning nothing,
which is worse than no alert at all. This was tested on 2 November 2026: the
Aeromexico fare grid will not even render without a visible browser.

## Baselines

The figures a drop is measured against live in `price_watch` in
`data/flight-tracker.yml`, so they stay next to everything else about the
booking rather than in prose here.
