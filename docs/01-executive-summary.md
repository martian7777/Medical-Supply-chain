# Medical Supply Web Project — Executive Summary (Non-Technical)

---

**Classification:** Confidential — For Recipients and Authorized Parties Only  
**Project:** Medical Supply Web Project (MSWP)  
**Document Type:** Executive Summary

| Document Control | |
|------------------|---|
| **Version** | 1.0 |
| **Date** | 02.10.2026 |
| **Status** | Issued for Review |
| **Audience** | Business stakeholders, decision-makers, clients, development partners |

*This document is part of the formal project documentation set for the Medical Supply Web Project. It is intended for companies and clients evaluating or participating in the initiative. Distribution beyond authorized recipients requires prior written consent.*

---

## 1. Problem Statement

The pharmaceutical supply chain faces significant challenges:

- **Lack of transparency** — It is difficult for regulators and consumers to know where a medicine came from, who handled it at each stage, and whether it is genuine.
- **Counterfeit and substandard medicines** — Fake or substandard drugs can enter the supply chain and reach patients.
- **Regulatory burden** — Government agencies struggle to oversee production, licensing, and movement of medicines across manufacturers, wholesalers, and retailers in a consistent, auditable way.
- **Prescription control** — Ensuring that prescription-only medicines are dispensed only with a valid prescription is hard to enforce and audit.

A **web-based system** that keeps a single, tamper-resistant-style record for each drug from creation to the end consumer can help. The system records every step and every owner of a medicine unit, creating a verifiable chain of custody.

---

## 2. Target Users

| User | Description | Primary Need |
|------|-------------|--------------|
| **Government** | State regulatory body (e.g. Agency for Control of Medicinal Products) | Register drugs, issue and revoke licenses, oversee the supply chain |
| **Manufacturer** | Licensed pharmaceutical producer | Register medicine units, transfer ownership to pharmacies, demonstrate compliance |
| **Pharmacy** | Retailer / dispenser | Receive units from manufacturers, sell to citizens, comply with dispensing rules |
| **Citizen** | End consumer / patient | Verify that a medicine is genuine and view its provenance (read-only) |

*Doctors and prescription issuance may be included in a later phase. The MVP focuses on the four roles above and a basic public verification capability.*

---

## 3. Core Value Proposition

- **Single source of truth** — Every licensed medicine unit has one unique identity (UUID) and one traceable history in the system.
- **Transparency** — Authorized parties see who created, owned, and transferred each unit; citizens can verify authenticity by entering the unit’s UUID in a public web portal.
- **Regulatory efficiency** — Government registers drugs and licenses once; the system enforces that only licensed manufacturers may create units and that all ownership changes are logged.
- **Auditability** — Every registration, license issuance, and ownership transfer is recorded in the system, simplifying audits and dispute resolution.

---

## 4. MVP Scope (What Will Be Built in the First Release)

**In scope:**

- Drug type registration (Government).
- License issuance and basic lifecycle management (Government → Manufacturer).
- Medicine unit registration with a unique UUID (Manufacturer, only with a valid license).
- Ownership transfer: Manufacturer → Pharmacy, and Pharmacy → Citizen.
- A public verification portal where anyone can enter a UUID and view unit status and history (read-only).
- Web-based dashboards for Government, Manufacturer, and Pharmacy with role-based access control.
- A REST API and database to support the frontend and future integrations.

**Out of scope for MVP (Phase 2 or later):**

- Full prescription workflow (e.g. doctor-issued prescriptions, prescription balance checks at point of sale).
- IoT integration (e.g. sensors, temperature logs).
- ERP or warehouse management system integration.
- Mobile applications.
- Multi-country or multi-regulator support.

---

## 5. High-Level Timeline

| Phase | Duration | Outcome |
|-------|----------|---------|
| **Phase 1** | ~3 weeks | Backend and database setup; core data model and API skeleton |
| **Phase 2** | ~3 weeks | Business logic and REST API (drug types, licenses, units, transfers, verification) |
| **Phase 3** | ~3 weeks | Web frontend (dashboards and verification page) |
| **Phase 4** | ~2 weeks | Testing, security review, deployment |

**Total MVP estimate:** approximately **11 weeks** from kick-off to first deployable release.

---

## 6. Why This Document Matters

- **Alignment** — Development focuses on drug registration, licensing, unit tracking, ownership transfer, and verification—with deferred features clearly excluded.
- **Stakeholder clarity** — Government, manufacturers, pharmacies, and citizens understand their role and what they get in the first release.
- **Scope control** — Clear in/out scope reduces scope creep and supports on-time delivery.

---

*Read together with the Product Requirements Document (PRD) and Technical Architecture. For the full document index, see [README](README.md) in this folder.*

---

*Document date: 02.10.2026 | Medical Supply Web Project | Confidential*
