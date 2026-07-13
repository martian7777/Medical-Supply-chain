# Medical Supply Web Project — Legal / Commercial Documents

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Legal & Commercial Guidance

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Legal, procurement, project owners, clients, development partners |

*This document provides guidance on legal and commercial instruments before sharing detailed architecture and design with development companies or clients. It does not constitute legal advice; qualified legal counsel should be engaged. Distribution beyond authorized recipients requires prior written consent.*

---

**NDA documents:** NDA templates and instructions are maintained in the **NDA** branch of this repository, in the `NDA/` folder. Use those documents when sharing confidential information with development companies or clients. This document does not repeat NDA content.

---

## 1. IP Ownership Agreement

**Purpose:** Clarifies ownership of pre-existing IP, deliverables, and custom code.

**Recommended contents:**

- **Client retains:** Pre-existing materials (overview, business requirements, domain knowledge). Optionally: full ownership of all deliverables (API, frontend, database schema, documentation) upon payment.
- **Developer retains (if applicable):** Pre-existing tools, frameworks, libraries, and generic methods. No ownership of client-specific business logic or client data.
- **Deliverables:** All custom software developed for the Medical Supply Web Project (API, frontend, deployment scripts) to be owned by the client upon full payment, unless otherwise agreed.
- **Open source:** Use of OSS under their respective licences; no claim over OSS itself. Custom code for the project is not OSS unless explicitly agreed.
- **Moral rights / patents:** Waiver or assignment of moral rights; handling of patentable ideas (e.g. assign to client or grant licence).

**Action:** Agree and sign IP ownership before development starts; include in the development contract or as an annex.

---

## 2. Development Contract

**Purpose:** Defines scope, responsibilities, acceptance, and liability.

**Recommended contents:**

- **Scope:** Reference to the PRD and MVP scope (Included/Excluded). Changes via change request with impact on timeline and cost.
- **Deliverables:** List (source code, documentation, deployment artefacts, runbooks). Acceptance criteria per milestone (reference Timeline & Milestones document).
- **Responsibilities:** Client provides access, decisions, and content; developer designs, develops, tests, and delivers per specification.
- **Warranties:** Developer warrants that work will substantially conform to the PRD and will not knowingly introduce malicious code. No warranty that the system will be error-free; defects to be fixed during warranty period (e.g. 30–90 days after acceptance).
- **Limitation of liability:** Cap on liability (e.g. total fees paid in the 12 months preceding the claim); exclusion of indirect/consequential damages unless mandatory law prevents it.
- **Indemnity:** Developer indemnifies client against third-party claims that deliverables infringe IP; client indemnifies developer for use of client-provided content and for client’s use of the system in violation of law.
- **Term and termination:** Project term; termination for cause and for convenience; effect on IP, confidentiality, and return of materials.
- **Governing law and dispute resolution:** Applicable law and jurisdiction; preference for mediation/arbitration before litigation.

**Action:** Use the PRD, Technical Architecture, and Timeline as annexes to the contract.

---

## 3. Payment Schedule

**Purpose:** Aligns cash flow with milestones and reduces dispute risk.

**Recommended structure (example):**

| Milestone | % of Total | Trigger |
|-----------|------------|---------|
| Contract signing | 10–20% | Signature and NDA |
| Phase 1 complete | 20–25% | Backend & database acceptance |
| Phase 2 complete | 25–30% | Business logic & API acceptance |
| Phase 3 complete | 25–30% | Frontend acceptance |
| Phase 4 complete | 15–20% | Testing and deployment sign-off |

- **Payment terms:** e.g. Net 30 from acceptance.
- **Currency and method:** Agreed currency; wire transfer or other; invoice requirements.
- **Suspension:** If client does not pay within Y days, developer may suspend work after written notice; interest on late payment if permitted by law.

**Action:** Agree payment schedule in the development contract; tie each phase to Timeline acceptance criteria.

---

## 4. What to Send First (Minimum Package)

When approaching a development company or client, send **first**:

1. **Executive Summary** — Problem, users, value, MVP scope, timeline.
2. **PRD** — Scope, roles, and functional requirements.
3. **Technical Architecture (high-level)** — Stack, API, database, frontend, security.
4. **Business Logic Overview** — Main operations and validation rules.
5. **Timeline & Milestones** — Phases and acceptance criteria.

**Do not send** until an NDA is in place (see the **NDA** branch and `NDA/` folder for NDA templates) and ideally an IP/contract outline:

- Full API or frontend source code.
- Detailed security configuration (credentials, exact ACLs).
- Full Data Model or internal participant structures (unless under NDA).

---

## 5. Summary

| Document | Purpose |
|----------|---------|
| **NDA** | See the **NDA** branch and `NDA/` folder for templates and instructions. |
| **IP ownership** | Clarify ownership of deliverables and pre-existing materials. |
| **Development contract** | Define scope, acceptance, liability, and termination. |
| **Payment schedule** | Tie payments to milestones and avoid ambiguity. |

**Important:** Engage qualified legal counsel to draft or review these documents in your jurisdiction before sharing full design with external parties.

---

*This document is for guidance only and does not replace legal advice. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
