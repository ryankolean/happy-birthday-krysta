# Decision log

What was decided, and what it beat. Newest first.

## Correction: nobody settles their own room at the Dreams Jade desk, 10 November 2026

**The 3 November entry below contains one wrong sentence and it is worth correcting rather than quietly editing.** It reads "Each couple and each single settles its own room at the desk." That is the resort's billing schedule written down as if it were this group's arrangement. It is not, and it never was.

**The set amount is $2,346 per person and the resort's full $8,420 is inside it.** That figure was built by back-checking against the four charges that actually land on Ryan's card: Casa KM at $3,836.93 over six, Dreams Jade at $8,420 over six, Pujol at $1,414 over seven and the lucha libre at $715.53 over seven. It reconciles to $6.46 of rounding across the whole trip. The working is now in `data/budget.yml` under `set_amount_back_check`, so it can be rechecked in one place instead of re-derived.

**So Ryan pays $1,684 at booking and $6,736 at the desk on 3 January, with one card, out of money already collected.** Nobody else pays the resort anything. What the resort's 3 November answer actually bought was timing and nothing else: the beach money does not have to be collected in November, because the resort does not want it until check-in. The entry below was right about that and wrong about who hands over a card.

**Why this matters enough to log.** The wrong sentence was read as the operating model on 10 November and produced an invented $467 shortfall at check-in, built on the gap between what a single's room costs and what the even split charges them. There is no such shortfall. The even split is an accounting convention applied to one pot of money that one person pays; it never produces a cash gap because no room is ever billed to its occupant. Any sentence in this repo that describes a supplier's payment terms should now be read against `set_amount_back_check`.

## One private van from the airport, not Uber and not the bus, 3 November 2026

**About $100 for the vehicle, round trip, which is $16.67 each at six.** A Toyota Hiace class van, private, quoted on eTransfers' own booking engine for the real dates with six passengers. Taxes, tolls and luggage included, the driver tracks AM 536 and meets the group past customs, and the price does not change if the flight lands late. Take the $100 Premium fare over the $94 Economy one: the $6 buys free cancellation up to 24 hours before, and nothing on the beach leg is committed yet.

**This replaces a $25 per person estimate that had been sitting in the budget since 2 November.** The real number is $16.67, so the beach leg is $8.33 a head cheaper than the costs page has been saying. All in, the recommended build is now $1,434.67 each rather than $1,443.

**Why it is cheap is worth understanding, because it is fragile.** A van is priced per vehicle, not per head. Six people on one flight splitting one van is the lowest cost per person available on this route. Split the group across two arrivals and it becomes two vans and roughly double, which is one more reason everybody should be on AM 536.

**What it beat.** Uber, which is not permitted to pick up at Cancun airport: the transport ministry has said so, the airport posts notices to that effect, and the taxi unions hold the exclusive right to the arrivals kerb. Uber's own airport product dispatches a union taxi at taxi prices, so it buys the app and none of the saving. Uber is fine once you are in Puerto Morelos; it is the airport that is the problem. The ADO bus at about $12 a head was the only genuinely cheaper option and it is wrong for this group: six people, five nights of luggage, an 18:36 arrival in the dark, a drop at the highway junction rather than the resort, and taxis needed from there anyway. A Sprinter at $197 is more van than six people need.

**AMSTAR, the resort's own authorised operator, is still unpriced.** It publishes no rate anywhere, which is why this was taken to the open market rather than taken on trust. Worth one email since the resort offered it, but the number to beat is $100 for the vehicle, and the reports that exist put AMSTAR well above that. Full working in `docs/transport.md`.

## The Cancun hop is ticketed: AM 536, 3 November 2026

Krysta and Ryan are on **Aeromexico AM 536**, Mexico City to Cancun on Sunday 3 January, departing **14:55 from Terminal 2** and landing **18:36 at Terminal 4**, nonstop, 2h41. **AM Plus Classic at $260.25 each, $520.50 for the two.** Both passengers confirmed and ticketed. That completes all three of their legs; nothing on their itinerary is a quote any more.

**The fare had not moved.** It was re-priced on aeromexico.com the morning it was bought, two days after it was first recorded, and every rung of the ladder on that departure came back identical to the cent: Main Light $199.95, Main Basic $223.15, Main Classic $242.85, Main Flex $302.05, AM Plus Classic $260.25, AM Plus Flex $331.05. Still nothing below AM Plus that includes a checked bag.

**What it beat.** Main Classic at $242.85, which is $17.40 cheaper and still charges separately for the bag, so it is more expensive once a bag is added and gets you an ordinary seat instead of an extra-legroom one. Main Light at $199.95 was never real: no checked bag and no carry-on at all, not even a bin item, on the way to a five night beach stay. AM Plus Flex at $331.05 buys free changes for $70.80 that nobody needs on a leg sandwiched between two fixed bookings.

**Both passengers carry a Delta SkyMiles number**, so the flight credits to Delta rather than earning the 1,552 Aeroméxico Rewards points the fare would otherwise give each of them. Silver Medallion adds nothing on the bag here, because Aeroméxico excludes domestic Mexican routes from SkyTeam baggage benefits, but the bag is in the fare anyway.

**For the other four, nothing about this is optional any more.** The departure time was the last open question on this leg and it is now settled by two tickets. Match the flight number, not just the hour: Aeroméxico runs this route roughly hourly at the same price, and AM Plus is not sold on every departure.

## Dreams Jade's terms are settled, and they are better than we assumed, 3 November 2026

All four questions put to the resort on 2 November came back on 3 November, and none of the answers makes the booking worse.

**Ryan fronts $1,684, not $8,420.** The quote's Christmas and New Year exception, which requires full payment before arrival, does **not** cover a 3 January arrival. So the normal rule stands: one night per room at booking, balance payable at check-in. Each couple and each single settles its own room at the desk. This was the single biggest open item on the quote and it removes any need to collect $8,420 from six people in November.

**The free-cancellation deadline is 30 December 2026, not 31 December.** This repo had 31 December pencilled, counted back three days from a 3 January arrival. The resort counts a day tighter and has now put 30 December in writing. Every file that carried the old date has been corrected. After it, a cancellation or no-show costs one night, $1,684 across the four rooms.

**No promotion is expected and no price drop will be honoured.** The resort has no confirmed Black Friday or Cyber Monday information and does not expect these dates to move much. Separately, it will not reprice a confirmed reservation if the rate falls later: the only route to a lower rate is to cancel and rebook.

**Those last two together argue for booking now rather than waiting.** Waiting for an unpromised sale risks the four Ocean View Kings over New Year week, of which six were left when last checked. Booking now costs $1,684 against a free cancellation until 30 December, and if a better rate does appear before that date it can still be taken by cancelling and rebooking at no cost. The no-price-protection answer is only a trap after 30 December, and no plausible drop covers $1,684.

**What it beat.** Holding off until the Black Friday cycle, which was a live option when the questions were sent. It lost the moment the resort said it expected no movement on these dates: the downside of waiting is losing the rooms, and the upside is a discount nobody has offered.

## The beach build is locked: four Ocean View Kings, 2 November 2026

**Decided, and not reopening.** Four rooms at Dreams Jade, every one a **Junior Suite with Ocean View and a King bed**. Two rooms for the two couples, one each for Christian and Bubba. All four booked in the same category and requested adjacent. **$8,420 for the five nights.** Nothing is booked yet; the group is being asked to confirm the number first.

| Room | Who | Occupancy | Rate |
|---|---|---|---|
| 1 | Krysta and Ryan | 2 | $2,340 |
| 2 | Haley and Eddie | 2 | $2,340 |
| 3 | Christian | 1 | $1,870 |
| 4 | Bubba | 1 | $1,870 |

**What it beat, and why each loser lost.** Three rooms was cheaper and broke no rule, but it puts Christian and Bubba in one room together. Four rooms was chosen so both of them get a door that closes, and that premium was paid deliberately rather than drifted into. Every mixed-category build was cheaper still and is now disqualified outright: the resort confirmed in writing that all four rooms must be in one category for the front desk to even attempt to seat the group together, so saving money by mixing buys a group scattered across the property. A two-bedroom build was asked about and does not exist at this property at any price, in any view: every suite there is one room, and the largest is a garden-view Family Suite that is still a single room.

**King beds in all four, including the single rooms.** The resort confirmed four Kings are available subject to availability. This has to be written on each of the four reservations rather than assumed, which is the kind of thing that gets lost between a quote and a confirmation.

**Four things that must appear on the reservations.** Same category on all four. A King in each. A note asking the front desk to place the group together. Krysta's birthday on 2 January, for the complimentary amenity the resort offers.

**The split is even: $1,403 each, all six.** The quote itemises two rates, which made a choice visible that had never come up while the beach leg was one undifferentiated number. Charging each room what it costs would be $1,170 for each person in a couple and $1,870 for each single. The even split was taken instead, which means the four coupled travellers absorb $933 between them. That is deliberate: Christian and Bubba did not ask for private rooms, the group decided it for them, so they are not billed extra for it. It is also the only version that fits in a group message without a table.

**One thing still open, and it does not change the build or the price.** Whether a 3 January arrival triggers the full-prepayment rule that applies to Christmas and New Year reservations. It decides whether Ryan fronts $1,684 or $8,420, which is a question about when money is collected rather than how much. Asked in the same reply that confirms the booking.

## Dreams Jade is booked direct, not through Booking.com, 2 November 2026

**Decided.** The four Ocean View Junior Suites are booked direct with the resort at **$8,420 for the four rooms**, which is **$1,403 each** across the six. The resort quoted it in writing on 2 November in reply to the enquiry sent on 30 October. Nothing is booked yet; the build and the price are settled and the payment terms are not.

**What it beat.** The same four rooms on Booking.com: $9,055 on the flexible rate and $7,705 non-refundable, both after the 16 percent VAT that Booking excludes. Direct is $635 under flexible and $715 over non-refundable.

| | Four rooms | Each | Cancellation |
|---|---|---|---|
| Booking, non-refundable | $7,705 | $1,284 | Nothing refunded, ever |
| **Direct with the resort** | **$8,420** | **$1,403** | **Free until 3 days out, then one night** |
| Booking, flexible | $9,055 | $1,509 | Full refund, deadline never published |

**Why the middle one won.** The resort declined to match Booking, saying its rates are public and net, so this was never going to be the cheapest row. It is the right row anyway. The $715 over the non-refundable rate buys a cancellation policy better than either alternative: free up to three days before arrival, and one night after that, which is $1,684 across all four rooms. This group has changed shape twice since October and has not yet asked its two single travellers whether they want their own rooms. Paying $715 to keep that question open until the end of December is cheap, and the non-refundable rate would have closed it today.

**The quote is tax-inclusive and must not be grossed up.** Food, drinks, taxes and gratuities are all in the $8,420. Every other Dreams Jade figure in this repo is a Booking price that needs multiplying by 1.16, so this file now holds quotes running both ways round. Multiplying $8,420 by 1.16 gives $9,767, a number that has never existed, and it would make the direct quote look worse than the Booking rate it actually beats. This is the second time on this trip that a beach quote has run the opposite way to the last one, which is why the rule at the foot of this log exists.

**The answer that settled the build.** Adjacency is conditional, in the resort's own words: all four rooms must be booked in the same category to have any possibility of being placed near each other. Until now, mixing categories was understood to make adjacency less likely. It removes it. So every cheaper mixed-category row on the ladder in `data/lodging.yml` now also buys a group scattered across the property, which was precisely what the single-category build was being bought to avoid. The ocean view build stopped being the nicest option on that list and became the only one that delivers what the list was being judged on.

**The 20 percent single-occupancy rule is confirmed from the operator.** The quote prices a single-occupancy room at $374 against $468, which is 20.09 percent. That rule was worked out from a Booking search page on 28 October and has now been checked against the resort's own desk. Worked out from a search page, then confirmed with the operator, is the order this repo is supposed to do things in.

**Two things the reply did not settle, and one is expensive.** The resort takes a one-night deposit per room with the balance due at check-in, except on Christmas and New Year reservations, which must be paid in full before arrival. It does not say whether a 3 January arrival counts, and most Riviera Maya holiday blocks run to about 5 January. If it does not, the deposit is $1,684 and each couple and each single settles their own room at the desk. If it does, Ryan fronts $8,420 before anybody travels and has to collect it first, which moves the deposit conversation with the group from December into November. The second is the Quintana Roo tourist tax: the resort said its rates include all applicable taxes, which is true of its own bill, but Visitax is paid to the state rather than to the hotel, so it is still owed and is now carried at an estimated $15 a head rather than at nothing.

**A new question nobody had to answer before.** The quote itemises two rates, and that makes the even split visible for the first time. Split evenly by head, as this repo has always done, all six pay $1,403. Charge each room what it costs and the four people in couples pay $1,170 while each single pays $1,870. That is $233 a head: the even split has the four coupled travellers putting in $933 between them so the two singles do not carry the full cost of a private room. It was invisible while the beach leg was one undifferentiated $9,055. Both answers are defensible, the repo convention is the even split and that is what the figures currently carry, and it is recorded as open in `data/budget.yml` under `riviera.split_question` because it changes what four people are asked for.

## The Cancun hop is the 14:55 on AM Plus Classic, 1 November 2026

**Decided.** The six continuing to the beach fly Aeromexico MEX to CUN on **3 January at 14:55**, landing 18:36, on **AM Plus Classic at $260.25 each**. This replaces the 13:55 on Main Basic.

**What it beat.** Main Basic at $223.15, which was the plan, plus a checked bag bought online at roughly $27. About $250 all in, $10 cheaper, on a flight that leaves an hour earlier.

**Why the more expensive one won.** AM Plus Classic includes the checked bag, an extra-legroom AM Plus seat, free seat selection and changes for a fee. Main Basic includes none of those. Ten dollars a head is the whole difference, and it is the same trade the group already made paying for Delta Comfort on the long legs, at a tenth of the price. It also removes the last estimated number from the air budget: $260.25 is a quote, where $250 was a quote plus a guess at a bag fee.

**The fact that forced it: no Main Cabin fare on this route includes a checked bag.** Not Basic, not Classic, and not Flex at $302.05. Every row of Aeromexico's own fare comparison reads "Checked baggage 55 lb, Additional charge". This repo previously recorded the opposite, that Flex bundles a bag at $262, and built a whole saving argument on it. That came from a third-party ladder rather than from Aeromexico.

| Fare | Each | Checked bag |
|---|---|---|
| Light | $199.95 | Extra, and no carry-on either |
| Main Basic | $223.15 | Extra |
| Main Classic | $242.85 | Extra |
| Main Flex | $302.05 | Extra |
| AM Plus Basic | $235.95 | Extra |
| **AM Plus Classic** | **$260.25** | **Included** |
| AM Plus Flex | $331.05 | Included |

**The cost of the decision is one hour, not ten dollars.** AM Plus is not sold on the 13:55 at any passenger count, nor on the 08:55. The 14:55 is the first departure after the 11:00 Casa KM checkout that sells it. Arrival moves 17:36 to 18:36 and the group reaches Puerto Morelos around 19:15. Nothing is scheduled for that night, which is the only reason the later flight was affordable in the first place.

**A knock-on worth naming.** The two 3 January departures used to leave at the same time, which made one trip to the airport and one goodbye. They are now an hour apart: the traveller flying home to Detroit still goes at 13:55. The group still travels to the airport together and splits at security.

**Price this leg on aeromexico.com and nowhere else.** This line has now been wrong twice, at $176 and at $222, both times from pricing it somewhere else. Aeromexico's own booking engine takes a deep link, so there is no excuse for a third: `/bf/en-us/book/options?itinerary=MEX_CUN_2027-01-03&leg=1&travelers=A6_C0_I0_PH0_PC0`, with the `A` number set to the party size. The flights page carries it.

**Unrelated to fare, worth knowing.** 3 January is the most expensive day of that week at $199.95 for the cheapest fare, against $151.25 on the 1st and 2nd. Checkout pins the trip to it.

## Dreams Jade for the beach leg, 28 October 2026

**Decided.** The beach leg is [Dreams Jade Resort & Spa](https://www.booking.com/hotel/mx/now-jade-riviera-cancun.html) in Puerto Morelos, all-inclusive, four rooms.

**Why a resort rather than a residence.** A single large unit split between six people only ever works by arguing about who gets which bedroom, and somebody always ends up on a sofa bed. Dreams Jade is a conventional resort: each pair gets a room with a door, the board covers food and drink, and the two singles can have their own rooms without anybody giving something up.

**The decision that actually costs money is the fourth room, not the ocean view.** This was the opposite of how it looked going in.

| | Per person |
|---|---|
| Ocean View for one couple | +$132, to that couple only |
| Ocean Front for one couple | +$244, to that couple only |
| **Adding a fourth room** | **+$534, to each single** |

Four rooms are four independent reservations at four independent prices, so one couple buying up does not move anybody else's rate by a cent. What mixing categories does cost is **adjacency**: Ocean Front rooms sit in the buildings nearest the water and standard Junior Suites are set back, so a group spread across categories is not a group in the same corridor.

**Recommended: four rooms, everybody in a Junior Suite with Ocean View, $1,509 each on the flexible rate.** It is the most expensive build on the list and still the right one. It is $89 each above buying one couple an Ocean Front, and for that it removes both awkward conversations at once: nobody has a better room than anybody else, and the whole group is in the same buildings.

Every build that works, all priced live on 28 October, 16% VAT added on top of what Booking displays, split six ways:

| Build | Rooms | Non-refundable | Flexible |
|---|---|---|---|
| All standard Junior Suite | 3 | $947 | $1,115 |
| One couple Ocean Front | 3 | $1,029 | $1,210 |
| All standard Junior Suite | 4 | $1,125 | $1,324 |
| One couple Ocean View | 4 | $1,169 | $1,375 |
| One couple Ocean Front | 4 | $1,206 | $1,420 |
| Both couples Ocean View | 4 | $1,213 | $1,426 |
| One couple Preferred Club Ocean Front | 4 | $1,250 | $1,471 |
| **Everybody Ocean View** | **4** | **$1,284** | **$1,509** |

**Three rooms breaks no rule and was not rejected.** The two singles would share a Junior Suite Two Double, which is two separate beds, at $1,115 each. It is $394 cheaper per person than the recommendation. The standing rule on this trip is that nobody shares a bed and nobody sleeps in a living room, and three rooms satisfies both. Whether the singles want their own rooms is a question to ask them, not one to decide for them.

**The single-occupancy trap, which drives the whole build.** Dreams Jade discounts a solo traveller to 80 percent of the two-person rate on its four cheapest room types and to 100 percent of it on everything above them. From Preferred Club Tropical View upward, including every Ocean Front and every Preferred Club room, one person pays the full two-person price for a guest who is not there. So the singles go in an Ocean View room or below, always. Verified at one adult and at six adults across four rooms.

**Booking quotes this property before tax.** The listing prints "Included: City tax" and "Excluded: 16% VAT", so every figure here is the displayed price times 1.16. An earlier beach quote on this trip ran the other way, already tax-inclusive, and was grossed up anyway, overstating the lodging by about $250 each. The lesson is not "always gross up" or "never", it is **check which way round a quote is before doing arithmetic on it**.

**The beach line is $1,509 and both legs were $2,473 when this was decided.** Both legs is now $2,452, because the Pujol line fell $21 when the exchange rate was corrected on 1 November 2026. The beach figure is unchanged. The previous beach figure looked lower, but it was room only and carried a separate $324 food estimate on top. All-inclusive absorbs that, so the lodging line and the real outlay are now the same number:

| | Lodging | Food | Transfer | Total outlay |
|---|---|---|---|---|
| Dreams Jade, flexible | $1,509 | included | $25 | $1,534 |
| Dreams Jade, non-refundable | $1,284 | included | $25 | $1,309 |

Against the old room-only plan at $1,435 all in, the recommended build is **$99 each more on the flexible rate and $126 each less on the non-refundable one**, and either buys a private room and an ocean view for every person plus no decisions about dinner.

**Flexible for now.** It costs $225 each more than non-refundable. The build is not settled, nothing is booked and the trip is fourteen months out, so flexible is what lets the group decide without paying for the delay. Switch once the build is agreed.

**Four rooms is not a group.** Hyatt Inclusive Collection group desks start at ten rooms, so there is no group rate being withheld and nothing to negotiate on that front. The real lever is **Hyatt Privé**, Hyatt's advisor-only program: Dreams is in it, five nights clears its four-night minimum, and it reportedly adds a property credit of roughly $100 per stay plus a confirmed room upgrade at the same rate as Hyatt's public flexible price. Every source for that is an agency blog rather than Hyatt, so it needs confirming in writing.

**What it beat.** Dreams Sapphire, on layout. Iberostar Selection Riviera Cancun at $930 each was cheaper and better rated at 8.5, but its two-bed room is a Junior Suite with twin beds rather than a room type of its own. Riu Palace Riviera Maya at $1,241 scored 9.0 and stayed in contention to the end. Ocean Maya Royale was disqualified outright: no two-bed room exists anywhere in its inventory. Barcelo Maya Colonial and Iberostar Waves Quetzal sell only two-queen rooms, so the couples lose a king. The full comparison is on the Jira TRAVEL board.

**Hyatt's own site could not be priced.** hyatt.com and hyattinclusivecollection.com return HTTP 429 to automated access, so the Booking.com rates are the benchmark and nobody has checked whether booking direct beats them. That is an open question, not a settled one.

## Five changes to how the site reads money, 27 October 2026

**Flights come out of every total.** Everybody books and pays for their own. No fare appears in any per-person figure on the site now, and the four fares that remain are labelled as reference points priced on 25 September. What replaced the old totals is a cleaner question: **what you owe Ryan**, which is the shared bookings he fronted on one card. That was $964 for Mexico City and $1,143 for the beach at the time; the beach figure has since moved to $1,509 with the change of property.

**The one flight that still wants coordinating is Mexico City to Cancun on 3 January.** Everybody continuing to the beach is on it, and being on one aircraft means one arrival and one transfer rather than six people trickling in. Aeromexico runs it hourly at a flat fare, so the departure time is a group decision rather than a price one.

**Estimates are no longer added to anything.** Food, drinks, taxis and the airport transfer are still shown, because the week should not surprise anybody, but they sit in their own tables marked as money you spend yourself. Only booked and quoted lines reach a total. This is the difference between a planning number and a bill, and the page had been blurring it.

**New Year's Eve costs nothing.** The $324 placeholder was the St. Regis gala price and was never anybody's plan. The plan is to eat in at Casa KM with everybody bringing something to share, or to walk out to whatever is open. The line stays at zero.

**The balloon is shelved rather than deferred.** It came off the itinerary on 23 October and was still being carried as a blocked task with a live page. Both are gone. The research moved to `docs/archive/balloon.md`, which is not built and does not appear on the site. Nothing was ever committed and all four operators refunded in full to one day before, so nothing was lost. It supersedes the sunrise balloon decision further down this log.

## Four excursions dropped from the beach leg, 27 October 2026

**Chichen Itza, Isla Mujeres, the Tulum beach club day and the rental van are all off.** Not deferred, dropped. The beach leg is five nights at a resort on a beach, and the point of it is to be there. Each of the four meant a long drive or a ferry away from the thing the group is paying for.

That takes the optional block on the costs page to nothing, which is the honest state of it.

## The birthday is lunch at Pujol, 2 January

**Booked 23 October 2026.** Table for seven in the main dining room at **14:30**, six course menu, about two and a half hours. **MX$3,795 each with VAT included, $202 at 18.79 MXN/USD**, roughly **$1,414 across seven** before drinks and tip. Nothing was charged; the card is a guarantee. Confirmation number and terms are in the gitignored `private/` folder.

The dollar figure read $223.24 until 1 November 2026, when the exchange rate was corrected from a stale 17.0. The peso price has not moved. Drinks and tip are on top of this and are estimated separately at about $80 each, because Pujol has no beverage pairing and the bill depends on what the table orders.

**The booking was blocked by two things this repo believed that were not true.**

**Pujol does book through OpenTable.** The dinner page called the unknown booking window "the biggest blind spot on the whole trip" and open-questions carried it as an open item. Pujol's own website RESERVE button points straight at OpenTable (`restref=1545187`), and 2 January was openly bookable ten weeks out. Removed from open-questions rather than answered, because the question was wrong.

**The eight tasting menu minimum never applied.** It is a rule for the **private dining room**. A regular table for seven carries no minimum. For six weeks the drop from 8 to 7 was recorded as costing either a wasted $223 cover or the room itself, and it was recorded as the single biggest consequence of losing a traveller. It cost nothing. A normal table sidestepped it completely.

**Two smaller corrections.** The cancellation window is **24 hours, not 48**. And Pujol holds **two Michelin stars** in the 2026 guide, not one; it and Quintonil are the only two-star restaurants in Mexico.

**The terms are unusually forgiving, with one hard edge.** Free to change or cancel online until **14:30 on 1 January**. Inside that 24 hours a cancellation, a no-show, a date change *or a reduction in the diner count* each cost **MX$2,000 per person**, about $745 across seven at 18.79 MXN/USD. A headcount message went to the group on 23 October, and the answer can move freely: **6, 7 and 8 all return the same seatings**. At **9 or more there is no online availability at all** on that date.

What it beat: every other starred restaurant in the city. Checked for seven on 2 January, **Quintonil** caps at 6, **Em** still has not released the date, **Esquina Común** had no availability, **Masala y Maíz** does not book through OpenTable, **Máximo** does not open its window until about 2 December, **Rosetta** has no reachable CDMX listing, and **Sud 777** was already out on distance. Pujol was the only starred restaurant confirmed able to seat seven that day, and it is the highest rated of them.

**Knock-on.** Booking the early seating took the morning of 2 January out of play for anything that runs long, which is part of why the balloon was shelved five days later.

## Lucha libre takes arrival night, 29 December

**Booked 23 October 2026 and paid in full.** Tacos, Mezcal & Lucha Libre with El Taco Club, **17:45 to 20:45**, all seven guests, **$715.53 all in** or **$102.22 each**. Attraction tickets, a full meal, specialty drinks and a mask are included. Free cancellation until 28 December. The confirmation code and payment details are in the gitignored `private/` folder.

**This replaces the Ling Ling dinner, which was never actually booked.** The task to reserve it sat open since 5 October with the note "nothing is holding it for us", so arrival night was free in fact even though the itinerary read as though it were spoken for. Because the experience includes a full meal, it takes the dinner slot as well as the evening, so the **$125 Ling Ling estimate is removed rather than moved**. Mexico City per person falls from **$1,750 to $1,727**, the full trip from **$5,024 to $5,001**, and the city-only figure from **$4,889 to $4,866**. Those supersede the totals quoted in the Casa KM entry below.

**Ling Ling is now free for 2 January**, where the existing task already holds it as the Pujol backup. That matters because Pujol's private room is broken at seven, so this is the stronger use of the reservation.

**The tax was invisible until checkout.** Airbnb's date picker quoted **$616.84** for seven guests. The receipt charged **$715.53**, with **$98.69** of tax appearing only at the payment step. Every per-person figure taken off the picker while comparing options was about $14 light. This is the second time on this trip that tax surfaced only on the confirmation, after Casa KM. Price from a receipt, not a picker.

What it beat: five other lucha experiences priced at seven on the same dates. **Lucha Libre near the ring** was the closest call at **$479** on 2 January with guaranteed ringside seats in the first nine rows, a 4.98 rating and a three-day cancellation window, but it was **sold out on 29 December** and taking it would have meant spending the birthday or the deliberately empty recovery night on it. **Lucha libre, tacos and beers with an artist** was the only one of the six that could seat seven on 1 January, at $509. The cheapest option that night was **Savor lucha libre with margaritas** at $371, drinks only and no meal.

Two things the search established that are worth keeping. **The arenas are Arena Mexico and Arena Coliseo**, which one depending on the day. And **no lucha runs on 30 or 31 December** on any of the six listings, so taco day and New Year's Eve were never candidates.

## Casa KM booked

**Confirmed 18 October 2026.** Reservation for 29 December to 3 January, six adults. **$3,836.93 all in**, which is $634.20 a night for five nights plus $665.91 of tax, or **$639.49 each** split six ways. Paid $1,585.51 on booking with $2,251.42 auto-charging on 14 December. The confirmation code, street address and host contact are in the gitignored `private/` folder.

Two things the confirmation changed.

**The rate had risen about 29 percent since the quote.** On 12 October the same dates at six guests quoted **$2,944** all in. Six days later it booked at **$3,836.93**, $893 more, or **$148 more per person** than every figure this repo carried. The receipt works out to $634.20 a night before tax against roughly $490 implied by the earlier quote. Holiday inventory tightening is the likely cause and it is not verifiable after the fact. Mexico City per person went from $1,602 to **$1,750**, the full trip to **$5,024**.

**There are quiet hours, 22:00 to 08:00.** This was never in the listing's rules summary and appeared only on the confirmation. The New Year's Eve plan puts midnight on the rooftop, which is inside that window, and the property has exterior security cameras. That plan is provisional until Manuel agrees in writing, which is now a dated task. It is the one thing the Oasis genuinely did better: it had no quiet hours at all, and that was listed as a reason for choosing it back in September.

What it beat: the 4BRM Coolest flat in Heart of Condesa at $760 each, and a field of cheaper options down to $307 each. Casa KM won on four en-suite bathrooms, a private rooftop and 4.99 from 139 reviews, not on price.

## Group drops to 7 in the city, 6 sharing the house

**Changed 12 October 2026.** One half of one couple dropped. The shape is now **two couples and two singles** in the accommodation, six people, plus a seventh who books their own hotel. **Seven in the city** for dinners, the balloon and the flights.

Three consequences, in order of how much they cost:

**Pujol's private room is no longer viable as planned.** It carries a minimum of eight tasting menus at MX$3,795 each. At seven we either pay for an eighth cover nobody eats, about **$223 wasted**, or give up the private room. Em takes parties of 3 to 8, so it fits seven with no minimum to pad, and it is now the cleaner booking. See `dining.md`.

**Casa KM got more expensive per head, not less.** Re-quoted at 6 guests the whole flat fell only $111, from $3,055 to **$2,944**, while the split lost a head. Per person went **$436 to $491**. This is the same per-unit arithmetic that pushed the Oasis from $483 each at ten guests to $913 at four: shrinking the group raises the lodging line. Mexico City per person lands back at exactly **$1,602**, the same figure it held when the trip was eight people in the Oasis.

**The bed configuration constraint loosened, which reopens cheaper options.** Three couples plus one single required three double beds in three separate rooms. Two couples plus two singles needs only two double beds, because the singles will take any room with any bed. Listings previously rejected for having twin-bed rooms now qualify. Re-searching at six found several that undercut Casa KM sharply, the cheapest a four bedroom, three bathroom flat in Anzures at **$307 each** with 4.86 from 187 reviews, against Casa KM's $491. Casa KM is still the pick on bathrooms and review record; it is no longer the pick on price.

**Resolved 19 October: the beach leg stays at six.** The person who dropped was one of those flying home after Mexico City rather than a beach traveller, so every Riviera Maya figure stands and the beach lodging still splits six ways. The knock-on is that **only one person now leaves after Mexico City instead of two**, which halves the group that needs the cheaper 3 January connection out of MEX.

## Casa KM over the Oasis, and the group drops to 7 in one house

**Partly superseded, see the entries above.** The choice of Casa KM stands and it is now booked. The prices below were quoted at 7 sharing; the actual booked figures are **$3,836.93 and $639.49 each** at 6 sharing.

**Decided 12 October 2026, reversing the Oasis.** Headcount settled at three couples plus one single. An eighth traveller is in Mexico City but books their own hotel, so the house splits **7 ways** while dinners, flights and the balloon stay sized for 8. Pujol's eight tasting menu minimum is therefore still met.

The Oasis was dropped on its own reviews, not on price. Guests report **no windows in most bedrooms** and "very little airflow unless you leave your room door open", **musty bedding** that one guest said left them unable to rest, **visible mold on some bedroom ceilings**, and an occasional sewage smell in the lower common area. A separate review notes "there is no real kitchen appliances to use", which the New Year's Eve plan depends on. At 7 guests it also repriced to $3,996, or **$571 each**, making it the most expensive option considered.

**Casa KM** is $3,055, **$436 each**: four bedrooms each with its own full bathroom, a private rooftop with a grill, balconies off three of the four bedrooms, and 4.99 from 139 reviews. Bedroom 4 is described by the host as best suited to one guest, which fits the single traveller exactly. Capacity is a hard 7.

Searched Roma Norte again under a tight map box rather than the keyword, which had been pulling in Condesa and Polanco. Inside Roma Norte proper nothing competes: the places with enough bathrooms run **$699 to $773 each**, the affordable ones have two bathrooms or split the group across two units, and the one cheap outlier publishes no bed configuration and has no reviews.

One alternative stays on the table: the **Coolest flat in Condesa** at $4,724, **$675 each**. Longest review record of anything checked, 4.85 from 193, and a three minute walk to Em. It gives up a bathroom each and the rooftop, and its fourth bedroom is reached through a separate door off the building hallway, which would fall to the single traveller.

## Riviera Maya over a second city

**Decided.** Mexico City for New Year's Eve and the birthday, then Puerto Morelos to decompress. Both anchors happen in the city, so the beach leg carries no scheduling pressure.

## Beach leg arrives 3 January, not 29 December

**Decided, and the dates are load bearing.** Riviera Maya resorts run a holiday rate band that ends on 2 January, with the next band starting exactly 3 January. When this was priced the same unit came to **$7,895** for 29 December to 3 January against **$4,990** for 3 to 8 January, and a stay including 2 January could not be sold with all-inclusive board at all. The property has changed since. The rate band has not.

## Oasis 6BR over five boutique hotel rooms

**Superseded 12 October 2026 by Casa KM, see the entry at the top.** Recorded because the reasoning below still holds on bed configuration, and because the lodging correction it contains is worth keeping.

**Decided at the time.** The bed configuration was the binding constraint: three couples plus two singles who need separate rooms. Every Roma Norte and Condesa boutique offers a single king, which forces five rooms and adds roughly $375 to $440 each.

The Oasis solves it with six bedrooms and one spare, adds a private rooftop for midnight, has no quiet hours, and costs $491 each, $3,927 for the whole house.

It also corrected a much larger error. An earlier pass had quoted $1,790 to $2,340 each for Mexico City lodging. Colima 71's own direct rate for an ordinary week in February 2027 back-solves to about the same per-room-night as its New Year quote, and Roma Norte hotels were running active discounts *into* the holiday window. Nobody discounts into a demand spike. The genuine holiday premium is **0 to 20 percent**, not the 10x the quote implied. The rest was the decision to buy five boutique rooms at roughly $572 a night.

## Keep the 08:40 nonstop out of Detroit

**Decided, against a stated preference.** The group wanted early-to-mid afternoon departures. On DTW to MEX that is impossible: the route is 4h50 nonstop and 7 to 8 hours connecting, so every afternoon departure lands between 21:50 and 01:15. Flying out 28 December instead does not fix it and adds a night.

29 December is one of only two free evenings in Mexico City. Trading it for $728 each is a poor deal on a trip already spending $223 a head on one dinner. One 6 AM alarm across ten days.

## Fly home 8 January, not 7

**Corrected.** The original Google Flights search returned CUN to DTW on 7 January, which is a four night beach stay. **8 January costs the same $493** on two of the three flights, so fly the 8th and keep the fifth night.

## Taco day moved to 30 December, Sabores food tour dropped

**Decided.** Krysta asked for a day of just eating at taco trucks. 1 January is the only otherwise-free day and it is the worst possible choice, because many places close after lunch on the 31st and do not reopen until the 2nd.

30 December works, and swapping the guided Sabores tour for a self-guided crawl saves about $115 each and is closer to the actual request. It also keeps 29 December free for Ling Ling, which matters because 29 December is the only open upscale slot in the week.

## Balloon on 2 January, or not at all

**Shelved 27 October 2026. See the entry at the top of this log.** It was decided, then taken off the itinerary on 23 October, then shelved for good four days later. Nothing was ever booked and every operator refunded in full to one day before, so it cost nothing.

The research that went into it, including the four operators priced for two and the weight limits that were the real obstacle, is kept at `docs/archive/balloon.md`. That file is not built and does not appear on this site.

## New Year's Eve stays at the house

**Approach decided, orders not placed.** A potluck pickup run, with a private chef as the zero-effort fallback. The gala is demoted.

Driven by the street closures rather than by cost: Reforma shuts in both directions, the free party draws about 250,000, and midnight is already on the Oasis rooftop. A restaurant forces a choice between leaving dinner early and missing midnight. See `nye.md`.

## Quintonil is out

**Settled 2 October 2026.** It caps at **6** in the main dining room and 1 to 3 at the kitchen counter, and it explicitly asks guests not to book multiple tables intending to be seated together. Earlier notes had this as disputed because every scrape of its Tock page returned a Cloudflare interstitial. It is not disputed.

## Always check which way round a beach quote runs on tax

**Settled 2 October 2026, and it cuts both ways.** An earlier beach quote on this trip was already tax-inclusive, and two research passes had contradicted each other about it. The gross-up won and it was wrong, overstating the lodging line by about 17 percent, roughly $250 each.

Worth remembering why that error survived: a Booking.com figure agreed with the grossed-up total to within 0.8 percent, which looked like independent corroboration. It was not. The arithmetic was fine and the interpretation was wrong, and matching numbers cannot tell those apart.

**The current property goes the other way.** Booking quotes Dreams Jade pre-tax, printing "Included: City tax" and "Excluded: 16% VAT", so every beach figure on this site is the displayed price times 1.16. The room catalogue stores both numbers and the verification script asserts the relationship on every rate row, so the mistake cannot now be made silently in either direction.

