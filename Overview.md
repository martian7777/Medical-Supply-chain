# Medical Supply Chain Management — Overview

**Document date:** 02.10.2026  
**Project:** Medical Supply Web Project

---

## 1. Introduction

Medicines move through a supply chain with several participants: manufacturers, wholesalers, and retailers. They are engaged in the production, transportation, and sale of these products. A key participant in these systems is the **regulating authority** responsible for each stage of the movement of batches of products throughout the chain. At the state level, this is often an authorised body such as an Agency for the Control of Turnover of Medicinal Products. Its main tasks are to delegate the rights to manufacture medicines according to state standards and to control the movement of all units of goods ever produced.

For the consumer, there is an additional concern: control of drugs issued only by prescription. Dispensing without a prescription is illegal; however, ensuring the honesty of retailers and guarding against counterfeit medicines is difficult and requires a dedicated approach.

A **web-based information system** for medical supply chain management can address these needs by providing:

- A single place to register drug types and issue or revoke production licenses.
- Tracking of medicine units by unique identifier (UUID) from creation to end consumer.
- Recorded ownership transfers and a verifiable history for each unit.
- A public verification portal so anyone can check that a medicine is genuine and see its provenance.

---

## 2. Goals

- To design and build a **web application** for medical supply chain management.
- To support registration of drug types, issuance and lifecycle of licenses, and tracking of medicine units with a unique code (UUID).
- To enable ownership transfer along the chain (Manufacturer → Pharmacy → Citizen) with full audit history.
- To provide role-based web dashboards for Government, Manufacturer, and Pharmacy, and a public verification page for citizens.
- To ensure the system is auditable, secure, and aligned with regulatory expectations.

---

## 3. Participants in the System

| Participant | Role | Main responsibilities |
|-------------|------|------------------------|
| **Government** | Regulator / Administrator | Register drug types, issue and revoke licenses to manufacturers, register participants (manufacturers, pharmacies), oversee the system. |
| **Manufacturer** | Producer | Register medicine units (with UUID), transfer ownership of units to pharmacies. Can only create units for drug types for which they hold a valid license. |
| **Pharmacy** | Retailer / Dispenser | Receive units from manufacturers, transfer ownership to citizens. Complies with dispensing rules. |
| **Doctor** | Prescriber (Phase 2) | Issue prescriptions to patients (citizens); may be integrated in a later phase. |
| **Citizen** | End consumer | Use the public verification page to check medicine authenticity and provenance by UUID (read-only). |

---

## 4. High-Level Flow

1. **Government** registers a drug type (specification of a medicinal product) and issues a **production license** to a manufacturer for that drug type.
2. **Manufacturer** creates **medicine units** identified by a unique code (UUID), linked to the drug type and expiration date, and can transfer ownership to a pharmacy.
3. **Pharmacy** receives units (ownership transfer from manufacturer) and can transfer ownership to a **citizen** when selling.
4. **Citizen** (or any member of the public) can enter a unit’s UUID in the **verification portal** to see drug type, current owner, status, and transfer history—without logging in.

Each licensed unit of medicine therefore has a single, traceable history in the system, which supports control of official supply chains and helps with audits and disputes.

---

## 5. Strengths and Limitations

**Strengths:**

- Centralised, web-accessible system for drug registration, licensing, and unit tracking.
- Full audit trail of ownership transfers with timestamps.
- Public verification by UUID supports transparency and consumer trust.
- Role-based access keeps data and actions appropriate to each participant.

**Limitations:**

- The system tracks only movement along **official** supply chains known to the regulator. It cannot track counterfeit drugs distributed outside those chains.
- The system will be developed and tested in a controlled environment; real-world performance and adoption depend on deployment and integration.

---

## 6. Relation to This Repository

This overview describes the **Medical Supply Web Project**. The repository contains:

- **Overview** (this document) — Problem, goals, participants, and high-level flow.
- **docs/** — Technical documentation for the MVP: executive summary, PRD, technical architecture, business logic, data model, wireframes, non-functional requirements, timeline, legal/risk notes.

All documentation is focused on a **web application** (backend API, database, frontend). There is no dependency on or reference to distributed ledger technology in this project.

---

*Document date: 02.10.2026 | Medical Supply Web Project*
