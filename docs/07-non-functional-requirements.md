# Medical Supply Web Project — Non-Functional Requirements

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Non-Functional Requirements

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Development teams, operations, clients, QA |

*This document defines non-functional requirements for the Medical Supply Web Project. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Expected Transaction Volume (MVP)

| Metric | Target | Notes |
|--------|--------|--------|
| **Write operations per day** | Up to ~5,000 | Create unit, transfer, and related updates. |
| **Peak requests per second** | ~2–5 | Short bursts during business hours. |
| **Verification queries** | Read-only; may be higher (e.g. 500–1,000/day). | May be cached at API layer. |

The system MUST support at least 5,000 write operations per day without degradation under normal load.

---

## 2. Response Time

| Operation | Target | Measurement |
|-----------|--------|-------------|
| **API response (read/query)** | < 3 seconds | P95, end-to-end (browser → API → database → response). |
| **API response (write)** | < 5 seconds | P95. |
| **Verification page (by UUID)** | < 3 seconds | P95. |
| **Dashboard load (first paint)** | < 2 seconds | P95 for authenticated pages. |

---

## 3. Security Requirements

- **Transport:** All client–API communication over TLS 1.2+ (HTTPS).
- **Identities:** One account per user/role; no shared credentials. Passwords hashed; tokens (e.g. JWT) for sessions.
- **API authentication:** Dashboard endpoints require authentication; verification endpoint may be unauthenticated but MUST be rate-limited.
- **Authorisation:** Enforce role and ownership at API; reject requests that violate permissions.
- **Secrets:** No hardcoded credentials in source or config under version control; use a secure vault (e.g. AWS Secrets Manager, Azure Key Vault).
- **Input validation:** Validate and sanitise all inputs (UUID, dates, IDs) at API to prevent injection and malformed data.

---

## 4. Logging & Audit Requirements

- **Application logs:** API MUST log request identifiers, user/role, action, and outcome (success/failure) without logging sensitive payloads.
- **Audit trail:** Business events (drug type creation, license issuance/revocation, unit creation, ownership transfer) MUST be recorded with timestamp and identifier (e.g. in database or audit table).
- **Access logs:** Log authentication failures and unauthorised access attempts; retain logs for at least 90 days (configurable).
- **Log storage:** Logs in a durable store (e.g. cloud logging); access restricted.

---

## 5. Backup Policy

- **Database:** Primary source of truth. Backup strategy MUST include periodic backup (e.g. daily); retention per policy (e.g. 30 days).
- **Recovery:** Documented recovery procedure; RTO and RPO defined (e.g. RTO 4 hours, RPO 24 hours for MVP).
- **API/frontend:** Stateless; no backup of application code required beyond version control; config and secrets in vault.

---

## 6. Cloud Deployment Expectations

- **Environment:** Single cloud provider (AWS or Azure) or on-premise; regions to be defined.
- **Infrastructure as Code:** Deployment scripted (e.g. Terraform, CloudFormation, ARM) for repeatability.
- **Scaling:** API horizontally scalable (e.g. behind load balancer); database scaling per provider best practices.
- **Monitoring:** Health checks and metrics (CPU, memory, disk, API latency, error rate) MUST be available.

---

## 7. Availability

- **Target (MVP):** 99% uptime during business hours; planned maintenance communicated in advance.
- **Critical path:** Database and API must be available for writes; verification may be served from cache if needed (optional).

---

## 8. Compliance & Data Retention

- **Data retention:** Retain data per regulatory requirements (e.g. 5–10 years for pharmaceutical records).
- **Data privacy:** Personal data (e.g. citizen ID) MUST be minimised and compliant with applicable privacy laws. Verification response MUST NOT expose more than necessary for authenticity check.

---

*Read together with the Product Requirements Document and Technical Architecture. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
