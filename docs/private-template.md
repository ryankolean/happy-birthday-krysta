# Private file template

Copy this to `private/bookings.md`, which is gitignored. Nothing below belongs in a committed file.

```markdown
# Bookings and contacts

## Travelers
| Role | Name | Phone | Passport expiry | Paid deposit |
|---|---|---|---|---|
| hosts | | | | |
| couple_a | | | | |
| couple_b | | | | |
| single_a | | | | |
| single_b | | | | |

## Flights
| Leg | Confirmation | Record locator | Seats | Who booked |
|---|---|---|---|---|
| DL 646, 29 Dec | | | | |
| AM MEX-CUN, 3 Jan | | | | |
| DL MEX-DTW, 3 Jan | | | | |
| DL 1911, 8 Jan | | | | |

## Lodging
| Property | Confirmation | Exact address | Door or lock code | Host contact | Card used |
|---|---|---|---|---|---|
| Oasis 6BR | | | | | |
| The Fives | | | | | |

## Reservations
| What | Date | Confirmation | Deposit paid | Cancellation deadline |
|---|---|---|---|---|
| Birthday dinner | 2 Jan | | | |
| Balloon | 2 Jan | | | |
| NYE food orders | 31 Dec | | | |
| CUN transfer | 3 Jan | | | |

## Money
Who fronted what, and who owes whom. Splitwise link.
```

## Why this is separate

Git history cannot be cleaned up after the fact in any way you should rely on. A confirmation number or a door code committed once is committed permanently, and this repo may yet be made public to get free GitHub Pages hosting. See `open-questions.md`.
