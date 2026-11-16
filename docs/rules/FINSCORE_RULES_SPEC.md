# FinScore Rules Specification (DRAFT v0.1)

> **Status: DRAFT.** Derived mechanically from the business spreadsheets (`MasterSheet of FinScore.xlsx`, cross-checked with `Corporate client scoring.xlsx` and `Retirement new1.xlsm`). It has **not** been approved by the business. Machine-readable twin: [`finscore_rules.json`](finscore_rules.json). Items marked **PROPOSED** are my interpretation; section 10 lists everything that needs a business decision.

## 1. Scope
This is the *current* 15-factor FinScore (0-900) plus the retirement and insurance calculators. It is the deterministic core that the AI layer must call as tools (`calculate_score`, `calculate_retirement`, ...). The Blueprint's 20-pillar model is a separate PROPOSED design and is **not** specified here.

## 2. Scoring mechanics
1. Collect the inputs (section 3) and derive the factor values.
2. For each factor, pick the **age band** (section 4) and the **value band** from that factor's matrix (section 5). The cell is the **factor score, 0-10**.
3. `max_points = 900 / total_weight x weight`. Total weight is **100**, so every weight point is worth **9 points**.
4. `points = factor_score / 10 x max_points`.
5. `FinScore = sum(points)`. Maximum 900.
6. Per-factor ratio `points / max_points` drives the Positive / Negative / Action-area flags (section 8).

## 3. Factors

| ID | Factor | Weight | Max pts | Matrix | Input derivation |
|---|---|---|---|---|---|
| F01 | Cashflow | 10 | 90 | `cashflow` | (income - expenses) / income |
| F02 | Savings | 9 | 81 | `savings` | (income - (expenses + EMIs + monthly investments)) / income [Master]; Corporate omits monthly investments |
| F03 | Assets | 9 | 81 | `assets` | equity + debt + other assets |
| F04 | Networth | 8 | 72 | `networth` | (equity + debt + other assets) - total outstanding loans |
| F05 | Portfolio allocation | 8 | 72 | `portfolio_allocation` | equity / (equity + debt); undefined when both are 0 |
| F06 | Income range | 7 | 63 | `income_range` | annual income (monthly x 12 in Master) |
| F07 | Pending goals | 6 | 54 | `pending_goals` | number of goals to be achieved |
| F08 | Ease of retirement | 6 | 54 | `retirement_sip` | required monthly retirement SIP / monthly surplus (income - expenses) [Master formula] |
| F09 | FOIR | 6 | 54 | `foir` | total EMIs / income |
| F10 | Invested surplus | 6 | 54 | `invested_surplus` | monthly investments / monthly income |
| F11 | Life insurance cover | 5 | 45 | `life_insurance` | life cover amount |
| F12 | Health insurance cover | 5 | 45 | `health_dep0|health_dep1_2|health_dep3p` | health cover amount; matrix chosen by dependants (0 / 1-2 / 3+) |
| F13 | Tax planning 80C | 5 | 45 | `tax_80c` | 80C amount |
| F14 | Tax planning 80D | 5 | 45 | `tax_80d` | 80D amount |
| F15 | Kids goal planning | 5 | 45 | `kids_goals` | Planned / Not planned |

Raw inputs: Name, Age, No. of kids, Monthly income, Monthly expenses, Total outstanding loans, Total EMIs, Equity, Debt, Other assets, Monthly investments, Number of goals, Life cover, Health cover, No. of dependants, Retirement age, Life expectancy, 80C, 80D (+ kids-goal planned flag). The Corporate sheet uses annual income and monthly expenses instead.

## 4. Band lookup convention (PROPOSED)

Age bands: `<=25`, `26-30`, `31-35`, `36-40`, `41-50`, `51-60`, `61+` (the sheets say "Less than 25", leaving age 25 undefined; it is assigned to the first band).

The spreadsheet labels leave gaps (e.g. `30-40%` then `41-50%`) and overlaps (`5-10` then `10-25` lakhs). To make lookup deterministic, each matrix has ascending **cut points**; `band = number of cuts <= value`, so a boundary value falls in the **higher** band. Matrices flagged `zero_exact` give value `0` its own first band.

| Matrix | Unit | Cut points | Zero band |
|---|---|---|---|
| `income_range` | annual income, Rs lakh | 2.5, 5, 10, 15, 25, 50, 75, 100 | - |
| `cashflow` | % of income | 30, 40, 50, 60, 70, 80 | - |
| `savings` | % of income | 10, 20, 30, 40, 50, 70 | - |
| `assets` | Rs lakh | 5, 10, 25, 50, 100, 200 | - |
| `networth` | Rs lakh | 5, 10, 25, 50, 100, 200 | - |
| `life_insurance` | Rs lakh cover | 5, 10, 25, 50, 100, 200 | - |
| `health_dep0` | Rs lakh cover | 2, 5, 10, 15, 20 | - |
| `health_dep1_2` | Rs lakh cover | 2, 5, 10, 15, 20 | - |
| `health_dep3p` | Rs lakh cover | 2, 5, 10, 15, 20 | - |
| `pending_goals` | count (4 = 4 or more) | 1, 2, 3, 4 | - |
| `foir` | % of income | 20, 30, 40, 50, 60 | yes |
| `portfolio_allocation` | equity % of equity+debt | 20, 40, 60, 80 | yes |
| `retirement_sip` | % (Master bands) | 25, 50, 75, 100, 200 | - |
| `invested_surplus` | % of income | 10, 20, 30, 40, 50 | - |
| `tax_80c` | Rs thousand | 25, 50, 75, 100, 125 | - |
| `tax_80d` | Rs thousand | 10, 15, 20, 25 | yes |
| `kids_goals` | 0 = Planned, 1 = Not planned | 1 | - |

## 5. Score matrices (factor score 0-10)

Values are identical in the Master and Corporate workbooks. Only three sets of band *labels* differ (section 10).

### F06 Income range

| Age \ annual income, Rs lakh | less than 2.5 lakhs | 2.5 to 5 lakhs | 5-10 lakhs | 10-15 lakhs | 15-25 lakhs | 25-50 lakhs | 50-75 lakhs | 75-100 lakhs | More than 100 lakhs |
|---|---|---|---|---|---|---|---|---|---|
| <=25 | 6 | 6 | 7 | 7 | 8 | 9 | 10 | 10 | 10 |
| 26-30 | 5 | 6 | 7 | 7 | 8 | 9 | 10 | 10 | 10 |
| 31-35 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 10 | 10 |
| 36-40 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 10 |
| 41-50 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 61+ | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

### F01 Cashflow

| Age \ % of income | Less than 30% | 30-40% | 41-50% | 51-60% | 61-70% | 71-80% | More than 80% |
|---|---|---|---|---|---|---|---|
| <=25 | 5 | 5 | 6 | 7 | 8 | 9 | 10 |
| 26-30 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 31-35 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 36-40 | 3 | 4 | 5 | 7 | 8 | 9 | 10 |
| 41-50 | 3 | 4 | 5 | 6 | 7 | 9 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
| 61+ | 3 | 4 | 5 | 6 | 7 | 8 | 10 |

### F02 Savings

| Age \ % of income | Less than 10% | 10-20% | 20-30% | 30-40% | 40-50% | 50-70% | More than 70% |
|---|---|---|---|---|---|---|---|
| <=25 | 5 | 5 | 6 | 7 | 8 | 9 | 10 |
| 26-30 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 31-35 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 36-40 | 3 | 4 | 5 | 7 | 8 | 9 | 10 |
| 41-50 | 3 | 4 | 5 | 6 | 7 | 9 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
| 61+ | 3 | 4 | 5 | 6 | 7 | 8 | 10 |

### F03 Assets

| Age \ Rs lakh | Less than 5 lakhs | 5-10 lakhs | 10-25 lakhs | 25-50 lakhs | 50-100 lakhs | 100-200 lakhs | more than 200 lakhs |
|---|---|---|---|---|---|---|---|
| <=25 | 6 | 7 | 8 | 9 | 10 | 10 | 10 |
| 26-30 | 5 | 6 | 7 | 8 | 9 | 10 | 10 |
| 31-35 | 4 | 6 | 7 | 8 | 9 | 10 | 10 |
| 36-40 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 41-50 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
| 61+ | 2 | 3 | 4 | 5 | 6 | 7 | 10 |

### F04 Networth

| Age \ Rs lakh | Less than 5 lakhs | 5-10 lakhs | 10-25 lakhs | 25-50 lakhs | 50-100 lakhs | 100-200 lakhs | more than 200 lakhs |
|---|---|---|---|---|---|---|---|
| <=25 | 6 | 7 | 8 | 9 | 10 | 10 | 10 |
| 26-30 | 5 | 6 | 7 | 8 | 9 | 10 | 10 |
| 31-35 | 4 | 6 | 7 | 8 | 9 | 10 | 10 |
| 36-40 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 41-50 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
| 61+ | 2 | 3 | 4 | 5 | 6 | 7 | 10 |

### F11 Life insurance cover

| Age \ Rs lakh cover | Less than 5 lakhs | 5-10 lakhs | 10-25 lakhs | 25-50 lakhs | 50-100 lakhs | 100-200 lakhs | more than 200 lakhs |
|---|---|---|---|---|---|---|---|
| <=25 | 6 | 7 | 8 | 9 | 10 | 10 | 10 |
| 26-30 | 5 | 6 | 7 | 8 | 9 | 10 | 10 |
| 31-35 | 4 | 6 | 7 | 8 | 9 | 10 | 10 |
| 36-40 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 41-50 | 4 | 5 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 7 | 8 | 10 |
| 61+ | 4 | 5 | 6 | 7 | 8 | 9 | 10 |

### F12 Health cover, 0 dependants

| Age \ Rs lakh cover | upto 2 lakhs | 2-5 lakhs | 5-10 lakhs | 10-15 lakhs | 15-20 lakhs | more than 20 lakhs |
|---|---|---|---|---|---|---|
| <=25 | 8 | 10 | 10 | 10 | 10 | 10 |
| 26-30 | 5 | 9 | 10 | 10 | 10 | 10 |
| 31-35 | 5 | 9 | 10 | 10 | 10 | 10 |
| 36-40 | 4 | 8 | 9 | 10 | 10 | 10 |
| 41-50 | 4 | 7 | 9 | 9 | 10 | 10 |
| 51-60 | 3 | 6 | 9 | 9 | 9 | 10 |
| 61+ | 2 | 5 | 8 | 9 | 9 | 10 |

### F12 Health cover, 1-2 dependants

| Age \ Rs lakh cover | upto 2 lakhs | 2-5 lakhs | 5-10 lakhs | 10-15 lakhs | 15-20 lakhs | more than 20 lakhs |
|---|---|---|---|---|---|---|
| <=25 | 4 | 9 | 10 | 10 | 10 | 10 |
| 26-30 | 3 | 8 | 9 | 10 | 10 | 10 |
| 31-35 | 3 | 8 | 9 | 10 | 10 | 10 |
| 36-40 | 2 | 7 | 8 | 9 | 10 | 10 |
| 41-50 | 2 | 6 | 8 | 9 | 10 | 10 |
| 51-60 | 2 | 5 | 7 | 8 | 9 | 10 |
| 61+ | 2 | 4 | 7 | 8 | 9 | 10 |

### F12 Health cover, 3+ dependants

| Age \ Rs lakh cover | upto 2 lakhs | 2-5 lakhs | 5-10 lakhs | 10-15 lakhs | 15-20 lakhs | more than 20 lakhs |
|---|---|---|---|---|---|---|
| <=25 | 3 | 5 | 9 | 10 | 10 | 10 |
| 26-30 | 3 | 7 | 8 | 9 | 10 | 10 |
| 31-35 | 3 | 7 | 8 | 9 | 10 | 10 |
| 36-40 | 2 | 6 | 7 | 8 | 9 | 10 |
| 41-50 | 2 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 1 | 5 | 7 | 8 | 9 | 10 |
| 61+ | 1 | 5 | 7 | 8 | 9 | 10 |

### F07 Pending goals

| Age \ count (4 = 4 or more) | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| <=25 | 10 | 9 | 8 | 7 | 6 |
| 26-30 | 10 | 8 | 7 | 6 | 5 |
| 31-35 | 10 | 8 | 7 | 5 | 4 |
| 36-40 | 10 | 8 | 6 | 5 | 4 |
| 41-50 | 10 | 7 | 6 | 5 | 3 |
| 51-60 | 10 | 6 | 5 | 4 | 2 |
| 61+ | 10 | 6 | 4 | 3 | 2 |

### F09 FOIR

| Age \ % of income | 0 | 1-20% | 21-30% | 31-40% | 41-50% | 50-60% | More than 60% |
|---|---|---|---|---|---|---|---|
| <=25 | 10 | 10 | 9 | 8 | 7 | 6 | 5 |
| 26-30 | 10 | 10 | 9 | 8 | 7 | 6 | 5 |
| 31-35 | 10 | 10 | 8 | 7 | 6 | 5 | 4 |
| 36-40 | 10 | 9 | 8 | 7 | 6 | 5 | 4 |
| 41-50 | 10 | 9 | 8 | 7 | 6 | 5 | 4 |
| 51-60 | 10 | 8 | 7 | 6 | 5 | 4 | 3 |
| 61+ | 10 | 8 | 6 | 5 | 4 | 3 | 2 |

### F05 Portfolio allocation (equity %)

| Age \ equity % of equity+debt | 0 | 0.01-20% | 21.01-40% | 41.01-60% | 61.01-80% | 81.01-100% |
|---|---|---|---|---|---|---|
| <=25 | 5 | 6 | 7 | 8 | 9 | 10 |
| 26-30 | 5 | 6 | 7 | 8 | 10 | 9 |
| 31-35 | 4 | 5 | 6 | 7 | 10 | 8 |
| 36-40 | 4 | 5 | 6 | 10 | 9 | 7 |
| 41-50 | 4 | 5 | 6 | 10 | 8 | 7 |
| 51-60 | 4 | 5 | 6 | 10 | 8 | 7 |
| 61+ | 5 | 8 | 10 | 9 | 7 | 6 |

### F08 Ease of retirement (Master bands)

| Age \ % (Master bands) | 0-25% | 25.01-50% | 50.01-75% | 75.01-100% | 100.01-200% | More than 200% |
|---|---|---|---|---|---|---|
| <=25 | 10 | 9 | 8 | 7 | 6 | 5 |
| 26-30 | 10 | 9 | 8 | 7 | 6 | 5 |
| 31-35 | 10 | 9 | 7 | 6 | 5 | 4 |
| 36-40 | 10 | 8 | 7 | 6 | 5 | 4 |
| 41-50 | 10 | 8 | 6 | 5 | 4 | 3 |
| 51-60 | 10 | 8 | 5 | 4 | 3 | 2 |
| 61+ | 10 | 7 | 5 | 4 | 3 | 2 |

### F10 Invested surplus

| Age \ % of income | 0-10% | 10.1-20% | 20.1-30% | 30.1-40% | 40.1-50% | More than 50% |
|---|---|---|---|---|---|---|
| <=25 | 3 | 5 | 7 | 8 | 9 | 10 |
| 26-30 | 4 | 5 | 7 | 8 | 9 | 10 |
| 31-35 | 4 | 5 | 6 | 8 | 9 | 10 |
| 36-40 | 4 | 5 | 6 | 8 | 9 | 10 |
| 41-50 | 4 | 5 | 6 | 7 | 8 | 10 |
| 51-60 | 3 | 4 | 5 | 6 | 8 | 10 |
| 61+ | 3 | 4 | 5 | 6 | 7 | 10 |

### F13 80C

| Age \ Rs thousand | 0-25K | 26-50K | 50-75K | 75-100K | 100-125K | 125-150K |
|---|---|---|---|---|---|---|
| <=25 | 5 | 6 | 7 | 8 | 9 | 10 |
| 26-30 | 5 | 6 | 7 | 8 | 9 | 10 |
| 31-35 | 5 | 6 | 7 | 8 | 9 | 10 |
| 36-40 | 5 | 6 | 7 | 8 | 9 | 10 |
| 41-50 | 5 | 6 | 7 | 8 | 9 | 10 |
| 51-60 | 5 | 6 | 7 | 8 | 9 | 10 |
| 61+ | 5 | 6 | 7 | 8 | 9 | 10 |

### F14 80D

| Age \ Rs thousand | 0 | 1-10K | 10-15K | 15-20K | 20-25K | More than 25K |
|---|---|---|---|---|---|---|
| <=25 | 0 | 8 | 8 | 9 | 10 | 10 |
| 26-30 | 0 | 7 | 8 | 9 | 10 | 10 |
| 31-35 | 0 | 6 | 7 | 9 | 10 | 10 |
| 36-40 | 0 | 6 | 7 | 9 | 10 | 10 |
| 41-50 | 0 | 5 | 6 | 8 | 9 | 10 |
| 51-60 | 0 | 4 | 5 | 7 | 8 | 10 |
| 61+ | 0 | 4 | 5 | 7 | 8 | 10 |

### F15 Kids goal planning

| Age \ 0 = Planned, 1 = Not planned | Planned | Not Planned |
|---|---|---|
| <=25 | 10 | 0 |
| 26-30 | 10 | 0 |
| 31-35 | 10 | 0 |
| 36-40 | 10 | 0 |
| 41-50 | 10 | 0 |
| 51-60 | 10 | 0 |
| 61+ | 10 | 0 |

## 6. Achievable score range (computed from the matrices)

Lowest and highest possible total for each age band, taking the worst / best band in every matrix (health uses the lowest / highest of the three dependant matrices).

| Age band | Min total | Max total |
|---|---|---|
| <=25 | 416.7 | 900.0 |
| 26-30 | 373.5 | 900.0 |
| 31-35 | 324.0 | 900.0 |
| 36-40 | 296.1 | 900.0 |
| 41-50 | 279.0 | 900.0 |
| 51-60 | 233.1 | 900.0 |
| 61+ | 224.1 | 900.0 |

The minimum depends on age (about 224 to 417), so the fixed 300 floor in the PPT is **not** produced by this arithmetic (see section 10).

## 7. Score messages and stages

| Score | Message |
|---|---|
| 300-500 | Financial health needs an urgent attention. |
| 500-700 | You are doing well. Can do better. |
| 700-900 | Need to maintain the same. |

Wealth stages (Dependency ... Abundance) and the **age x FinScore stage matrix** are **not in any workbook**. This spec does not define them; the Blueprint says that matrix is authoritative once supplied.

## 8. Action areas

Each factor ratio (`points / max_points`) can raise Positive (P), Negative (N) and Action-area (A) flags. The workbook lists which factors can raise which flag; it does **not** give thresholds (open item).

| Factor | Flags |
|---|---|
| Cashflow | P N A |
| Savings | P N A |
| Assets | P |
| Networth | P |
| Portfolio Allocation | P N A |
| Income range | P N A |
| No. of pending goals | P N A |
| Invested surplus | P N A |
| Tax planning 80C | P N A |
| Tax planning 80D | P N A |
| Goal Planning for kids | P N A |
| Ease of retirement | - |
| FOIR | - |
| Life Insurance Cover | - |
| Health Insurance cover | - |

When a factor is weak, improving it also moves these related areas (sheet *Action Area Matrix*):

| Line item | Also impacts |
|---|---|
| Cashflow | Savings, Networth, Asset, Invested surplus |
| Savings | Cashflow, Networth, Asset, Invested surplus |
| Assets | Networth |
| Networth | Assets |
| No. of pending goals | Savings, Networth, Asset, Invested surplus, Cashflow |
| Ease of retirement | Savings, Networth, Asset, Invested surplus, Cashflow |
| Life Insurance Cover | 80C |
| Health Insurance cover | 80D |
| Tax planning 80C | Cashflow, Savings, Networth, Asset, Invested surplus |
| Tax planning 80D | Health insurance |
| Goal Planning for kids | Savings, Networth, Asset, Invested surplus |

No related areas: Portfolio Allocation, Income range, FOIR, Invested surplus.

## 9. Calculators

### 9.1 Risk profile
7 questions, each answered 1-5; option score = lookup per question (table in the JSON, `risk_profile.question_option_scores`). Total (max 35) maps to a profile:

| Total | Profile | Annual return (live) | Annual return (UAT) |
|---|---|---|---|
| <= 10 | CONSERVATIVE | 11.07% | 6% |
| 11-16 | MODERATELY CONSERVATIVE | 12.40% | 9% |
| 17-25 | BALANCED | 15.93% | 12% |
| 26-31 | MODERATELY AGGRESSIVE | 18.03% | 15% |
| 32-35 | AGGRESSIVE | 20.54% | 18% |

### 9.2 Retirement corpus and SIP (monthly compounding, annuity-due)

Inputs: monthly expense `E`, current age, years to retire `Y`, life expectancy `LE`, inflation `i = 8%`, annuity rate `a = 15.93%`, medical corpus `M` (default 0), risk-profile annual return `p`.

```
im        = (1+i)^(1/12) - 1
n         = 12*Y                                   # months to retirement
E_ret     = E * (1+im)^n                            # monthly expense in retirement year
rr        = ((1+a)/(1+i))^(1/12) - 1                # real monthly rate
N_ret     = 12*LE - 12*(age+Y)                      # months in retirement
corpus    = E_ret*(1-(1+rr)^-N_ret)/rr*(1+rr) + M*(1+im)^n
rp        = (1+p)^(1/12) - 1
required_sip = (corpus - FV(savings) - FV(tagged investments)) * rp/((1+rp)^n - 1)/(1+rp)
```

Variants: annual SIP (same with annual rates) and one-time investment `PV = FV/(1+p)^Y`. A step-up SIP (`PMTNew`) is a VBA brute-force solver in the workbook (its saved results are `#NAME?`); it should be replaced by a closed form or root solver. Not specified here.

**Verified test vectors** (reproduce the workbook to the paisa):

| Case | Inputs | E_ret | Corpus | Monthly SIP |
|---|---|---|---|---|
| Master sample | E 30,000, age 32, Y 32, LE 80, Balanced | 3,52,112.49 | 4,05,60,253.60 | 4,421.33 |
| Goals sample | annual expense 8,00,000, age 55, Y 5, LE 75, Balanced | 97,955.21 | 1,08,90,375.42 | 1,21,868.08 |

### 9.3 Life insurance need (HLV)
`need = PV(8%, years_to_retirement, -annual_expenses, type=1)`, `gap = max(need - existing cover, 0)`. Test: age 28, retire 60, expenses 3,60,000 -> need 44,45,927.78.

### 9.4 Goal future value
`FV = goal x (1+inflation)^years`, then SIP / annual / one-time as in 9.2. Test: 30,00,000, 5 yrs, 8% -> 44,07,984.23.

### 9.5 Asset allocation by profile (reference table)

| Profile | Equity | Debt | Gold | Equity return | Blended return |
|---|---|---|---|---|---|
| Aggressive | 80% | 10% | 10% | 24% | 20.5% |
| Moderately Aggressive | 65% | 25% | 10% | 20% | 15.2% |
| Balanced | 50% | 40% | 10% | 15% | 10.6% |
| Moderately Conservative | 40% | 50% | 10% | 12% | 8.5% |
| Conservative | 25% | 65% | 10% | 12% | 7.6% |

Debt 6%, gold 7%.

## 10. Open questions and inconsistencies (need a business decision)

1. **Stage matrix missing.** No age x FinScore wealth-stage matrix exists in the files. The PPT's 8 bands (300-900), the 3 score messages and the arithmetic range in section 6 do not agree with each other.
2. **Score floor.** The achievable minimum is age-dependent (about 224 for 61+ to 417 for <=25, section 6), not 300. Decide whether to rescale to 300-900 or show the raw 0-900 value.
3. **Uninsured / untaxed still score.** Zero life cover (age 26-30), zero health cover with no dependants, and zero 80C each earn 5/10 in the matrices, so having nothing scores 50%. Confirm intent.
4. **Retirement-SIP bands differ.** Master: 0-25%, 25-50%, 50-75%, 75-100%, 100-200%, >200%. Corporate: 0-5%, 6-10%, 10-20%, 20-30%, 30-40%, >40%. Scores are identical, only the thresholds differ. This spec uses Master.
5. **Ease-of-retirement ratio.** Matrix label says "% of income"; Master formula divides by monthly *surplus* (income - expenses). Corporate has no formula. Which is right?
6. **Savings formula differs.** Master subtracts expenses + EMIs + monthly investments; Corporate subtracts expenses + EMIs only. Decide whether investments count as savings (they should not be deducted if they are savings).
7. **Band boundaries and age 25.** Labels leave gaps/overlaps and age 25 is undefined. Section 4 convention is PROPOSED; confirm exact edges, and whether boundaries belong to the higher or lower band.
8. **Units.** Matrices use lakhs and thousands; the Master sample enters raw rupees (assets 900, income 40,000). Define one storage unit (suggest rupees) and convert at lookup.
9. **Kids factor.** Input is hard-coded "Yes" in the sheet and the sample scored 0. Undefined for users with no kids (skip the factor and re-weight, or full marks?).
10. **Pending goals >= 5.** Matrix stops at 4; Corporate sample has 5. Treat 5+ as 4 (assumed).
11. **Portfolio allocation undefined.** Equity/(equity+debt) divides by zero when both are 0; also the matrix is deliberately non-monotonic (peaks mid-range, falls for older ages). Confirm.
12. **Anomalies in matrices.** Life insurance at age 61+ scores higher than 51-60 (4,5,6... vs 3,4,5...). Invested-surplus matrix has a stray `10` in Master cell G138. Matrix titles say "Age + Income + Life cover" but income is not used.
13. **Health matrix selection.** Dependants split is 0 / "Upto 2" / "More than 2". The label does not say whether 1 or 2 dependants fall in "Upto 2"; assumed 1-2.
14. **Retirement sample inputs.** Master sheet hard-codes age 32 while the calculator says 28; Goals sheet hard-codes annual expense 8,00,000 while monthly expense says 50,000. Real calls must wire these to one source.
15. **Three return sets.** Live (11.07-20.54%), UAT (6-18%) and the Asset Allocation sheet (equity 24/20/15/12/12%, blended 20.5/15.2/10.6/8.5/7.6%). The corpus uses a fixed 15.93% annuity rate regardless of profile. Which is production?
16. **Life expectancy / retirement age defaults.** 80 / 60 in Master, 70 / 50 in the Corporate sample. Make them user inputs with documented defaults.
17. **Flag thresholds.** Positive / Negative / Action-area criteria list which factors qualify but give no thresholds. Main Calculator column M (values 6, 0, 5, 4, ...) and cells M18 = 460, J25 = 450*20 are unexplained scratch.
18. **Step-up SIP.** `PMTNew` / `FVnew` are VBA only and currently show `#NAME?`; define the intended maths.
19. **Edge cases.** Income = 0, surplus <= 0, age outside 18-100, negative net worth: not covered by any matrix.

## 11. How this was produced
Matrix scores were read from the `Matrix` sheet of the Master workbook and diffed cell-by-cell against `Sheet1` of the Corporate workbook (0 score differences). Factor weights, formulas, risk-profile tables and calculator formulas were read from the workbooks; calculator outputs were re-derived in Python and matched the workbook's saved values (section 9.2). The band convention and every item marked PROPOSED are my interpretation.