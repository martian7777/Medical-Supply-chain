# Web-Medical-Supply-Project

A **web application** project for medical supply chain management: drug registration, licensing, medicine unit tracking (UUID), ownership transfer, and public verification.

---

## About this Git repository

This repository holds the **plan and documentation** for the Medical Supply Web Project. It is organised into **two branches**:

| Branch | Purpose | Main contents |
|--------|---------|----------------|
| **master** | Main branch — technical documents and project overview | [Overview.md](Overview.md), [docs/](docs/) (Executive Summary, PRD, Technical Architecture, Business Logic, Data Model, Wireframes, NFRs, Timeline, Legal/Commercial, Risk & Assumptions). This README. |
| **NDA** | NDA documents | [NDA/](NDA/) folder: NDA template(s) and instructions for use when sharing confidential project information with development companies, clients, or partners. |

- Use **master** for day-to-day work on the project plan and for sharing technical documentation.  
- Use the **NDA** branch when you need to share or work only on Non-Disclosure Agreement materials (e.g. with legal or external parties before sharing full technical docs).

**To switch branches:**  
`git checkout master`  
`git checkout NDA`

---

## What is this project?

The **Medical Supply Web Project** is a web-based platform that allows:

- **Government** to register drug types, issue and revoke licenses, and manage participants.  
- **Manufacturers** to register medicine units (with a unique UUID) and transfer them to pharmacies.  
- **Pharmacies** to receive units and transfer them to citizens.  
- **Citizens** (and the public) to verify a medicine by its UUID and see its status and history.

All content is about the **web project only** (backend, database, REST API, frontend).

---

## Contents (on master branch)

| Item | Description |
|------|--------------|
| **[Overview.md](Overview.md)** | Problem statement, goals, participants, and high-level flow. |
| **[docs/](docs/)** | Technical documentation. Full index: [docs/README.md](docs/README.md). |
| **NDA/** | Present on the **NDA** branch. NDA template(s) and README for use when sharing confidential information. |

---

## Getting started

1. Ensure you are on the branch you need: `git branch` then `git checkout master` or `git checkout NDA`.  
2. On **master**: read [Overview.md](Overview.md), then [docs/README.md](docs/README.md) for the technical document list.  
3. On **NDA**: open [NDA/README.md](NDA/README.md) for NDA folder contents and usage. Have legal counsel review any NDA before use.

---

*Medical Supply Web Project — 02.10.2026*
