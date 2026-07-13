# Medical Supply Web Project — Timeline & Milestones Document

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Timeline & Milestones

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Project managers, clients, development teams, stakeholders |

*This document defines the phased timeline and acceptance criteria for the Medical Supply Web Project MVP. Distribution beyond authorized recipients requires prior written consent.*

---

## Overview

| Phase | Duration | Focus |
|-------|----------|--------|
| Phase 1 | 6 weeks | Backend & database setup |
| Phase 2 | 7 weeks | Business logic & API |
| Phase 3 | 7 weeks | Frontend |
| Phase 4 | 6 weeks | Testing & deployment |

**Total MVP:** 6 months (approximately 26 weeks).

---

## Phase 1: Backend & Database Setup (Weeks 1–6 / Month 1–1.5)

**Goal:** Database schema, API skeleton, authentication, and deployment pipeline ready.

### Tasks

- Provision database (e.g. PostgreSQL) on cloud or on-premise.
- Implement schema per Data Model (drug types, licenses, medicine_units, participants, transfer history).
- Create API project (Node.js or Go); health and readiness endpoints.
- Implement authentication (e.g. JWT or session); role mapping (Government, Manufacturer, Pharmacy).
- Set up CI/CD and deployment (e.g. container, static frontend placeholder).
- Document runbook and environment setup.

### Deliverables

- Database with tables and indexes; migration scripts.
- API running with auth and role checks; no full business logic yet.
- One-page architecture diagram and deployment documentation.

### Acceptance Criteria

- [ ] All tables created and API can connect to database.
- [ ] Authentication and role-based access work for dashboard endpoints.
- [ ] API deployable to target environment; ready for Phase 2.

---

## Phase 2: Business Logic & API (Weeks 7–13 / Month 2–3)

**Goal:** Full REST API for drug types, licenses, units, transfers, and verification; business rules enforced.

### Tasks

- Implement CRUD and operations per Business Logic Specification (CreateDrugType, IssueLicense, RevokeLicense, ProlongLicense, CreateMedicineUnit, TransferOwnership, VerifyUnit).
- Enforce role and ownership checks in API.
- Add audit logging for all state-changing operations.
- Write unit and integration tests for each operation (success and failure).
- Execute end-to-end scenario: create drug type → issue license → create unit → transfer Mfr → Pharmacy → Pharmacy → Citizen → verify by UUID.

### Deliverables

- API code with full business logic; version tagged (e.g. v0.1.0).
- Test report and list of known limitations.
- OpenAPI or equivalent API description.

### Acceptance Criteria

- [ ] Government can create DrugType and Issue/Revoke/Prolong License via API.
- [ ] Manufacturer can create MedicineUnit only with valid license; can transfer to Pharmacy.
- [ ] Pharmacy can transfer unit to Citizen.
- [ ] Verify endpoint returns correct data for existing UUID and “not found” for invalid UUID.
- [ ] Unauthorised or invalid requests are rejected with appropriate status codes.

---

## Phase 3: Frontend (Weeks 14–20 / Month 3.5–5)

**Goal:** Web dashboards and public verification page connected to API.

### Tasks

- Implement Government dashboard: Drug Types, Licenses, Participants (per wireframes).
- Implement Manufacturer dashboard: My Licenses, Create Unit, Transfer to Pharmacy.
- Implement Pharmacy dashboard: Units I own, Transfer to Citizen.
- Implement public verification page: UUID input, display result or “not found”.
- Connect frontend to API; handle errors and loading states.
- Short user guide: how to log in and perform one action per role.

### Deliverables

- Frontend build (e.g. React/Vue) deployable to static host or container.
- User guide and link to API docs.

### Acceptance Criteria

- [ ] Government can register drug type and issue/revoke license via UI.
- [ ] Manufacturer can create unit and transfer to pharmacy via UI.
- [ ] Pharmacy can transfer unit to citizen via UI.
- [ ] Verification page accepts UUID and shows unit info or “not found” without login.
- [ ] Unauthorised API calls return 403; invalid input returns 400 with clear message.

---

## Phase 4: Testing & Deployment (Weeks 21–26 / Month 5–6)

**Goal:** Integrated testing, security review, deployment, and handover.

### Tasks

- End-to-end tests: full flow from UI through API to database and back.
- Performance test: verify ~5,000 ops/day and response time targets (< 3 s read, < 5 s write P95).
- Security review: no hardcoded secrets, HTTPS, role enforcement, input validation.
- Deploy API, database, and frontend to production-like environment.
- Configure monitoring, logging, and backup per Non-Functional Requirements.
- Document deployment steps, runbooks, and escalation.

### Deliverables

- Test report (E2E, performance, security checklist).
- Deployed system with URL and access instructions.
- Operations runbook and release notes for MVP.

### Acceptance Criteria

- [ ] Full user journey (Gov → Mfr → Pharmacy → Citizen → Verify) passes in deployed environment.
- [ ] Response time and volume meet NFR targets (or deviations documented).
- [ ] No critical or high security issues open; backup and logging in place.
- [ ] Stakeholder sign-off on MVP and readiness for pilot or Phase 2 planning.

---

## Gantt-Style Summary

**Timeline: 6 months (26 weeks)**

|        | M1 | M2 | M3 | M4 | M5 | M6 |
|--------|----|----|----|----|----|-----|
| Phase 1 (Backend & DB)     | ██ | █  |    |    |    |     |
| Phase 2 (Business logic & API) |   | ██ | ██ |    |    |     |
| Phase 3 (Frontend)         |    |    | █  | ██ | ██ |     |
| Phase 4 (Testing & deploy) |    |    |    |    | █  | ██  |

| Week   | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 | 24 | 25 | 26 |
|--------|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Phase 1 | █ | █ | █ | █ | █ | █ |   |   |   |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
| Phase 2 |   |   |   |   |   |   | █ | █ | █ | █  | █  | █  | █  |    |    |    |    |    |    |    |    |    |    |    |    |    |    |    |
| Phase 3 |   |   |   |   |   |   |   |   |   |    |    |    |    | █  | █  | █  | █  | █  | █  | █  |    |    |    |    |    |    |    |    |
| Phase 4 |   |   |   |   |   |   |   |   |   |    |    |    |    |    |    |    |    |    |    |    |    | █  | █  | █  | █  | █  | █  | █  |

---

*For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
