# AGENTS.md

## Product context
CorpDeals is an employee benefits marketplace.
Users log in with company credentials and should see offers personalized by:
- company
- province
- city

## Product rules
- Logged-in users should land on a clean employee deals experience.
- Header must be minimalistic.
- Rich identity context (company, location, verification) belongs on the landing page hero, not in the persistent header.
- Offers support:
  - COMPANY_WIDE
  - PROVINCE_SPECIFIC
  - CITY_SPECIFIC
- Matching rules:
  - COMPANY_WIDE => all employees of the company
  - PROVINCE_SPECIFIC => offer.provinceCode == user.provinceCode
  - CITY_SPECIFIC => offer.provinceCode == user.provinceCode AND offer.cityName == user.cityName
- If user location is missing, show only COMPANY_WIDE offers and prompt the user to add location.

## UX rules
- After login, user should see:
  - landing page / company deals page
  - search
  - major categories
  - subcategories
  - personalized offers
- Every offer must have:
  - image
  - title
  - category
  - subcategory
  - summary
  - full detail page
  - terms link
  - cancellation policy link
- If vendor image is missing, use default CorpDeals fallback image.
- Apply flow must require:
  - Terms & Conditions checkbox
  - Cancellation Policy checkbox
  - consent checkbox

## Engineering rules
- Reuse the existing architecture.
- Do not refactor unrelated modules.
- Do not redesign routing unless required.
- Keep changes minimal and production-friendly.
- Keep backend filtering authoritative.
- Preserve existing auth flow.
- Preserve existing relationships between users, companies, vendors, and offers.
- Modify existing test/seed data where possible instead of replacing all data.

## Delivery expectations
Always return:
1. files changed
2. schema changes
3. backend changes
4. frontend changes
5. seed/test data updates
6. manual test steps
7. risks or follow-ups