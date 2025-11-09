
# FHIRspective v2: FHIR-Powered Data Quality Assessment Tool

**FHIRspective** is a healthcare data quality assessment platform built on HL7 FHIR standards. It enables data aggregators, payers, providers, and health IT vendors to measure, monitor, and improve the trustworthiness of healthcare data using modern, standards-aligned, and AI-augmented approaches.

## 🎉 What's New in v2

- **Modern Multi-Page UI**: Enhanced dashboard with dedicated pages for assessments, analytics, and settings
- **Databricks Integration**: Sync assessment data to Delta Lake for advanced analytics and ML
- **Historical Trends**: Track quality metrics over time with interactive charts
- **Industry Benchmarks**: Compare your scores against cross-organizational standards
- **Enhanced Navigation**: React Router-based multi-page navigation with improved UX
- **Real-time Sync**: Push assessment results to Databricks for long-term storage and analysis

## 🚀 Why Fhirspective?

Most healthcare data quality tools focus on format and completeness. Fhirspective goes further:

* Aligns with **FHIR R4/R5** and **US Core** profiles
* Supports **TDQM**, **DMBOK**, and **ISO 8000** principles
* Incorporates **AI/ML** models for intelligent anomaly detection
* Enables **role-specific rubrics** and scoring (payer, provider, aggregator)
* Tracks **data quality over time** with historical benchmarking
* Offers **explainable assessments** to support human adjudication

---

## 🔧 Core Features

| Feature                  | Description                                           |
| ------------------------ | ----------------------------------------------------- |
| ✅ FHIR-native Input      | Accepts JSON Bundles from EHRs, APIs, and data lakes  |
| 📊 Quality Rules Engine  | Deterministic, probabilistic, and AI-based checks     |
| 🧠 AI-Augmented Insights | Model-driven detection of anomalies and patterns      |
| 🛠 Rubric Builder        | Customize scoring rubrics based on role or data usage |
| 📈 Historical Trends     | Time-series data quality tracking                     |
| 🧍 Human-in-the-Loop     | Manual review workflows and adjudication              |
| 🔄 API + UI              | Accessible via REST API and interactive web app       |

---

## 🧬 Example Use Cases

* **Payers** validating incoming data from providers or third parties
* **Providers** checking outbound data before submitting to HIEs or payers
* **Aggregators** measuring the quality of their unified datasets
* **Developers** building dashboards or insights based on FHIR data

---

## 🛠 How It Works

1. **Ingest FHIR Bundles** (R4/R5)
2. **Profile against selected Implementation Guides** (e.g., US Core)
3. **Run Quality Checks** (rule engine + AI analysis)
4. **Generate Quality Scorecard + Rubric**
5. **Expose via API or UI**

---

## 📦 Installation & Setup

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (or use in-memory storage for development)
- Databricks workspace (optional, for analytics features)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/FHIRspective.git
   cd FHIRspective
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

   The application will be available at `http://localhost:5000`

5. **Build for production**
   ```bash
   npm run build
   npm start
   ```

### Medplum Demo Server Setup

Want to test FHIRspective quickly with real FHIR data? Use our **Medplum Demo** integration:

1. **Create a free Medplum account** at [app.medplum.com](https://app.medplum.com)

2. **Upload test data** to your Medplum project (supports Synthea data, US Core examples, or your own FHIR resources)

3. **Get your access token**:
   - Log in to Medplum
   - Navigate to Project Settings → Clients
   - Copy your Access Token

4. **Quick Setup in FHIRspective**:
   - Start the app and go to the Connect step
   - Click the **"Medplum Demo"** button
   - Paste your access token
   - Select sample size (100, 500, 1000, or all records)
   - Start your assessment!

For detailed instructions, see [MEDPLUM_SETUP.md](./MEDPLUM_SETUP.md).

### Databricks Integration (Optional)

To enable advanced analytics features:

1. **Create a Databricks workspace** (AWS, Azure, or GCP)

2. **Generate an access token**
   - In Databricks: User Settings → Access Tokens
   - Generate new token and copy it

3. **Configure in FHIRspective**
   - Navigate to Settings page
   - Enter your Databricks workspace URL
   - Paste your access token
   - Optionally provide a cluster ID
   - Test connection and save

4. **Import Databricks notebooks**
   ```bash
   # Upload notebooks from databricks/ directory to your workspace
   # Or use Databricks CLI
   databricks workspace import_dir databricks/ /Users/your-email/fhirspective
   ```

5. **Run initial setup**
   - Open `01_ingest_fhir_assessments.py` in Databricks
   - Run the "Create Delta Lake Tables" section
   - Tables will be created in the `fhirspective` database

See [databricks/README.md](./databricks/README.md) for detailed setup instructions.

### Environment Variables

```env
# Database (optional - uses in-memory storage by default)
DATABASE_URL=postgresql://user:pass@host:5432/fhirspective

# Databricks (optional)
DATABRICKS_WORKSPACE_URL=https://your-workspace.cloud.databricks.com
DATABRICKS_ACCESS_TOKEN=dapi...
DATABRICKS_CLUSTER_ID=0123-456789-abc123

# Application
PORT=5000
NODE_ENV=development
```

---

## 📍 Roadmap

* [ ] Support for FHIR Subscriptions to monitor incoming streams
* [ ] Rule authoring UI
* [ ] Integration with Spark pipelines
* [ ] Slack + JIRA alerts for failed quality checks
* [ ] Plug-in support for external quality benchmarks

---

## 🧠 Philosophy

We believe **Data Quality is a product**, not just a pipeline step.
Fhirspective is built to be:

* **Transparent** — you should know *why* a data issue was flagged
* **Role-aware** — different users need different definitions of “good data”
* **Evolvable** — new rules, profiles, and standards can be easily added
* **Interoperable** — open APIs, FHIR-aligned outputs, and pluggable models

---

## 🤝 Contact & Community

* 📫 Built by [FHIR IQ](https://www.fhiriq.com)
* 🧵 Join the discussion: [FHIR Goats LinkedIn Group](https://www.linkedin.com/groups/12732939/)
* 🐐 Questions, demos, or feedback? Reach out to Eugene Vestel via LinkedIn or email.
