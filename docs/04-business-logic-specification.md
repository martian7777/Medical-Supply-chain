# Medical Supply Web Project — Business Logic Specification

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Business Logic Specification

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Backend developers, solution architects, clients, QA |

*This document defines the business rules and operations for the Medical Supply Web Project. It is implemented in the backend API and database. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Entities

### 1.1 DrugType

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| drugTypeId | string | Yes | Unique identifier (e.g. UUID or code). |
| name | string | Yes | Human-readable name. |
| description | string | No | Optional description. |
| createdAt | string (ISO 8601) | Yes | Creation timestamp (UTC). |
| createdBy | string | Yes | Government user/ID that created it. |

- **Created by:** Government only.  
- **Modified by:** Government only (e.g. name, description).

---

### 1.2 License

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| licenseId | string | Yes | Unique identifier. |
| drugTypeId | string | Yes | Reference to DrugType. |
| manufacturerId | string | Yes | Reference to Manufacturer participant. |
| status | enum | Yes | `valid` \| `revoked`. |
| issuedAt | string (ISO 8601) | Yes | Issuance time (UTC). |
| expiresAt | string (date) | Yes | Expiration date. |
| issuedBy | string | Yes | Government user that issued. |

- **Created by:** Government.  
- **Modified by:** Government (status change, prolongation of expiresAt).

---

### 1.3 MedicineUnit

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| unitId | string | Yes | UUID (format per Data Model). |
| drugTypeId | string | Yes | Reference to DrugType. |
| manufacturerId | string | Yes | Creator (Manufacturer participant ID). |
| licenseId | string | Yes | License under which created. |
| currentOwner | string | Yes | Current owner participant ID. |
| status | enum | Yes | e.g. `active` \| `sold` \| `expired` \| `recalled`. |
| expirationDate | string (date) | Yes | YYYY-MM-DD. |
| createdAt | string (ISO 8601) | Yes | Creation time (UTC). |
| transferHistory | array / relation | Yes | List of { from, to, timestamp, id }. |

- **Created by:** Manufacturer (only with valid License for drugTypeId).  
- **Modified by:** Ownership and history updated only via TransferOwnership operation.

---

## 2. Operations

### 2.1 CreateDrugType

- **Purpose:** Register a new drug type (Government only).
- **Parameters:** drugTypeId (string), name (string), description (string, optional).
- **Validation:** Caller MUST be Government; drugTypeId MUST not already exist; name MUST be non-empty.
- **On success:** Insert DrugType record with createdAt and createdBy.

---

### 2.2 IssueLicense

- **Purpose:** Issue a production license to a manufacturer (Government only).
- **Parameters:** licenseId, drugTypeId, manufacturerId, expiresAt.
- **Validation:** Caller MUST be Government; licenseId unique; drugTypeId and manufacturerId must exist; expiresAt in the future.
- **On success:** Insert License with status `valid`, issuedAt, issuedBy.

---

### 2.3 RevokeLicense

- **Purpose:** Revoke a license (Government only).
- **Parameters:** licenseId.
- **Validation:** Caller MUST be Government; license must exist.
- **On success:** Update License status to `revoked`.

---

### 2.4 ProlongLicense

- **Purpose:** Extend license expiration (Government only).
- **Parameters:** licenseId, newExpiresAt.
- **Validation:** Caller MUST be Government; license must exist and be `valid`; newExpiresAt after current expiresAt.
- **On success:** Update License expiresAt.

---

### 2.5 CreateMedicineUnit

- **Purpose:** Register a new medicine unit with UUID (Manufacturer only, with valid license).
- **Parameters:** unitId (UUID), drugTypeId, expirationDate.
- **Validation:** Caller MUST be Manufacturer; unitId valid UUID and unique; Manufacturer must have valid, non-revoked, non-expired License for drugTypeId; expirationDate per business rule.
- **On success:** Insert MedicineUnit with currentOwner = caller, transferHistory initial entry, status = `active`.

---

### 2.6 TransferOwnership

- **Purpose:** Change owner of a MedicineUnit (Manufacturer → Pharmacy or Pharmacy → Citizen).
- **Parameters:** unitId, newOwnerId.
- **Validation:** Caller MUST be currentOwner; unit must exist and status allow transfer; newOwnerId must be a registered participant (Pharmacy or Citizen); unit must not be expired.
- **On success:** Update MedicineUnit currentOwner; append to transfer history; optionally set status = `sold` when newOwner is Citizen.

---

### 2.7 VerifyUnit (Query)

- **Purpose:** Public read-only lookup by UUID.
- **Parameters:** unitId.
- **Validation:** unitId valid format.
- **Returns:** Drug type info, currentOwner, status, expirationDate, transfer history (no sensitive internal IDs). No authentication required.

---

## 3. Summary Table

| Operation | Who May Call | Writes Data | Key Validations |
|-----------|--------------|-------------|-----------------|
| CreateDrugType | Government | Yes | Unique drugTypeId, non-empty name |
| IssueLicense | Government | Yes | Unique licenseId, DrugType and Manufacturer exist, expiresAt future |
| RevokeLicense | Government | Yes | License exists |
| ProlongLicense | Government | Yes | License valid, newExpiresAt later |
| CreateMedicineUnit | Manufacturer | Yes | Valid UUID, unique unitId, valid license for drugTypeId |
| TransferOwnership | Manufacturer / Pharmacy | Yes | Caller = currentOwner, unit active, newOwnerId valid |
| VerifyUnit | Anyone | No | unitId format; return data or “not found” |

---

*Read together with the Data Model and Product Requirements Document. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
