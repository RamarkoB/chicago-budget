# chicago-budget

# More Info from 2026 Budget Breakdown: https://public.tableau.com/app/profile/obm.data.analytics/viz/CityofChicago-BudgetataGlance/ChicagoBudgetataGlance?publish=yes
# Proceeds of debt issuances transferred between funds and reimbursements or internal transfers between funds need to be deducted to more accurately reflect the City appropriation.
# Total resources include revenues generated during the year.

# More Info from Office of Inspector General: https://igchicago.org/information-portal/data-dashboards/city-budget-by-departments/
# Local funds are used by the City for non-capital operations with sources other than grant funds. These include the Corporate Fund, O’Hare Revenue Fund, Water Fund, and other similar funds.
# Grants are financial awards given by the federal, state, or local government authority restricted for a specific project or service.
# Community Development Block Grant (CDBG) funds are provided by federal and state governments to communities and people to be used in a variety of ways including housing, community development programs, healthy food initiatives, and sustainability services.

Outstanding Stuff:
- Designing Sankey chart / Alluvial Diagram 
- Design Remaning Charts from Inspector General Chicago Budget Dashboard
- Find Debt Issuances and Internal Transfers
- What is Dept (38) ????
## Money counted twice (transfers between funds)

The FY2026 Annual Appropriation Ordinance (https://www.chicago.gov/content/dam/city/depts/obm/supp_info/2026Budget/FY2026%20Annual%20Appropriation%20Ordinance.pdf, Summary A, p. 11) reconciles the local-funds total like this:

| FY2026, local funds | Amount |
|---|---|
| Total - All Funds | $14,798,710,460 |
| Deduct Transfers between Funds | $1,700,089,446 |
| Deduct Proceeds of Debt | $125,926,011 |
| **Net Total - All Funds** | **$12,972,695,003** |

`page/data/ordinance.csv` local funds for 2026 sum to exactly $14,798,710,460, so the data is the gross figure.

**Found so far: pension allocations, $1,220,866,110 of the $1,700,089,446.** Accounts 9980-9987 (all under Finance General) are the Corporate, O'Hare, Midway, Water, Sewer, Emergency Communication and Library funds paying into the four pension funds (0681-0684), which then appropriate the same dollars again. They match, to the dollar, the "Pension Allocation" / "Advance Pension Payment" / "Library Pension Residual Allocation" revenue lines on those funds' Estimated Revenue pages. The page has a checkbox (on by default) that drops these accounts.

Pension allocations by year in `ordinance.csv` (accounts 9980-9987):

| Year | $M | | Year | $M |
|---|---|---|---|---|
| 2011-2014 | 0 | | 2021 | 274.2 |
| 2015 | 198.1 | | 2022 | 599.5 |
| 2016 | 192.3 | | 2023 | 948.5 |
| 2017 | 190.9 | | 2024 | 1,100.4 |
| 2018 | 217.9 | | 2025 | 1,256.9 |
| 2019 | 278.9 | | 2026 | 1,220.9 |
| 2020 | 503.2 | | | |

**Still to find:** the other $479,223,336 of 2026 transfers, and the $125,926,011 proceeds of debt (listed as revenue of the Library Fund, 0346). Likely candidates, not yet confirmed: Corporate Fund reimbursements (accounts 9610 / 9611 / 9645, $295.2M in 2026), the Library Fund's "Corporate Fund Subsidy" ($90.5M), and "Transfers In" lines. Other years' deductions come from each year's ordinance PDF; only 2026 has been checked. Pre-2015 years have no 998x accounts, so pensions may have been funded differently then (not checked).

## What is Dept 38?

The same department number under five names in the raw ordinance files: GENERAL SERVICES (2011), FLEET AND FACILITY MANAGEMENT / FFM (2012-2019), DAIS / AIS - Department of Assets, Information and Services (2020-2023), and Department of Fleet and Facility Management again (2024-2026).
