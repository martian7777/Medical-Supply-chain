# Medical Supply Web Project — UI/UX Wireframes (Basic)

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** UI/UX Wireframes

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | UX/UI designers, frontend developers, clients, product owners |

*This document provides basic wireframes for the Medical Supply Web Project. Refinement in Figma or equivalent is recommended. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Government Dashboard Layout

```
+------------------------------------------------------------------+
|  Medical Supply Web    [Gov User] [Logout]                        |
+------------------------------------------------------------------+
|  Home | Drug Types | Licenses | Participants | Audit              |
+------------------------------------------------------------------+
|                                                                   |
|  Dashboard                                                        |
|  -----------------                                                |
|  +----------------+  +----------------+  +----------------+      |
|  | Drug Types     |  | Licenses       |  | Units (total)   |      |
|  |     12         |  |     8 valid    |  |    1,240        |      |
|  +----------------+  +----------------+  +----------------+      |
|                                                                   |
|  Recent actions                                                   |
|  -----------------                                                |
|  • License issued to PharmaCorp (Drug X) - 02 Oct 2026            |
|  • DrugType "Drug Y" created - 01 Oct 2026                       |
|  • License L-004 revoked - 28 Sep 2026                            |
|                                                                   |
|  [ + Register Drug Type ]  [ + Issue License ]  [ Register Org ]  |
|                                                                   |
+------------------------------------------------------------------+
```

**Key screens:** Drug Types (list + form), Licenses (list, Issue/Revoke/Prolong), Participants (list + Register), Audit (read-only list).

---

## 2. Manufacturer Dashboard Layout

```
+------------------------------------------------------------------+
|  Medical Supply Web    [Manufacturer User] [Logout]               |
+------------------------------------------------------------------+
|  Home | My Licenses | Create Unit | Transfer | My Units            |
+------------------------------------------------------------------+
|  My Licenses                                                      |
|  | Drug Type   | Status  | Expires   | Action   |                   |
|  | Drug A      | Valid   | 2026-12-31| --       |                   |
|  | Drug B      | Valid   | 2026-06-30| Prolong  |                   |
|                                                                   |
|  Create Medicine Unit                                             |
|  Drug Type:    [Dropdown: Drug A, Drug B ]                        |
|  Expiration:   [Date picker]   [ Create Unit ]                   |
|                                                                   |
|  Transfer to Pharmacy                                             |
|  Unit UUID:    [________________]  [ Look up ]                    |
|  To Pharmacy:  [Dropdown]   [ Transfer ]                          |
+------------------------------------------------------------------+
```

---

## 3. Pharmacy Dashboard Layout

```
+------------------------------------------------------------------+
|  Medical Supply Web    [Pharmacy User] [Logout]                   |
+------------------------------------------------------------------+
|  Home | Received Units | Transfer to Citizen                     |
+------------------------------------------------------------------+
|  Units I Own                                                      |
|  | Unit UUID (short) | Drug Type | Expiration | Status | Action   | |
|  | 550e84...         | Drug A    | 2026-08-01 | active | Transfer| |
|                                                                   |
|  Transfer to Citizen                                              |
|  Unit UUID:    [________________]  [ Look up ]                    |
|  Citizen ID:   [________________]   [ Transfer ]                  |
+------------------------------------------------------------------+
```

---

## 4. Verification Page (Public)

```
+------------------------------------------------------------------+
|  Medical Supply Web — Verify Medicine                             |
+------------------------------------------------------------------+
|        Verify a medicine unit by its unique code (UUID)           |
|        [_______________________________________________] [Verify] |
|        Example: 550e8400-e29b-41d4-a716-446655440000              |
+------------------------------------------------------------------+

--- After "Verify" (success) ---
|  Unit ID:     550e8400-e29b-41d4-a716-446655440000                |
|  Drug type:   Drug A (Paracetamol 500mg)   Status: Active          |
|  Current owner: Pharmacy "City Pharmacy"   Expiration: 2026-08-01  |
|  Transfer history:                                                |
|  1. System → PharmaCorp (Manufacturer) - 2026-01-15                |
|  2. PharmaCorp → City Pharmacy - 2026-02-20                       |
|  [ Verify another ]                                               |

--- Not found ---
|  No unit found for this code. Check the code and try again.       |
|  [ Try again ]                                                    |
+------------------------------------------------------------------+
```

No login required; single UUID input with clear success and not-found states.

---

## 5. Wireframe Summary

| Screen | User | Main elements |
|--------|------|----------------|
| Government dashboard | Government | KPIs, Drug Types CRUD, Licenses, Participants |
| Manufacturer dashboard | Manufacturer | My Licenses, Create Unit, Transfer to Pharmacy |
| Pharmacy dashboard | Pharmacy | Units I own, Transfer to Citizen |
| Verification page | Public / Citizen | UUID input, result or “not found” |

---

*For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
