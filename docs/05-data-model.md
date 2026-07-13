# Medical Supply Web Project — Data Model Document

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Data Model Specification

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Developers, solution architects, clients, QA |

*This document defines the data structures, field types, and conventions for the Medical Supply Web Project. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Conventions

- **Timestamps:** ISO 8601 UTC (e.g. `2026-10-02T14:30:00Z`).  
- **Dates (no time):** `YYYY-MM-DD` (e.g. `2026-12-31`).  
- **UUID:** RFC 4122 version 4 (e.g. `550e8400-e29b-41d4-a716-446655440000`); used for unitId and optionally for drugTypeId, licenseId.  
- **Required vs optional:** “Required” = must be present for valid create/update; “Optional” = may be null or omitted.

---

## 2. DrugType

| Field | Data Type | Required | Description |
|-------|-----------|----------|-------------|
| drugTypeId | string | Yes | Unique ID (UUID or regulatory code). |
| name | string | Yes | Display name. |
| description | string | No | Optional description. |
| createdAt | string (ISO 8601) | Yes | Set by system on create. |
| createdBy | string | Yes | Government user ID. |

**Storage:** Table `drug_types` (or equivalent); primary key `drugTypeId`.

---

## 3. License

| Field | Data Type | Required | Description |
|-------|-----------|----------|-------------|
| licenseId | string | Yes | Unique ID. |
| drugTypeId | string | Yes | FK to DrugType. |
| manufacturerId | string | Yes | FK to Manufacturer participant. |
| status | enum | Yes | `valid` \| `revoked`. |
| issuedAt | string (ISO 8601) | Yes | Set by system on issue. |
| expiresAt | string (date) | Yes | Expiration date. |
| issuedBy | string | Yes | Government user ID. |

**Expiration logic:**  
- If status = `revoked` → invalid regardless of expiresAt.  
- If status = `valid` and expiresAt < today → treat as expired (no new MedicineUnit creation).  
- ProlongLicense updates expiresAt only when status is `valid`.

**Storage:** Table `licenses`; primary key `licenseId`.

---

## 4. MedicineUnit

| Field | Data Type | Required | Description |
|-------|-----------|----------|-------------|
| unitId | string (UUID) | Yes | Unique unit identifier (RFC 4122 v4). |
| drugTypeId | string | Yes | FK to DrugType. |
| manufacturerId | string | Yes | Creator (Manufacturer participant ID). |
| licenseId | string | Yes | License under which created. |
| currentOwner | string | Yes | Participant ID of current owner. |
| status | enum | Yes | `active` \| `sold` \| `expired` \| `recalled`. |
| expirationDate | string (date) | Yes | YYYY-MM-DD. |
| createdAt | string (ISO 8601) | Yes | Set by system on create. |
| transferHistory | array or relation | Yes | Append-only list of transfers. |

**TransferRecord (element of transferHistory):**

| Field | Data Type | Required | Description |
|-------|-----------|----------|-------------|
| from | string | Yes | Previous owner ID or "system" for creation. |
| to | string | Yes | New owner ID. |
| timestamp | string (ISO 8601) | Yes | Time of transfer. |
| id | string | Yes | Unique transfer/audit record ID. |

**Expiration logic:**  
- On read/verify: if expirationDate < today and status still `active`, may display as “expired” or update status.  
- TransferOwnership MUST reject if unit is already expired.

**Storage:** Table `medicine_units` (primary key `unitId`); transfer history in same table (JSON/JSONB) or separate table `transfer_history` with unitId, from, to, timestamp, id.

---

## 5. Participant

| Field | Data Type | Required | Description |
|-------|-----------|----------|-------------|
| participantId | string | Yes | Unique ID. |
| role | enum | Yes | `government` \| `manufacturer` \| `pharmacy` \| `citizen`. |
| name | string | Yes | Display name / organisation name. |
| registeredAt | string (ISO 8601) | No | When registered. |
| registeredBy | string | No | Government user that registered. |

**Storage:** Table `participants`; primary key `participantId`.

---

## 6. UUID Format (MedicineUnit.unitId)

- **Format:** RFC 4122 version 4.  
- **Example:** `550e8400-e29b-41d4-a716-446655440000`.  
- **Generation:** Server-side or client-side; validated before CreateMedicineUnit.  
- **Uniqueness:** Unique constraint on unitId; reject insert if exists.

---

## 7. Indexes / Queries

- DrugType by drugTypeId.  
- License by licenseId; list by manufacturerId, drugTypeId.  
- MedicineUnit by unitId; list by currentOwner, manufacturerId.  
- VerifyUnit: get MedicineUnit by unitId, return public subset and transfer history.

---

*Read together with the Business Logic Specification and Product Requirements Document. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
