# TechNext sales proposal template: BIR CAS on Odoo

An interactive proposal in the style of an Odoo online quotation: a cover page, then the proposal with a sticky side panel (live total, Accept & sign, PDF, sections, your contact), live pricing with optional items and support plans, and an Odoo-style signature dialog.

Live demo (sample data only): https://technextmarketing.github.io/technext-proposal-bir-cas/

Everything in this version is **sample data**: the client (Sample Trading Corp.), names, TINs, figures and dates. Replace them before you send a real proposal, and never publish a real client's proposal in this public repository.

## Making a proposal for a real client

1. Copy this folder. Work in the copy.
2. In `index.html`, search and replace:
   - `Sample Trading Corp.`, `Juan Dela Cruz`, `President &amp; CEO`, `Ms. Ana Reyes`
   - proposal number `S00147`, dates (`3 November 2026`, `3 December 2026`, `16 November`, `4 January 2027`)
   - the client logo in `.client-mark` (replace the SVG with an `<img>`)
3. Prices: edit the `data-qty`, `data-unit` and `data-disc` attributes on each `[data-line]` row in section 10, and the visible numbers in the same rows. Optional items use `data-unit` on each `[data-opt]`. Support plan prices and response times are in `PLANS` at the top of `assets/proposal.js`. Totals, VAT, the payment schedule and the side panel recalculate from these.
4. Update the cover's Odoo panel subtotals (four section rows) and the letter in section 1.
5. Update the expiry date in `assets/proposal.js` (`expiry()`) and the plan start date in the Gantt block if the dates move.
6. Remove every "Sample data" / "Sample figures" tag once the content is real.
7. Single file for email or Drive: `python tools/build_single.py "Proposal - <Client>.html"`. PDF: open the page in Chrome and use the PDF button (A4, desktop layout, signature lines for both parties).

## Copy rules this template follows

- TechNext sets up Odoo and prepares the CAS samples with the client. The client files at its RDO; the registration decision and its timing are the BIR's.
- Never "BIR-accredited", "BIR-certified" or "BIR-compliant". Say "set up for BIR requirements".
- Odoo is never free: the Odoo subscription is billed to the client by Odoo, separate from TechNext's prices.
- Odoo Ready Partner in Singapore. British spelling ("adviser").
- E-invoicing / EIS is out of scope unless quoted separately.
