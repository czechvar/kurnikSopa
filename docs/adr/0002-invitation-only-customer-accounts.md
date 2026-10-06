---
status: accepted
date: 2026-10-07
---

# Customer accounts are created by invitation, not open sign-up

The owner wants to know who their customers are before handing out accounts, but
nobody should need an account just to order a few eggs when nothing is paid online.
We decided two things: there is no public registration (a visitor submits an access
request, and the owner or Staff turn it into an account by sending an invitation), and
**ordering without an account stays open**. A guest gives a name, phone and email at
checkout and reaches their order through a tokenised link in the confirmation email.
An account adds order history, prefilled details and, later, batch bookings tied to a
person the farm knows.

## Considered options

- Open sign-up with email verification (what the code did until now): highest
  conversion, but anyone can book against a scarce batch and the owner has no idea who
  will turn up on slaughter day.
- Open sign-up plus owner approval before ordering: the same admin work as an
  invitation, with a worse experience for the person waiting.
- Login required for every order (briefly agreed on 2026-10-07, then reversed the same
  day): would have turned every egg order into an account request.
- Invitation-only accounts with open guest ordering (chosen): the owner's existing habit
  of knowing every regular by name, without putting a gate in front of a 180 Kč order.

## Consequences

- The sign-up page becomes an access-request form. The login page says accounts are by
  invitation and shows the phone number.
- Invitations reuse Payload's password-reset token; following the link sets the
  password and marks the email verified.
- A guest order carries `guestName`, `guestPhone`, `guestEmail` and a random
  `accessToken`. The order page opens for its owner, for staff, or with that token.
  Order numbers are sequential, so the number alone never grants access.
- People who order by phone and have no email never get an account. Their orders are
  entered by Staff with name and phone only, and appear on the Roster like any other.
- The decision trades reach for control. If the farm later wants to grow beyond people
  it knows, this is the ADR to supersede.
