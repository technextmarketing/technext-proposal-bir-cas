# TechNext sales proposal template: BIR CAS on Odoo

An interactive proposal in the style of an Odoo online quotation, built on TechNext's proposal method (the format used for the Hitachi Elevator Philippines proposal). Three parts the reader switches between (part bar at the top, sections grouped in the side panel, which also carries the client's choices, Accept & sign, PDF and your contact):

1. **Solution showcase**: why choose us (top 10 Odoo ERP and BIR compliance values, TechNext services as one team, proof), an animated tour of the eight services as looping Odoo screens, today vs Odoo, the sites-to-database-to-BIR-outputs network, the BIR requirements map, the NextSprint method (Agile, Lean, Six Sigma, seven steps with the client deciding at each gate), the delivery plan, when TechNext invoices (dates and percentages only), what is in and outside the fee (scope S1 to S7), the team and the FAQ.
2. **Commercial proposal**: every price, stated once, in one place. A. TechNext fee (fixed, one amount column, checklists of what the fee includes), B. optional items (added items join the total in A), C. support plan after hypercare (choose one), D. Odoo licence (paid to Odoo, choose one by term and users).
3. **Terms and conditions**: service levels for the chosen plan, the 13 terms both sides agree to (the BIR disclaimer is term 10), next steps, the acceptance line with the client's choices, and the sign-off for both parties (Odoo-style signature dialog).

The cover carries only the value proposition and the CAS line: no facts row, no parties card. No VAT or tax wording on prices.

Link straight to a part with `#part-1`, `#part-2` or `#part-3`, or to any section id.

Live demo (sample data only): https://technextmarketing.github.io/technext-proposal-bir-cas/

Everything in this version is **sample data**: the client (Sample Trading Corp.), names, TINs, figures, Odoo rates and dates. Replace them before you send a real proposal, and never publish a real client's proposal in this public repository.

## Making a proposal for a real client

1. Copy this folder. Work in the copy.
2. In `index.html`, search and replace:
   - `Sample Trading Corp.`, `Juan Dela Cruz`, `President &amp; CEO`, `Mr. Dela Cruz`
   - proposal number `S00147`, the revision and dates (`Rev 1.0`, `3 November 2026`, `3 December 2026`, `9 November 2026`, `16 November`, `11 December 2026`, `4 January 2027`)
   - the client logo in `.client-mark` (replace the SVG with an `<img>`)
3. Part 1: rank the top 10 for the client (the first three are the cards), and adjust the NextSprint steps, the invoice dates and the in/out lists.
4. Prices (Part 2 only): `data-amt` and the visible amount on each `[data-line]` row (A), `data-unit` and the visible amount on each `[data-opt]` row (B), the plan rows (C) and the Odoo rows and rate note (D). The fee total and the client's choices recalculate. Plan names and response times are in `PLANS` at the top of `assets/proposal.js`; the Odoo option codes are in `ODOO`.
5. Count the prices in the PDF: each figure must appear exactly once.
6. Remove every "Sample data" / "Sample figures" / "Sample dates" tag once the content is real.
7. Single file for email or Drive: `python tools/build_single.py "Proposal - <Client>.html"`. PDF: open the page in Chrome and use the PDF button (A4, desktop layout, sign-off lines for both parties).

## Copy rules this template follows

- TechNext sets up Odoo and prepares the CAS papers with the client. The client files at its RDO; the registration decision and its timing are the BIR's.
- Never "BIR-accredited", "BIR-certified" or "BIR-compliant". Say "set up for BIR requirements".
- Odoo is never free: the Odoo licence is quoted and invoiced to the client by Odoo, separate from TechNext's fees and never added to them.
- Each price is stated once, in Part 2. Other parts point to it. No VAT wording.
- Odoo Ready Partner in Singapore. British spelling ("adviser").
- E-invoicing / EIS is out of scope unless quoted separately.
