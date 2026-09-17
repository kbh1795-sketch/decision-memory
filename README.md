# Decision Memory

Decision Memory is an AI-assisted decision tracking application designed to help individuals and teams learn from past decisions.

The application records:

* what was decided,
* why the decision was made,
* what assumptions were made,
* what outcome was expected,
* what actually happened.

AI then compares expectations with actual outcomes and identifies recurring patterns such as estimation errors, repeated failed assumptions, overconfidence, and decision reversals.

The core workflow is:

**Decision → Prediction → Outcome → AI Analysis → Pattern**

---

## Key Features

### Decision Tracking

Record important decisions together with:

* decision context,
* options considered,
* selected option,
* reasoning,
* assumptions,
* expected outcome,
* expected metrics,
* confidence level,
* review date.

### Outcome Review

After the review date, record the actual outcome and compare it with the original prediction.

Examples:

* Expected completion time: 3 days

* Actual completion time: 8 days

* Expected users: 100

* Actual users: 62

### AI Decision Analysis

AI evaluates individual decisions by comparing:

* expected vs actual outcomes,
* correct vs incorrect assumptions,
* predicted vs actual metrics,
* original confidence vs result.

### Decision Pattern Detection

Across multiple historical decisions, the application identifies recurring patterns such as:

* systematic underestimation of project duration,
* repeated overestimation of expected performance,
* frequently incorrect assumptions,
* recurring reasons for changing direction,
* differences between decision categories.

Every generated insight should be linked to the decisions that support it.

---

## Tech Stack

This project is built with Base44 and uses:

* React
* JavaScript / TypeScript
* Base44 Backend
* Base44 Database
* Base44 Authentication
* Base44 AI integrations

Development and source control are connected through GitHub.

---

## Local Development

### Requirements

Install:

* Node.js
* npm
* Base44 CLI
* Deno

Install the Base44 CLI:

```bash
npm install -g base44@latest
```

Deno installation instructions:

https://docs.deno.com/runtime/getting_started/installation/

---

## Setup

Clone the repository:

```bash
git clone <repository-url>
```

Enter the project directory:

```bash
cd <project-directory>
```

Install dependencies:

```bash
npm install
```

Login to Base44:

```bash
base44 login
```

Link the local repository to the Base44 application:

```bash
base44 link
```

Each fresh clone must run `base44 link`.

The command creates:

```text
base44/.app.jsonc
```

which links the local repository to the corresponding Base44 application.

---

## Run Locally

Run:

```bash
base44 dev
```

Base44 will start both:

* the local backend,
* the frontend development server.

Open the URL printed in the terminal.

It is typically:

```text
http://localhost:5173
```

Do not run:

```bash
npm run dev
```

separately.

The Base44 backend proxy will not be available correctly when the frontend is launched independently.

---

## Local Data

When using:

```bash
base44 dev
```

entities, functions, and authentication run locally.

Local entity data is stored in memory and is deleted when the development server restarts.

This is useful for testing Decision Memory without modifying production data.

---

## Use Hosted Backend

To run the local frontend while using the deployed Base44 backend:

```bash
base44 dev --remote
```

Be careful:

**Writes in this mode affect production data.**

Use standard `base44 dev` for normal development and testing.

---

## Git and Base44 Workflow

This repository is connected to the Base44 Builder through Git.

Typical workflow:

```bash
git add .
git commit -m "Update decision analysis feature"
git push
```

Changes pushed to the repository are reflected in the Base44 Builder.

After pushing changes, open the Base44 dashboard:

```bash
base44 dashboard open
```

Publish the application from the dashboard.

Avoid using:

```bash
base44 deploy
```

for this repository because direct CLI deployment can cause the deployed version to diverge from the Git-synchronised Base44 project.

---

## Project Structure

The application concept is organised around several core data objects:

```text
User
Workspace
Decision
Option
Assumption
ExpectedMetric
Outcome
ActualMetric
Insight
```

The most important relationship is:

```text
Decision
   ↓
Expected Outcome
   ↓
Actual Outcome
   ↓
AI Comparison
   ↓
Cross-Decision Pattern Detection
```

---

## Development Priority

The project currently focuses on:

1. Recording decisions
2. Recording expectations and assumptions
3. Reviewing actual outcomes
4. Comparing expected vs actual results
5. AI-generated decision reviews
6. Historical decision analysis
7. Cross-decision pattern detection
8. Evidence-backed personal or team decision profiles

The objective is not to build a generic note-taking application.

Decision Memory is designed to answer:

> **What did we believe when we made the decision, what actually happened, and what can we learn from the difference?**

---

## Base44 Documentation

GitHub integration:

https://docs.base44.com/developers/app-code/local-development/github

Local development:

https://docs.base44.com/developers/backend/overview/local-dev/local-development-overview

Support:

https://app.base44.com/support
