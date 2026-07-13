# Medical Supply Web Project — Technical Architecture Document

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Technical Architecture

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Solution architects, development teams, clients, technical evaluators |

*This document describes the high-level technical architecture of the Medical Supply Web Project. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. System Type

**Web application** — A centralised web-based system with a backend API, database, and web frontend. Authorized users (Government, Manufacturer, Pharmacy) access role-based dashboards; citizens and the public use a verification page (read-only by UUID).

---

## 2. High-Level Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React or Vue with TypeScript; role-based dashboards and public verification page | Nextjs now
| **API** | REST API (Node.js with Express/Fastify, or Go with e.g. Gin) | or python based on Nextjs.API
| **Database** | Relational database (e.g. PostgreSQL or MySQL) as source of truth |
| **Hosting** | Cloud (AWS or Azure) or on-premise; API and frontend deployable via containers or static + serverless | vercel for now

---

## 3. Backend (REST API)

- **Purpose:** Handle authentication, authorisation, business rules, and all CRUD operations for drug types, licenses, medicine units, participants, and transfers.
- **Responsibilities:** Input validation, role checks (Government / Manufacturer / Pharmacy), database reads/writes, audit logging, response formatting, rate limiting.
- **Endpoints (high-level):**  
  - DrugType: create, list, get by ID, update.  
  - License: issue, revoke, prolong, list by manufacturer.  
  - MedicineUnit: create, get by UUID, transfer ownership, list by owner.  
  - Participants: register, list, update.  
  - Verification: get by UUID (public, read-only).

---

## 4. Database

Supabase 
- **Role:** Single source of truth for drug types, licenses, medicine units, participants, and transfer history.
- **Tables (logical):** DrugType, License, MedicineUnit, Participant, TransferHistory (or equivalent normalised schema per Data Model document).
- **Constraints:** Unique UUID for MedicineUnit; foreign keys; indexes for frequent queries (e.g. by unitId, currentOwner, manufacturerId).

---

## 5. Frontend

- **Framework:** React or Vue with TypeScript or Nextjs
- **Features:** Government dashboard (drug types, licenses, participants), Manufacturer dashboard (create units, transfer to pharmacy), Pharmacy dashboard (receive, transfer to citizen), public verification page (UUID lookup).
- **Authentication:** Login via API (e.g. JWT or session); roles mapped to Government, Manufacturer, or Pharmacy. Verification page is unauthenticated.

---

## 6. Cloud / Deployment

- **Target:** AWS or Azure (or on-premise if required).
- **Components:**  
  - Database (managed RDS or equivalent).  
  - API (container or serverless).  
  - Frontend (static hosting with API gateway, or container).  
- **Infrastructure as Code:** Deployment scripted (e.g. Terraform, CloudFormation, or ARM) for repeatability.

---

## 7. Security Model

| Control | Implementation |
|---------|----------------|
| **TLS** | All client–API communication over HTTPS (TLS 1.2+). |
| **Identities** | One account per user/role; no shared credentials. Passwords hashed; tokens (e.g. JWT) for sessions. |
| **Authorisation** | API enforces role and ownership; reject requests that do not match permissions. |
| **Secrets** | Database credentials and API secrets in a secure vault (e.g. AWS Secrets Manager, Azure Key Vault); not in code or config in version control. |
| **Input validation** | Validate and sanitise all inputs (UUID, dates, IDs) at API to prevent injection and malformed data. |

---

## 8. Architecture Diagram (High-Level)

```
                    +------------------+
                    |   Citizen        |
                    |   (Browser)      |
                    +--------+---------+
                             |
                             | HTTPS (read-only)
                             v
+------------------+  +-----+-------------+  +------------------+
|  Government      |  |   REST API      |  |  Pharmacy        |
|  (Dashboard)     |--|   (Node/Go)     |--|  (Dashboard)     |
+------------------+  +--------+--------+  +------------------+
                    |         |                    |
                    |         |  DB client        |
+------------------+  |         |                    |
|  Manufacturer    |--+         v                    |
|  (Dashboard)     |     +-------------+             |
+------------------+     |  Database   |             |
                         |  (e.g.      |             |
                         |  PostgreSQL)|             |
                         +-------------+             |
                               ^                     |
                               +---------------------+
```

**Data flow:**

1. User action in dashboard or verification page → REST API.
2. API authenticates (if required), validates input, applies business rules, reads/writes database.
3. API returns result to frontend; verification page displays unit info for UUID lookup.

---

## 9. Summary Table

| Item | Choice |
|------|--------|
| System type | Web application |
| API | REST (Node.js or Go); HTTPS only |
| Database | Relational (e.g. PostgreSQL, MySQL) |
| Frontend | React or Vue with TypeScript; dashboards + verification page |
| Cloud | AWS or Azure (TBD) |
| Security | HTTPS; role-based access; secrets in vault; input validation |

---

*Read together with the Business Logic Specification and Data Model document. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
