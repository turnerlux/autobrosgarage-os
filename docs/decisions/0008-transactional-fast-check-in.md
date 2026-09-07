# 0008 — Transactional fast check-in

Status: Accepted
Date: 2026-08-28

## Decision

The `/check-in` workflow now uses the authenticated shop session and real PostgreSQL records. One save
creates or reuses the customer, creates or reuses the vehicle, and opens a permanent numbered Job. The
production route runs all of these operations in a single database transaction so a duplicate warning,
VIN ownership conflict, invalid technician, or later write failure cannot leave an incomplete intake.

Returning customers are found with shop-scoped partial name, phone, or email search. VIN lookup can
recover the saved owner when staff know the VIN but not the customer name. An existing VIN is never
silently attached to a different customer; the screen offers the saved customer and the server rejects a
mismatched submission as a second line of defense. Dealer accounts use the wholesale pricing profile by
default and remain selected after a successful rapid check-in so another lot vehicle can be entered with
minimal repetition.

Jobs now store `service_mode` (`shop`, `dealer_site`, or `mobile`) and an optional `service_location`.
Mobile work requires an address/location at the application boundary. Dealer check-in also captures the
lot, PO, or RO reference in the existing job `lot_number` field. These fields keep Port City work, shop
work, and mobile calls operationally distinct without creating separate copies of the same workflow.

Only roles with both customer-read and job-write authority can use the search/intake API. Technician
accounts remain unable to create customers or jobs; they are selectable as assignees and will consume the
resulting assigned work in the technician workflow.
