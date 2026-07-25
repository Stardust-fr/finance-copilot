# AI Financial Copilot --- Master Project Plan

## Objective

Build a production-style AI-powered personal finance application that
demonstrates: - Full-stack engineering - Authentication &
authorization - REST API design - Database modeling - AI integration -
Deployment - CI/CD - Clean architecture

Target audience: Internship / SDE interviews (FinTech)

------------------------------------------------------------------------

# Tech Stack

## Frontend

-   Next.js (App Router)
-   TypeScript
-   Tailwind CSS
-   shadcn/ui
-   React Query
-   React Hook Form
-   Recharts

## Backend

-   Node.js
-   Express
-   PostgreSQL
-   Prisma ORM
-   JWT Authentication
-   Redis (optional)

## AI

-   Gemini API
-   LangGraph (optional v2)
-   OCR later (optional)

## DevOps

-   Docker
-   GitHub Actions
-   Vercel
-   Render/Railway

------------------------------------------------------------------------

# Folder Structure

frontend/ app/ components/ features/ auth/ dashboard/ upload/ ai/
reports/ services/ hooks/ lib/

backend/ src/ controllers/ routes/ middleware/ prisma/ services/ ai/
analytics/ reports/ utils/ jobs/

------------------------------------------------------------------------

# Database Schema

User - id - name - email - passwordHash - createdAt

Account - id - userId - bankName - accountName

Transaction - id - accountId - amount - date - merchant - category -
type (Income/Expense) - aiCategory - confidence

Budget - id - userId - category - monthlyLimit

Report - id - userId - month - pdfUrl

------------------------------------------------------------------------

# Milestone 1 --- Authentication

Features - Register - Login - JWT - Protected routes - Password
hashing - Logout

Deliverable User can create an account and access a protected dashboard.

------------------------------------------------------------------------

# Milestone 2 --- Dashboard

Features - Sidebar - Navbar - Monthly summary - Income - Expenses -
Savings - Recent transactions - Charts

Deliverable Interactive dashboard using dummy data first.

------------------------------------------------------------------------

# Milestone 3 --- CSV Import

Features - Upload bank statement CSV - Parse CSV - Validate columns -
Store in database - Duplicate detection

Expected columns Date Description Amount

Deliverable Imported transactions appear instantly.

------------------------------------------------------------------------

# Milestone 4 --- Analytics

Features - Spending by category - Monthly trend - Largest merchants -
Daily spending - Search & filters

Charts - Pie - Line - Bar

------------------------------------------------------------------------

# Milestone 5 --- AI Categorization

Prompt

"You are a finance assistant. Categorize this transaction into one of:
Food, Travel, Shopping, Bills, Healthcare, Entertainment, Education,
Income, Other.

Return JSON only."

Store - category - confidence

------------------------------------------------------------------------

# Milestone 6 --- AI Chat

System Prompt

"You are an AI financial advisor. Answer ONLY from the user's uploaded
transaction history. If information is unavailable, say so."

Questions

-   Where did I spend the most?
-   How much did I save?
-   Which subscriptions can I cancel?
-   Give me budgeting advice.

------------------------------------------------------------------------

# Milestone 7 --- Budgeting

Features - Monthly budget - Progress bars - Budget exceeded alerts -
Savings goals

------------------------------------------------------------------------

# Milestone 8 --- Fraud Detection

Rules

-   Amount \> user's normal average × 3
-   Same merchant repeated unusually
-   Midnight transactions
-   Duplicate payments

Show risk score.

------------------------------------------------------------------------

# Milestone 9 --- Reports

Generate monthly PDF containing: - Income - Expenses - Charts - Top
categories - AI summary - Savings advice

------------------------------------------------------------------------

# API Endpoints

POST /auth/register POST /auth/login

GET /transactions POST /transactions/upload DELETE /transactions/:id

GET /analytics/summary GET /analytics/categories

POST /ai/categorize POST /ai/chat

POST /budget GET /budget

GET /reports/monthly

------------------------------------------------------------------------

# UI Pages

/ Landing

/login

/register

/dashboard

/upload

/analytics

/budget

/ai-chat

/settings

------------------------------------------------------------------------

# Resume Features

-   JWT Authentication
-   Role-based authorization
-   CSV import
-   AI-powered categorization
-   Natural language financial assistant
-   Interactive analytics
-   Budget management
-   Fraud detection
-   Monthly PDF generation
-   Dockerized deployment
-   CI/CD

------------------------------------------------------------------------

# Nice-to-Have

-   Google OAuth
-   Dark mode
-   Email reports
-   OCR receipt scanning
-   Multi-currency
-   Notifications
-   Unit tests
-   E2E tests

------------------------------------------------------------------------

# Coding Standards

-   TypeScript everywhere possible
-   Service layer architecture
-   Input validation
-   Centralized error handling
-   Environment variables
-   Reusable components
-   Proper commit messages

------------------------------------------------------------------------

# Instructions for GitHub Copilot

You are my senior software engineer.

Rules: 1. Never generate placeholder code unless requested. 2. Prefer
clean architecture. 3. Explain major design decisions. 4. Write reusable
components. 5. Follow SOLID principles. 6. Use TypeScript best
practices. 7. Validate every API input. 8. Handle edge cases. 9. Keep
code production-ready. 10. Suggest improvements after each completed
feature.

Work milestone-by-milestone. Do not jump ahead unless asked.
