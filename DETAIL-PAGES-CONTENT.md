# ANTZ Command Centre — Labels & Detail Page Content

Full content inventory of all **14 detail pages** (source: `src/detail/pages/`).
Each section has a checkbox — tick the ones you want to keep, strike through the ones to drop.

**Section vocabulary** (from `src/detail/model.ts`): every page is built from the same small set of blocks so all modules read as one product:

| Kind | What it renders |
|---|---|
| `trend` | Large area line — the page's main change-over-time story, with range chips (1Y/6M/3M or 2W/1W/5D) |
| `summary` | 2–4 quick metric tiles |
| `share` | One stacked share bar + legend |
| `breakdown` | Horizontal bar rows, value at the tip |
| `tabs` | Breakdown with a dimension switcher |
| `compare` | Two mini sparkline cards side by side |
| `columns` | Column chart, period-over-period |
| `gauges` | 1–3 donut rings for rates / coverage |
| `ranked` | Ranked list with magnitude bar |
| `stat` | One wide number + optional meter |
| `rows` | Record list (transfers, reports, issues) |
| `timeline` | Dated activity rail |
| `calendar` | Upcoming events, date-led list |

---

## Module Index (labels at a glance)

| # | Label | Route | Accent | Hero number | Hero label | Status chip |
|---|---|---|---|---|---|---|
| 1 | Animals | `#/animals` | 🟢 `#2f9e5b` | 215,432 | Total Animals | +324 this month |
| 2 | Health & Medical | `#/health` | 🔴 `#e93353` | 124 | Hospitalised Animals | Herd status: Healthy |
| 3 | Birth Analytics | `#/births` | 🟠 `#e8590c` | 45 | Births | +12% vs June |
| 4 | Eggs & Incubation | `#/eggs` | 🟡 `#d97706` | 142 | Eggs | On track |
| 5 | Mortality | `#/mortality` | 🍷 `#9d174d` | 8 | Mortality | Below 7-day average |
| 6 | Transfers | `#/transfers` | 🔵 `#2563eb` | 28 | Transfers | 98% completion rate |
| 7 | Vaccination | `#/vaccination` | 🟣 `#6d28d9` | 76 | Vaccinations | 92% herd coverage |
| 8 | Deworming | `#/deworming` | 🩵 `#0d9488` | 63 | Deworming | 94% compliance |
| 9 | Lab Requests | `#/lab` | 🔷 `#0284c7` | 31 | Lab Requests | Avg 6.2 h turnaround |
| 10 | Animal Welfare | `#/welfare` | 🩷 `#db2777` | 92 | Assessments | Welfare score 4.6 / 5 |
| 11 | Approvals | `#/approvals` | 🟪 `#7c3aed` | 14 | Pending Approvals | Avg 1.4 days to decision |
| 12 | Tasks | `#/tasks` | 🟧 `#ea580c` | 18 | Pending Tasks | 87% completed on time |
| 13 | Staff Attendance | `#/attendance` | 🟦 `#4f46e5` | 243 / 312 | Present | 78% attendance |
| 14 | Alerts | `#/alerts` | ❤️ `#dc2626` | 6 | Critical Alerts | Needs review |

Home-tile labels (v3 home, `src/v3/data.ts`) that link to these pages: **Animals** (hero), **Natality**, **Mortality**, **Eggs**, **Alerts**, **Assessment**, **Health & Medical**, **Approvals**, **Tasks**, **Vaccination**, **Transfers**, **Deworming**, **Lab Requests**, **Staff Attendance**.

---

## 1. Animals — `#/animals`

**Hero:** `215,432` — **Total Animals** · "Across 6 sites · 428 species" · status **+324 this month** (good)

- [ ] **1.1 Trend — "Population Trend"** (unit: animals · ranges 1Y / 6M / 3M, monthly Aug–Jul)
  - Values 211,980 → 215,432
  - Note: *"+3,452 animals over 12 months — a steady 1.6% growth with no month of net decline."*
- [ ] **1.2 Summary tiles**
  - Sites **6** (All reporting) · Species **428** (+6 this quarter) · Enclosures **96** (92 occupied) · Growth **1.6%** (Trailing 12 months)
- [ ] **1.3 Share — "Population Summary"** (by sex)
  - Female 101,760 · Male 96,340 · Unknown 17,332
- [ ] **1.4 Breakdown — "Species Breakdown"**
  - Fish 84,200 (96 species) · Invertebrates 52,400 (84) · Birds 38,600 (112) · Mammals 21,900 (68) · Reptiles 12,850 (46) · Amphibians 5,482 (22)
- [ ] **1.5 Compare — "Birth vs Mortality"**
  - Births **45** (+12% vs June) vs Mortality **23** (−18% vs June), each with 6-month sparkline
- [ ] **1.6 Tabs — "Animal Distribution"** (Site Wise / Zone Wise / Enclosure Wise)
  - *Site:* Jamnagar Core 78,420 · Wetland Reserve 46,900 · Aviary Complex 31,250 · Marine Zone 24,860 · Reptile House 22,180 · Quarantine & Rescue 11,822
  - *Zone:* Zone A — Core 62,300 · Zone B — Wetland 51,480 · Zone C — Aviary 44,220 · Zone D — Marine 33,610 · Zone E — Support 23,822
  - *Enclosure:* Aquatic Halls 58,940 (14 units) · Insectarium 46,880 (8) · Open Aviaries 34,210 (11) · Savanna Paddocks 18,760 (9) · Herpetarium 14,320 (12) · All others 42,322 (42)
- [ ] **1.7 Share — "Age Distribution"**
  - Adult 148,930 · Young 42,860 · Senior 23,642
- [ ] **1.8 Breakdown — "Conservation Status"** (IUCN)
  - Least Concern 178,240 (82.7%) · Vulnerable 24,180 (11.2%) · Endangered 9,640 (4.5%) · Critically Endangered 3,372 (1.6%)
- [ ] **1.9 Ranked — "Top Species"**
  - Common Carp 12,400 (Fish · Aquatic Halls) · Zebra Finch 6,820 · Nile Tilapia 5,940 · Indian Peafowl 4,310 · Bengal Fox 1,280
- [ ] **1.10 Timeline — "Recent Animal Activities"**
  - 13:40 Birth — 2 Blackbuck calves born at Savanna Paddock 3
  - 12:05 Transfer — 6 Indian Peafowl moved to Open Aviary 7
  - 10:22 Registration — 18 Zebra Finch hatchlings added to the registry
  - 09:15 Death — 1 senior Nile Tilapia, natural causes, Aquatic Hall 2
  - 08:04 Transfer — 3 Star Tortoise received from Sasan Rescue Centre

---

## 2. Health & Medical — `#/health`

**Hero:** `124` — **Hospitalised Animals** · "Under active veterinary care" · status **Herd status: Healthy** (good)

- [ ] **2.1 Trend — "Weekly Medical Trend"** (unit: under care · ranges 2W / 1W / 5D, daily 17–30 Jul)
  - Values 138 → 124
  - Note: *"Case load has fallen for six of the last seven days — discharges are outpacing admissions."*
- [ ] **2.2 Summary tiles**
  - Today's Admissions **9** (2 critical) · Today's Discharge **14** (All cleared) · Vaccination Due **23** (Next 7 days) · Lab Pending **7** (2 high priority)
- [ ] **2.3 Share — "Case Mix"** (of 124 under care)
  - Recovery 48 · Observation 46 · Isolation 19 · Critical 11
- [ ] **2.4 Breakdown — "Disease Breakdown"**
  - Respiratory 31 (25%) · Gastrointestinal 26 (21%) · Parasitic 22 (18%) · Dermatological 18 (15%) · Trauma / Injury 15 (12%) · Other 12 (10%)
- [ ] **2.5 Breakdown — "Species Wise Health"**
  - Mammals 39 · Birds 34 · Fish 28 · Reptiles 15 · Amphibians 5 · Invertebrates 3 (each with % of group)
- [ ] **2.6 Gauges — "Treatment Success Rate"**
  - Treatment success **94%** (1,284 closed cases YTD) · Discharge under 7 d **78%** (+5 pts vs June)
- [ ] **2.7 Stat — "Medication"**
  - **268** active courses · "42 doses due before 18:00 · 3 courses ending today"
- [ ] **2.8 Rows — "Recent Treatments"** (Last 24 h)
  - Bengal Fox · ANM-40218 — Respiratory infection · Dr. Mehta — 13:20
  - Indian Peafowl · ANM-31877 — Wound dressing, day 3 · Dr. Rao — 11:45
  - Sambar Deer · ANM-22904 — Deworming follow-up · Dr. Iyer — 10:30
  - Star Tortoise · ANM-50133 — Shell lesion review · Dr. Mehta — 09:15
  - Nile Tilapia batch · AQ-118 — Fungal treatment, tank-wide · Dr. Shah — 08:05
- [ ] **2.9 Timeline — "Recent Medical Timeline"**
  - 13:20 Admission — Bengal Fox admitted to Isolation 2, respiratory distress
  - 12:10 Discharge — 6 animals discharged from Observation Ward B
  - 10:55 Lab — Blood panel returned for ANM-22904, within range
  - 09:40 Critical — ANM-40218 escalated to critical watch, 4-hourly checks
  - 08:00 Round — Morning vet round completed across all 6 wards

---

## 3. Birth Analytics — `#/births`

**Hero:** `45` — **Births** · "This month · July 2026" · status **+12% vs June** (good)

- [ ] **3.1 Trend — "Birth Trend"** (unit: births · 1Y / 6M / 3M, monthly)
  - Values 28 → 45
  - Note: *"Nine of the last twelve months came in above the 34-birth baseline."*
- [ ] **3.2 Summary tiles**
  - Successful Deliveries **42** (93% of births) · Still Birth **3** (−2 vs June) · Avg Birth Rate **1.5** (Births per day) · Expected (30 d) **38** (11 species)
- [ ] **3.3 Breakdown — "Species Wise Birth"**
  - Birds 18 (9 species) · Mammals 11 (6) · Fish 9 (3) · Reptiles 5 (4) · Amphibians 2 (2)
- [ ] **3.4 Columns — "Monthly Comparison"** (6 months, July highlighted)
  - 37 · 33 · 40 · 36 · 40 · **45**
- [ ] **3.5 Share — "Birth Distribution"** (by site)
  - Jamnagar Core 16 · Aviary Complex 13 · Wetland Reserve 9 · Marine Zone 5 · Quarantine & Rescue 2
- [ ] **3.6 Gauges — "Delivery Outcome"**
  - Delivery success **93%** (42 of 45) · Neonatal survival **88%** (first 30 days)
- [ ] **3.7 Timeline — "Recent Birth Events"**
  - 13:40 Birth — 2 Blackbuck calves, Savanna Paddock 3, both healthy
  - 11:18 Birth — 1 Sambar Deer fawn, Zone A, under neonatal watch
  - 09:52 Hatch — 18 Zebra Finch hatchlings, Open Aviary 4
  - Yesterday Birth — 4 Nilgai calves, Wetland Reserve, all thriving
  - 28 Jul Still birth — 1 Chital, postmortem completed, no herd risk
- [ ] **3.8 Calendar — "Expected Birth Calendar"**
  - 02 AUG Blackbuck — 3 expected (Savanna Paddock 1 · Dr. Mehta)
  - 07 AUG Sambar Deer — 2 expected (Zone A · neonatal kit prepared)
  - 14 AUG Nilgai — 5 expected (Wetland Reserve · Dr. Rao)
  - 21 AUG Bengal Fox — 4 expected (Savanna Paddock 6 · den monitored)

---

## 4. Eggs & Incubation — `#/eggs`

**Hero:** `142` — **Eggs** · "Collected this month" · status **On track** (good)

- [ ] **4.1 Trend — "Collection Trend"** (unit: eggs · 1Y / 6M / 3M, monthly)
  - Values 96 → 142
  - Note: *"Collection has risen for four consecutive months as the peafowl and francolin seasons overlap."*
- [ ] **4.2 Summary tiles**
  - Collected **142** (This month) · Incubating **21** (6 incubators) · Hatched **96** (89% success) · Discarded **25** (18 infertile)
- [ ] **4.3 Share — "Batch Status"** (of 142 collected)
  - Hatched 96 · Discarded 25 · Incubating 21
- [ ] **4.4 Breakdown — "Species Wise Eggs"**
  - Indian Peafowl 48 (11 clutches) · Zebra Finch 34 (9) · Grey Francolin 22 (6) · Mallard 18 (4) · Emu 12 (3) · Others 8 (2)
- [ ] **4.5 Gauges — "Performance"**
  - Hatch success **89%** (96 of 108 set eggs) · Fertility rate **84%** (+3 pts vs June)
- [ ] **4.6 Stat — "Incubator Performance"**
  - **98.2%** uptime · "6 of 8 incubators active · temperature variance ±0.2 °C"
- [ ] **4.7 Columns — "Monthly Hatch Comparison"**
  - 78 · 71 · 84 · 80 · 88 · **96**
- [ ] **4.8 Timeline — "Recent Egg Activities"**
  - 12:35 Hatch — 9 Indian Peafowl chicks hatched, Incubator 3
  - 10:10 Collected — 6 Grey Francolin eggs collected from Aviary 5
  - 08:45 Candling — Batch EG-2211 candled, 4 of 22 infertile
  - Yesterday Set — 14 Zebra Finch eggs set in Incubator 6
  - 28 Jul Discarded — 5 Mallard eggs discarded after day-10 check
- [ ] **4.9 Calendar — "Expected Hatch Calendar"**
  - 01 AUG Zebra Finch — 14 eggs (Incubator 6 · day 13 of 14)
  - 04 AUG Grey Francolin — 18 eggs (Incubator 2 · day 20 of 23)
  - 09 AUG Indian Peafowl — 21 eggs (Incubator 3 · day 22 of 28)
  - 18 AUG Emu — 8 eggs (Incubator 8 · day 39 of 52)

---

## 5. Mortality — `#/mortality`

**Hero:** `8` — **Mortality** · "Today · 30 July 2026" · status **Below 7-day average** (good)

- [ ] **5.1 Trend — "Mortality Trend"** (unit: deaths · 2W / 1W / 5D, daily)
  - Values 13 → 8
  - Note: *"7-day average is 9.4, down from 11.2 the week before."*
- [ ] **5.2 Summary tiles**
  - This Month **23** (−18% vs June) · 7-Day Avg **9.4** (was 11.2) · Mortality Rate **0.011%** (benchmark 0.018%) · Postmortem Pending **4** (1 over 48 h)
- [ ] **5.3 Share — "Cause of Death"** (this month)
  - Natural 9 · Old Age 6 · Disease 5 · Accident 3
- [ ] **5.4 Breakdown — "Species Wise"**
  - Fish 8 · Invertebrates 6 · Birds 4 · Mammals 3 · Reptiles 2 (each ~0.01–0.02% of group)
- [ ] **5.5 Columns — "Monthly Trend"**
  - 30 · 27 · 26 · 29 · 25 · **23**
- [ ] **5.6 Breakdown — "Location Wise"**
  - Aquatic Halls 9 · Insectarium 5 · Open Aviaries 4 · Savanna Paddocks 3 · Herpetarium 2
- [ ] **5.7 Stat — "Mortality Rate"**
  - **0.011%** · "23 of 215,432 animals this month · industry benchmark 0.018%"
- [ ] **5.8 Rows — "Recent Death Records"** (Last 48 h)
  - Nile Tilapia · AQ-118-07 — Natural, senior, Aquatic Hall 2 — 09:15
  - Chital · ANM-19042 — Accident, fence injury, Zone A — 07:40
  - Zebra Finch · ANM-33810 — Disease, respiratory, Aviary 4 — Yesterday
  - Star Tortoise · ANM-50021 — Old age, 62 years, Herpetarium — Yesterday
  - Giant Prawn batch · AQ-204 — Disease, water quality, Tank 9 — 28 Jul
- [ ] **5.9 Rows — "Postmortem Pending"** (4 cases)
  - Chital ANM-19042 (awaiting Dr. Mehta) · Zebra Finch ANM-33810 (sample at lab, day 2) · Giant Prawn AQ-204 (water panel, day 3) · Mallard ANM-30119 (report drafting, day 1)
- [ ] **5.10 Timeline — "Case History"**
  - 09:15 Death — Nile Tilapia AQ-118-07 recorded, natural, senior cohort
  - 08:30 Postmortem — Zebra Finch ANM-33810 samples dispatched to lab
  - 07:40 Death — Chital ANM-19042, fence injury, Zone A perimeter flagged
  - Yesterday Report — Postmortem closed for Star Tortoise ANM-50021, old age
  - 28 Jul Action — Tank 9 water quality corrected after prawn losses

---

## 6. Transfers — `#/transfers`

**Hero:** `28` — **Transfers** · "This month · July 2026" · status **98% completion rate** (good)

- [ ] **6.1 Trend — "Movement Trend"** (unit: transfers · 1Y / 6M / 3M, monthly)
  - Values 19 → 28
  - Note: *"Movement volume peaks in July every year, tracking the post-monsoon rehousing window."*
- [ ] **6.2 Summary tiles**
  - Incoming **12** (4 institutions) · Outgoing **9** (3 institutions) · Internal **7** (between zones) · External **21** (incoming + outgoing)
- [ ] **6.3 Share — "Transfer Status"** (of 28)
  - Completed 25 · In transit 2 · Pending 1
- [ ] **6.4 Breakdown — "Species Wise"**
  - Mammals 9 · Birds 8 · Reptiles 5 · Fish 4 · Amphibians 2
- [ ] **6.5 Tabs — "Site Wise"** (Origin / Destination)
  - *Origin:* Jamnagar Core 11 · Aviary Complex 7 · Wetland Reserve 5 · External institutions 5
  - *Destination:* Wetland Reserve 9 · Jamnagar Core 8 · External institutions 6 · Quarantine & Rescue 5
- [ ] **6.6 Stat — "Transport Status"**
  - **2** in transit · "Both vehicles on schedule · next arrival 16:40 at Wetland Reserve"
- [ ] **6.7 Gauges — "Performance"**
  - Completion rate **98%** (25 of 28 closed, 0 failed) · On-time arrival **92%** (+7 pts vs June)
- [ ] **6.8 Rows — "Recent Transfers"** (Last 7 days)
  - TRF-1184 · 6 Indian Peafowl — Aviary Complex → Open Aviary 7 — Completed
  - TRF-1183 · 3 Star Tortoise — Sasan Rescue → Quarantine — Completed
  - TRF-1182 · 4 Blackbuck — Jamnagar Core → Wetland Reserve — In transit
  - TRF-1181 · 12 Zebra Finch — Jamnagar Core → Junagadh Zoo — Completed
  - TRF-1180 · 2 Bengal Fox — Awaiting CZA clearance — Pending
- [ ] **6.9 Timeline — "Transfer Timeline"**
  - 12:05 Completed — 6 Indian Peafowl settled into Open Aviary 7
  - 10:30 Departed — 4 Blackbuck left Jamnagar Core for Wetland Reserve
  - 08:04 Received — 3 Star Tortoise received from Sasan Rescue Centre
  - Yesterday Cleared — Quarantine cleared for 12 Zebra Finch outbound batch
  - 27 Jul Pending — CZA clearance requested for 2 Bengal Fox

---

## 7. Vaccination — `#/vaccination`

**Hero:** `76` — **Vaccinations** · "Administered this month" · status **92% herd coverage** (good)

- [ ] **7.1 Trend — "Monthly Progress"** (unit: doses · 1Y / 6M / 3M, monthly)
  - Values 52 → 76
  - Note: *"Twelve-month run rate is 63 doses per month; July is the highest on record."*
- [ ] **7.2 Summary tiles**
  - Completed **76** (This month) · Pending **18** (Next 7 days) · Overdue **5** (Escalated) · Coverage **92%** (Target 95%)
- [ ] **7.3 Gauges — "Coverage"**
  - Herd coverage **92%** (target 95% by September) · Schedule adherence **87%** (5 of 99 overdue)
- [ ] **7.4 Breakdown — "Species Wise"**
  - Mammals 28 (96% covered) · Birds 24 (93%) · Reptiles 12 (89%) · Fish 8 (84%) · Amphibians 4 (90%)
- [ ] **7.5 Ranked — "Top Vaccinated Species"**
  - Blackbuck 18 (FMD booster) · Indian Peafowl 14 (Newcastle disease) · Sambar Deer 11 (FMD booster) · Bengal Fox 9 (Rabies) · Star Tortoise 6 (Herpesvirus)
- [ ] **7.6 Calendar — "Upcoming Vaccinations"**
  - 01 AUG FMD booster — 12 Blackbuck (Savanna Paddock 1 · Dr. Iyer)
  - 03 AUG Newcastle — 20 Peafowl (Aviary Complex · Dr. Rao)
  - 08 AUG Rabies — 6 Bengal Fox (Savanna Paddock 6 · Dr. Mehta)
  - 15 AUG Herpesvirus — 9 Tortoise (Herpetarium · Dr. Mehta)
- [ ] **7.7 Rows — "Recent Vaccinations"** (Last 48 h)
  - Blackbuck · 6 animals — FMD booster · Dr. Iyer — 12:40
  - Indian Peafowl · 8 animals — Newcastle disease · Dr. Rao — 11:05
  - Bengal Fox · 2 animals — Rabies · Dr. Mehta — 09:30
  - Sambar Deer · 4 animals — FMD booster · Dr. Iyer — Yesterday
  - Star Tortoise · 3 animals — Herpesvirus · deferred once — Yesterday

---

## 8. Deworming — `#/deworming`

**Hero:** `63` — **Deworming** · "Treatments this month" · status **94% compliance** (good)

- [ ] **8.1 Trend — "Monthly Trend"** (unit: treatments · 1Y / 6M / 3M, monthly)
  - Values 44 → 63
  - Note: *"Treatment volume has grown 43% over twelve months as the rotation schedule matured."*
- [ ] **8.2 Summary tiles**
  - Completed **63** (This month) · Pending **14** (Next 10 days) · Overdue **4** (2 escalated)
- [ ] **8.3 Stat — "Treatment Coverage"**
  - **89%** · "63 of 71 scheduled animals treated this cycle"
- [ ] **8.4 Breakdown — "Species Wise"**
  - Mammals 24 (92% covered) · Birds 18 (90%) · Reptiles 11 (86%) · Fish 7 (81%) · Amphibians 3 (88%)
- [ ] **8.5 Columns — "Cycle Comparison"**
  - 50 · 58 · 53 · 60 · 56 · **63**
- [ ] **8.6 Calendar — "Upcoming Schedule"**
  - 02 AUG Rotation A — 14 mammals (Savanna Paddocks · Dr. Iyer)
  - 06 AUG Rotation B — 11 birds (Open Aviaries · Dr. Rao)
  - 12 AUG Rotation C — 8 reptiles (Herpetarium · Dr. Mehta)
  - 19 AUG Faecal recheck — 20 animals (Lab-linked · Dr. Shah)
- [ ] **8.7 Timeline — "Recent Activities"**
  - 12:15 Treated — 9 Blackbuck dewormed, Rotation A, Savanna Paddock 1
  - 10:40 Treated — 6 Indian Peafowl dewormed, Open Aviary 4
  - 09:20 Recheck — Faecal egg count cleared for 12 Sambar Deer
  - Yesterday Overdue — 4 Herpetarium animals missed the 28 Jul slot
  - 28 Jul Treated — 7 Nile Tilapia batches treated, Aquatic Hall 2

---

## 9. Lab Requests — `#/lab`

**Hero:** `31` — **Lab Requests** · "Open this month" · status **Avg 6.2 h turnaround** (good)

- [ ] **9.1 Trend — "Request Volume"** (unit: requests · 2W / 1W / 5D, daily)
  - Values 6, 8, 5 … 5
  - Note: *"Monday remains the peak intake day, driven by weekend sample backlogs."*
- [ ] **9.2 Summary tiles**
  - Pending **9** (2 over SLA) · Completed **19** (This month) · Rejected **3** (Sample quality) · High Priority **6** (4 in progress)
- [ ] **9.3 Share — "Request Status"** (of 31)
  - Completed 19 · Pending 9 · Rejected 3
- [ ] **9.4 Stat — "Samples Collected"**
  - **27** of 31 (87%) · "4 awaiting collection · 2 scheduled for this evening"
- [ ] **9.5 Stat — "Turnaround Time"**
  - **6.2** hours avg · "−38% vs June (10.0 h) · SLA is 12 h"
- [ ] **9.6 Breakdown — "Sample Status"**
  - Reported 19 · In analysis 6 · Received 2 · Awaiting collection 4
- [ ] **9.7 Breakdown — "Species Wise"**
  - Mammals 11 · Birds 8 · Fish 6 · Reptiles 4 · Amphibians 2
- [ ] **9.8 Gauges — "Lab Performance"**
  - Within SLA **96%** (18 of 19 reports) · Sample validity **90%** (3 rejections this month)
- [ ] **9.9 Rows — "Recent Reports"** (Last 48 h)
  - LAB-2291 · Blood panel — Sambar Deer ANM-22904 · normal — 10:55
  - LAB-2288 · Faecal egg count — Blackbuck herd · low burden — 09:10
  - LAB-2286 · Water quality — Tank 9 · ammonia elevated — Yesterday
  - LAB-2284 · Histopathology — Zebra Finch ANM-33810 · pending — Yesterday
  - LAB-2280 · Swab culture — Bengal Fox ANM-40218 · rejected — 28 Jul

---

## 10. Animal Welfare — `#/welfare`

**Hero:** `92` — **Assessments** · "Completed this month" · status **Welfare score 4.6 / 5** (good)

- [ ] **10.1 Trend — "Assessment Trend"** (unit: welfare score · 1Y / 6M / 3M, monthly)
  - Values 4.1 → 4.6
  - Note: *"Twelve straight months of improvement — a 9% lift from 4.1 to 4.6."*
- [ ] **10.2 Summary tiles**
  - Welfare Score **4.6** (Above benchmark) · Enclosures Audited **84** (Of 96) · Open Issues **7** (2 high priority) · Overdue Audits **3** (Due this week)
- [ ] **10.3 Share — "Assessment Outcomes"** (of 92)
  - Excellent 38 · Good 34 · Average 14 · Needs Attention 5 · Critical 1
- [ ] **10.4 Gauges — "Welfare Score"**
  - Overall score **92%** (4.6 of 5 · benchmark 4.2) · Enrichment delivered **88%** (84 of 96 enclosures)
- [ ] **10.5 Tabs — "Assessment Coverage"** (Species Wise / Enclosure Wise)
  - *Species:* Mammals 28 (4.7 avg) · Birds 24 (4.6) · Reptiles 16 (4.5) · Fish 14 (4.4) · Amphibians 6 (4.6) · Invertebrates 4 (4.5)
  - *Enclosure:* Savanna Paddocks 22 (4.8 avg) · Open Aviaries 20 (4.6) · Aquatic Halls 18 (4.4) · Herpetarium 16 (4.5) · Insectarium 10 (4.5) · Quarantine 6 (4.2)
- [ ] **10.6 Rows — "Recent Assessments"** (Last 7 days)
  - Savanna Paddock 1 — Excellent · 4.9 · Dr. Iyer — Today
  - Open Aviary 4 — Good · 4.5 · enrichment noted — Today
  - Aquatic Hall 2 — Average · 3.9 · water clarity — Yesterday
  - Herpetarium 3 — Good · 4.4 · basking upgrade done — 28 Jul
  - Quarantine Ward B — Needs attention · 3.4 · space — 27 Jul
- [ ] **10.7 Rows — "Open Issues"** (7 open)
  - Quarantine Ward B — space per animal (High · 3 days)
  - Aquatic Hall 2 — water clarity (High · 1 day)
  - Open Aviary 7 — perch variety (Medium · 6 days)
  - Insectarium — humidity drift (Medium · 8 days)
  - Savanna Paddock 6 — shade cover (Low · 12 days)
- [ ] **10.8 Rows — "Recommendations"**
  - Add second filtration cycle, Aquatic Hall 2 — projected +0.4 welfare score — by 02 Aug
  - Redistribute Quarantine Ward B intake — resolves the only critical rating — by 01 Aug
  - Extend enrichment rota to 96 enclosures — closes the 12-enclosure gap — by 10 Aug

---

## 11. Approvals — `#/approvals`

**Hero:** `14` — **Pending Approvals** · "Across 4 departments" · status **Avg 1.4 days to decision** (good)

- [ ] **11.1 Trend — "Approval Volume"** (unit: requests · 1Y / 6M / 3M, monthly)
  - Values 96 → 128
  - Note: *"128 requests raised this month; 114 already closed."*
- [ ] **11.2 Summary tiles**
  - Approved Today **9** (1 rejected) · Avg Approval Time **1.4 d** (was 1.9 d) · Overdue **3** (past 3-day SLA) · Raised This Month **128** (114 closed)
- [ ] **11.3 Share — "Department Wise"** (of 14 pending)
  - Finance 5 · Veterinary 4 · HR 3 · Administration 2
- [ ] **11.4 Gauges — "Performance"**
  - Closed within SLA **88%** (3-day window) · First-pass approval **91%** (9 of 128 sent back)
- [ ] **11.5 Rows — "Overdue Requests"** (3 requests)
  - APR-4412 · Feed contract renewal — Finance · ₹18.4L · with CFO — 5 days
  - APR-4408 · Locum vet engagement — HR · 2 positions · with HR head — 4 days
  - APR-4401 · Herpetarium retrofit — Administration · ₹6.2L — 4 days
- [ ] **11.6 Timeline — "Approval Timeline"**
  - 13:10 Approved — APR-4431 vaccine procurement cleared by Dr. Mehta
  - 11:35 Raised — APR-4433 incubator spare parts, ₹1.2L, Finance queue
  - 10:20 Rejected — APR-4425 off-site enrichment trip, insufficient cover
  - 09:05 Escalated — APR-4412 feed contract escalated to the CFO
  - Yesterday Approved — 6 routine requests auto-cleared under delegated limits
- [ ] **11.7 Rows — "Recent Requests"** (Last 48 h)
  - APR-4433 · Incubator spare parts — Finance · ₹1.2L — Pending
  - APR-4431 · Vaccine procurement — Veterinary · ₹3.8L — Approved
  - APR-4429 · Night-shift roster change — HR · 12 staff — Approved
  - APR-4425 · Off-site enrichment trip — Administration · 2 keepers — Rejected
  - APR-4422 · Lab reagent restock — Veterinary · ₹0.9L — Approved

---

## 12. Tasks — `#/tasks`

**Hero:** `18` — **Pending Tasks** · "Week of 27 Jul – 02 Aug" · status **87% completed on time** (good)

- [ ] **12.1 Trend — "Completion Trend"** (unit: tasks closed · 2W / 1W / 5D, daily)
  - Note: *"41 of 76 tasks closed this week — mid-week is consistently the most productive stretch."*
- [ ] **12.2 Summary tiles**
  - Completed **41** (This week) · In Progress **12** (5 due today) · Overdue **5** (2 high priority) · Today's Tasks **14** (9 closed)
- [ ] **12.3 Share — "Status"** (of 76 this week)
  - Completed 41 · Pending 18 · In Progress 12 · Overdue 5
- [ ] **12.4 Breakdown — "Department Wise"**
  - Veterinary 24 (18 closed) · Animal Keeping 21 (14) · Maintenance 15 (6) · Lab 9 (2) · Administration 7 (1)
- [ ] **12.5 Share — "Priority Wise"** (of 18 pending)
  - Medium 8 · High 6 · Low 4
- [ ] **12.6 Rows — "Recent Tasks"** (Last 24 h)
  - Zone A perimeter fence inspection — Maintenance · High · Ramesh K. — In progress
  - Tank 9 filtration service — Maintenance · High · overdue 1 day — Overdue
  - Morning vet round — Ward B — Veterinary · Dr. Rao — Completed
  - Enrichment rota update — Animal Keeping · Priya S. — Completed
  - Reagent stock count — Lab · Medium · Dr. Shah — Pending
- [ ] **12.7 Calendar — "Upcoming Deadlines"**
  - 31 JUL Tank 9 filtration service (Maintenance · High · Ramesh K.)
  - 01 AUG Monthly census reconciliation (Administration · 6 sites)
  - 02 AUG Quarantine Ward B intake review (Veterinary · welfare-linked)
  - 05 AUG Incubator calibration (Lab · all 8 units)

---

## 13. Staff Attendance — `#/attendance`

**Hero:** `243 / 312` — **Present** · "Shift A · 30 July 2026" · status **78% attendance** (good)

- [ ] **13.1 Trend — "Weekly Trend"** (unit: % present · 2W / 1W / 5D, daily)
  - Values 72 → 78
  - Note: *"Weekend dips are structural; weekday attendance has held above 77% all week."*
- [ ] **13.2 Summary tiles**
  - Present **243** (78% of roster) · Absent **41** (13%) · Late **18** (within present) · On Leave **28** (9%)
- [ ] **13.3 Share — "Roster Split"** (of 312 staff)
  - Present 243 · Absent 41 · On Leave 28
- [ ] **13.4 Stat — "Attendance %"**
  - **78%** · "243 of 312 staff on campus · target 82%"
- [ ] **13.5 Tabs — "Distribution"** (Department Wise / Shift Wise)
  - *Department:* Animal Keeping 96 (84% present) · Veterinary 42 (91%) · Maintenance 38 (72%) · Security 34 (89%) · Administration 21 (76%) · Lab 12 (92%)
  - *Shift:* Shift A · 06–14 — 118 (86%) · Shift B · 14–22 — 84 (76%) · Shift C · 22–06 — 41 (68%)
- [ ] **13.6 Columns — "Monthly Trend"** (avg %)
  - 71 · 73 · 72 · 75 · 76 · **78**
- [ ] **13.7 Rows — "Recent Check-ins"** (Last 60 min)
  - Ramesh Kumar — Maintenance · Shift B · Gate 2 — 13:58
  - Priya Sharma — Animal Keeping · Shift B · Gate 1 — 13:52
  - Dr. Anil Rao — Veterinary · Shift B · Gate 1 — 13:47
  - Kiran Patel — Security · Shift B · Gate 3 — 13:41
  - Meena Joshi — Administration · late by 22 min — 13:22

---

## 14. Alerts — `#/alerts`

**Hero:** `6` — **Critical Alerts** · "Open now · 36 alerts in total" · status **Needs review** (warn)

- [ ] **14.1 Trend — "Alert Volume"** (unit: alerts raised · 2W / 1W / 5D, daily)
  - Values 19 → 8
  - Note: *"Daily volume has halved since Monday as the IoT sensor calibration completed."*
- [ ] **14.2 Summary tiles — "Severity"**
  - Critical **6** (Immediate action) · High **9** (Within 4 h) · Medium **14** (Within 24 h) · Low **7** (Backlog)
- [ ] **14.3 Share — "Severity Split"** (of 36 open)
  - Medium 14 · High 9 · Low 7 · Critical 6
- [ ] **14.4 Breakdown — "Alert Source"**
  - Medical Alerts 11 (2 critical) · IoT Alerts 9 (1 critical) · Infrastructure 9 (2 critical) · Weather Alerts 5 (1 critical) · Animal Escapes 2 (both contained)
- [ ] **14.5 Summary tiles — "Resolution"**
  - Open **36** (6 critical) · Resolved **128** (This month) · Avg Response **12 min** (critical alerts)
- [ ] **14.6 Gauges — "Performance"**
  - Resolved within SLA **96%** (123 of 128 this month) · Auto-resolved **41%** (IoT self-clearing)
- [ ] **14.7 Timeline — "Alert Timeline"**
  - 13:48 Critical — Tank 9 ammonia above threshold, filtration service raised
  - 12:30 Resolved — Aviary 4 humidity sensor back within range
  - 11:12 High — Zone A perimeter gate left unsecured for 6 minutes
  - 09:40 Critical — ANM-40218 vitals escalated, 4-hourly checks started
  - 07:05 Weather — Heavy rain warning issued for the Jamnagar district
- [ ] **14.8 Rows — "Recent Alerts"** (36 open)
  - ALT-9241 · Tank 9 ammonia — IoT · critical · Aquatic Hall 2 — 12 min
  - ALT-9238 · ANM-40218 vitals — Medical · critical · Isolation 2 — 4 h
  - ALT-9235 · Gate 4 unsecured — Infrastructure · high · Zone A — 3 h
  - ALT-9231 · Heavy rain warning — Weather · high · campus-wide — 7 h
  - ALT-9228 · Aviary 7 door sensor — IoT · medium · intermittent — 1 day

---

## Section usage across pages (for quick comparison)

| Page | trend | summary | share | breakdown | tabs | compare | columns | gauges | ranked | stat | rows | timeline | calendar | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Animals | 1 | 1 | 2 | 2 | 1 | 1 | – | – | 1 | – | – | 1 | – | **10** |
| Health & Medical | 1 | 1 | 1 | 2 | – | – | – | 1 | – | 1 | 1 | 1 | – | **9** |
| Birth Analytics | 1 | 1 | 1 | 1 | – | – | 1 | 1 | – | – | – | 1 | 1 | **8** |
| Eggs & Incubation | 1 | 1 | 1 | 1 | – | – | 1 | 1 | – | 1 | – | 1 | 1 | **9** |
| Mortality | 1 | 1 | 1 | 2 | – | – | 1 | – | – | 1 | 2 | 1 | – | **10** |
| Transfers | 1 | 1 | 1 | 1 | 1 | – | – | 1 | – | 1 | 1 | 1 | – | **9** |
| Vaccination | 1 | 1 | – | 1 | – | – | – | 1 | 1 | – | 1 | – | 1 | **7** |
| Deworming | 1 | 1 | – | 1 | – | – | 1 | – | – | 1 | – | 1 | 1 | **7** |
| Lab Requests | 1 | 1 | 1 | 2 | – | – | – | 1 | – | 2 | 1 | – | – | **9** |
| Animal Welfare | 1 | 1 | 1 | – | 1 | – | – | 1 | – | – | 3 | – | – | **8** |
| Approvals | 1 | 1 | 1 | – | – | – | – | 1 | – | – | 2 | 1 | – | **7** |
| Tasks | 1 | 1 | 2 | 1 | – | – | – | – | – | – | 1 | – | 1 | **7** |
| Staff Attendance | 1 | 1 | 1 | – | 1 | – | 1 | – | – | 1 | 1 | – | – | **7** |
| Alerts | 1 | 2 | 1 | 1 | – | – | – | 1 | – | – | 1 | 1 | – | **8** |

Every page opens **hero → trend → summary**, then varies by module, and ends on a records/timeline/calendar block — so whichever sections you keep, the reading rhythm stays consistent.
