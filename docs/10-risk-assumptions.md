# Medical Supply Web Project — Risk & Assumptions Document

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Risk & Assumptions

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Project managers, clients, stakeholders, development partners |

*This document makes assumptions explicit and documents risks for the Medical Supply Web Project. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Regulatory Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| R1 | A single national (or state) regulator (Government) is the authority for drug registration and licensing in scope. | Multi-regulator or cross-border would require design changes. |
| R2 | The current regulatory framework allows or does not prohibit a centralised web system for drug/license and ownership records. | Regulatory change could block deployment or require re-architecture. |
| R3 | The legal validity of “ownership” and transfer recorded in the system is accepted by regulators (or will be clarified before production). | If not accepted, the system may serve only as an audit trail alongside traditional processes. |
| R4 | Prescription and controlled-substance rules are out of scope for MVP; no legal obligation to enforce prescription at sale in MVP. | If regulation requires prescription check at sale in MVP, scope increases. |

**Recommendation:** Confirm with legal/regulatory counsel before production deployment.

---

## 2. Integration Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| I1 | No ERP, warehouse, or pharmacy management system integration is required for MVP. | Integration with SAP, etc., would add scope, time, and cost. |
| I2 | Identity for Government, Manufacturer, Pharmacy (and optionally Citizen) can be managed within the project (e.g. built-in auth or existing IdP via API). | Deep integration with government identity or e-health systems could delay MVP. |
| I3 | The REST API is the only integration point for the frontend and future systems. | Direct database access from external systems would require additional security and operations. |
| I4 | Data entered in the MVP is manual or batch (e.g. CSV) where needed; no real-time integration with manufacturing or warehouse systems. | Real-time integration would require additional design and non-functional work. |

---

## 3. Data Privacy Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| P1 | Citizen identifiers (e.g. for “current owner” when a unit is sold to a citizen) may be stored in the system in minimal form; applicable data protection law allows or is addressed by consent/legal basis. | Stricter interpretation could require off-line storage of PII with only a reference in the system. |
| P2 | Verification by UUID does not expose personal data beyond what is necessary for authenticity (e.g. “sold to citizen” vs. citizen name/ID). | If verification must show no PII, design must restrict fields returned. |
| P3 | Data retention and right-to-erasure are governed by policy; the system can support deletion or anonymisation where legally required. | Legal requirement to “delete” certain data must be implementable (e.g. soft delete, anonymisation). |

**Recommendation:** Document data flows and obtain privacy/legal sign-off before go-live.

---

## 4. Scalability Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| S1 | MVP transaction volume remains within ~5,000 writes/day and ~2–5 requests/second peak. | Sustained higher volume would require scaling (database, API, caching). |
| S2 | Single database and single API deployment are sufficient for MVP. | Need for multi-region or high availability would extend design and timeline. |
| S3 | The number of participants (Government, Manufacturer, Pharmacy) remains manageable; new organisations join as additional accounts. | Very large number of distinct organisations may require policy or design review. |
| S4 | Verification read load can be served by API and optional cache. | Very high verification load might require dedicated caching or read replicas. |

---

## 5. Technical & Operational Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| T1 | The chosen stack (e.g. Node/Go, PostgreSQL, React/Vue) remains supported for the project lifecycle. | Early deprecation or breaking changes would require upgrade effort. |
| T2 | The team has or can acquire skills in the chosen API, database, and frontend stack. | Skill gaps could delay delivery or require different resourcing. |
| T3 | A cloud environment (AWS or Azure) or on-premise is available and approved for deployment. | On-prem or hybrid constraints could change deployment timeline and security model. |
| T4 | Citizens use only the verification portal (read-only); they do not need accounts for MVP. | If citizens need accounts or write access, design and scope change. |

---

## 6. Business Assumptions

| # | Assumption | Impact if wrong |
|---|------------|-----------------|
| B1 | At least one Government entity, one Manufacturer, and one Pharmacy are committed to pilot or production use. | Lack of committed participants could make the pilot ineffective. |
| B2 | Budget and timeline (~11 weeks for MVP) are acceptable; no major cut in scope or timeline without scope reduction. | Aggressive cuts without scope change increase delivery risk. |
| B3 | Decisions (e.g. UX, field names, validation rules) can be made in a timely manner during development. | Delayed decisions can delay milestones. |

---

## 7. Risks (Summary)

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Regulatory change or clarification blocks or delays production | Medium | High | Early legal/regulatory engagement; design for flexibility. |
| Scope creep (e.g. prescription, ERP) | High | Medium | Strict PRD and change control; Phase 2 backlog. |
| Performance below target under load | Low | Medium | NFR and load tests in Phase 4; tune database and API. |
| Key person or vendor dependency | Medium | Medium | Documentation, runbooks, and knowledge transfer in Phase 4. |
| Data privacy finding requires rework | Medium | Medium | Privacy review before production; minimal PII in system. |
| Dependency or platform vulnerability | Low | Medium | Track security advisories; plan patch and upgrade windows. |

---

## 8. How to Use This Document

- **In contracts:** Reference “Assumptions” in the development contract; state that a material change in assumptions may trigger a change request.
- **In planning:** Review assumptions with stakeholders and legal/privacy before each phase.
- **In risk review:** Update likelihood/impact and mitigations as the project progresses.

---

*Read together with the PRD, Timeline, and Legal/Commercial document. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
