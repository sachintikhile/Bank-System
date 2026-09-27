# Bank-System (ApexBank Core Engine)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![PRD: Approved](https://img.shields.io/badge/PRD-v1.0.0-success)](docs/PRD.md)
[![Architecture: Event--Driven](https://img.shields.io/badge/Architecture-Event--Driven%20%7C%20CQRS-orange)](docs/PRD.md)

An enterprise-grade, cloud-native Core Banking & Digital Financial Services Platform built with modern double-entry bookkeeping, real-time transaction processing, and automated audit compliance.

---

## 📌 Features & Core Modules

* **Immutable Double-Entry Ledger**: Mathematical balance guarantee ($\sum \text{Debits} = \sum \text{Credits}$) with zero direct balance mutation.
* **Customer Information File (CIF) & KYC Engine**: Multi-tiered customer profiles, document verification, and automated watchlist screening.
* **Real-Time Payment Orchestration**: Distributed Saga orchestrator supporting instant payment rails (FedNow, RTP, UPI/IMPS, SEPA) with idempotent transaction guarantees.
* **Lending & Amortization Engine**: Automated reducing-balance EMI calculation, daily interest accrual, and delinquency tracking.
* **Card Issuance & Controls**: Virtual and physical card lifecycle management with dynamic spend rules.
* **Security & Compliance**: Zero-trust architecture, TLS 1.3, AES-256 data-at-rest encryption, and PCI-DSS 4.0 alignment.

---

## 📖 Product Requirements Document (PRD)

The complete specification, architecture diagrams, sequence flows, entity-relationship diagrams, and API contracts can be reviewed in:
👉 **[docs/PRD.md](docs/PRD.md)**

---

## 🏗️ Architecture Overview

```
                                [ API Gateway / Edge Security ]
                                               │
                        ┌──────────────────────┴──────────────────────┐
                        ▼                                             ▼
             [ Identity & CIF Service ]                  [ Transaction Orchestrator ]
                        │                                             │
                        │                                             ▼
                        │                                 [ Double-Entry Ledger ]
                        │                                             │
                        ▼                                             ▼
             [ Event Bus: Apache Kafka ] ◄────────────────── [ PostgreSQL / Distributed SQL ]
                        │
         ┌──────────────┼──────────────┐
         ▼              ▼              ▼
  [ Fraud Detection ] [ Notifications ] [ Immutable Audit Vault ]
```

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v20+ or v22+) or **Python** (3.11+)
* **Docker** & **Docker Compose**
* **Git**

### Installation
```bash
# Clone the repository
git clone https://github.com/sachintikhile/Bank-System.git
cd Bank-System
```

---

## 📂 Project Structure

```text
Bank-System/
├── docs/
│   └── PRD.md                  # Comprehensive Product Requirements Document
├── src/                        # Core service logic & domain modules
│   ├── ledger/                 # Double-entry ledger engine
│   ├── transactions/           # Payment orchestrator & saga workflows
│   ├── customer/               # CIF & KYC management
│   └── cards/                  # Card issuing & spend controls
├── tests/                      # Unit, integration, and ledger reconciliation tests
├── .gitignore
└── README.md
```

---

## 📄 License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
