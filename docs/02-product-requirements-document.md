# Medical Supply Web Project — Product Requirements Document (PRD)

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Product Requirements Document

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Development teams, clients, QA, project managers |

*This document defines the Minimum Viable Product (MVP) scope, user roles, permissions, and functional requirements for the Medical Supply Web Project. Distribution beyond authorized recipients requires prior written consent.*

---

## A. MVP Scope Definition

### A.1 Included in MVP

| # | Capability | Owner | Description |
|---|------------|--------|-------------|
| 1 | Drug type registration | Government | Create and maintain “DrugType” records (specification of a medicinal product). |
| 2 | License issuance | Government | Issue “License” records to manufacturers for a given DrugType; support valid and revoked states. |
| 3 | Medicine unit tracking (UUID) | Manufacturer | Create “MedicineUnit” with a unique UUID, linked to DrugType and expiration; only when holding a valid license. |
| 4 | Ownership transfer | Manufacturer, Pharmacy | Transfer ownership: Manufacturer → Pharmacy; Pharmacy → Citizen. All transfers recorded in the system. |
| 5 | Basic verification portal | Public | Anyone may query by UUID and view: drug type, current owner, status, and transfer history (read-only). |
| 6 | Role-based dashboards | Government, Manufacturer, Pharmacy | Web UI for role-specific actions (register, issue, create units, transfer). |
| 7 | REST API | System | API layer for all operations and queries (frontend and future integrations). |
| 8 | Database | System | Persistent storage for drug types, licenses, units, participants, and audit history. |

### A.2 Excluded from MVP (Phase 2 or Later)

| # | Capability | Reason |
|---|------------|--------|
| 1 | Full prescription automation | Requires doctor integration and prescription records; deferred to Phase 2. |
| 2 | IoT integration | Temperature and location sensors; out of scope for MVP. |
| 3 | ERP integration | SAP, warehouse systems, etc.; Phase 2. |
| 4 | Mobile applications | MVP is web-only. |
| 5 | Multi-regulator / multi-country | Single government/regulator in MVP. |
| 6 | Order management (Pharmacy ↔ Manufacturer) | Order workflow deferred to Phase 2. |
| 7 | Doctor role and Prescription asset | Deferred to Phase 2. |

---

## B. User Roles & Permissions

### B.1 Government Admin

| Action | Create | Modify | Read |
|--------|--------|--------|------|
| DrugType | ✅ | ✅ (own) | ✅ All |
| License | ✅ | ✅ (revoke, prolong) | ✅ All |
| MedicineUnit | ❌ | ❌ | ✅ All |
| Participants | ✅ Register | ✅ Update | ✅ All |
| Verification (by UUID) | — | — | ✅ |

### B.2 Manufacturer

| Action | Create | Modify | Read |
|--------|--------|--------|------|
| DrugType | ❌ | ❌ | ✅ All |
| License | ❌ | ❌ | ✅ Own only |
| MedicineUnit | ✅ (if licensed) | ❌ | ✅ Own and relevant units |
| Ownership transfer | ✅ (to Pharmacy) | — | ✅ Relevant units |

### B.3 Pharmacy

| Action | Create | Modify | Read |
|--------|--------|--------|------|
| DrugType | ❌ | ❌ | ✅ All |
| License | ❌ | ❌ | ✅ As needed |
| MedicineUnit | ❌ | ❌ | ✅ Units owned or received |
| Ownership transfer | ✅ (to Citizen) | — | ✅ Relevant units |

### B.4 Citizen (Viewer Only)

| Action | Create | Modify | Read |
|--------|--------|--------|------|
| Verification (by UUID) | — | — | ✅ Public page only |

---

## C. Functional Requirements

### C.1 Government

- **GOV-1** The system MUST allow Government to create a DrugType with required fields (e.g. name, code, description).
- **GOV-2** The system MUST allow Government to update DrugTypes it created; all updates MUST be logged.
- **GOV-3** The system MUST allow Government to create a License linked to a DrugType and a Manufacturer.
- **GOV-4** The system MUST allow Government to set License status to valid or revoked; revocation MUST be logged and MUST prevent new MedicineUnit creation under that license.
- **GOV-5** The system MUST allow Government to prolong (extend) a License; prolongation MUST be logged.
- **GOV-6** The system MUST allow Government to register Manufacturer and Pharmacy participants.
- **GOV-7** The system MUST allow Government to read all DrugTypes, Licenses, MedicineUnits, and transfer history for oversight.

### C.2 Manufacturer

- **MFR-1** The system MUST allow Manufacturer to create a MedicineUnit only when it holds a valid, non-revoked License for the specified DrugType.
- **MFR-2** The system MUST assign each MedicineUnit a unique UUID and MUST reject creation if the UUID already exists.
- **MFR-3** The system MUST require MedicineUnit creation to include: drugTypeId, manufacturerId, expirationDate, and status.
- **MFR-4** The system MUST allow Manufacturer to transfer ownership of a MedicineUnit it owns to a Pharmacy; MUST update currentOwner and append to transfer history.
- **MFR-5** The system MUST prevent Manufacturer from creating a MedicineUnit for a DrugType for which it has no valid License.
- **MFR-6** The system MUST allow Manufacturer to read all DrugTypes, its own Licenses, and MedicineUnits it created or has owned.

### C.3 Pharmacy

- **PH-1** The system MUST allow Pharmacy to transfer ownership of a MedicineUnit it owns to a Citizen; MUST update currentOwner and append to transfer history.
- **PH-2** The system MUST prevent Pharmacy from transferring a unit it does not own.
- **PH-3** The system MUST allow Pharmacy to read DrugTypes and MedicineUnits it owns or has received, plus transfer history.

### C.4 Verification (Public)

- **VER-1** The system MUST provide a verification capability (e.g. API/query by UUID) that returns: drug type, current owner, status, expiration date, and list of past ownership transfers (no authentication required).
- **VER-2** The system MUST return a clear “not found” or “invalid” response when the UUID does not exist or is malformed.
- **VER-3** Verification MUST be read-only and MUST NOT expose private or internal identifiers beyond what is required for the public authenticity check.

### C.5 General / System

- **SYS-1** The system MUST log every ownership transfer (from, to, timestamp, identifier) in an auditable way.
- **SYS-2** The system MUST enforce that only the current owner may initiate a transfer of a MedicineUnit.
- **SYS-3** The system MUST reject any request that violates role permissions (enforced in API and business logic).
- **SYS-4** The system MUST use timestamps in a consistent format (UTC) for all relevant records and events.

---

*Read together with the Technical Architecture and Business Logic Specification. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
