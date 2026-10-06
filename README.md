# 💰 AI Financial Copilot

A production-ready, full-stack AI-powered personal finance application designed to showcase modern web development practices and clean architecture. Built for technical interviews and portfolio demonstrations.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-green)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Latest-blue)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9-2D3748)](https://www.prisma.io/)

---

## 🎯 Project Overview

AI Financial Copilot is a comprehensive personal finance management system that demonstrates:

- **Full-stack engineering** with TypeScript
- **Modern React** patterns with Next.js 15 (App Router)
- **RESTful API** design with Express
- **Database modeling** with Prisma ORM
- **AI integration** with Google Gemini API
- **Authentication & authorization** with JWT
- **File processing** (CSV/Excel imports)
- **Data visualization** with interactive charts
- **Clean architecture** and separation of concerns

**Target Audience:** Technical recruiters, hiring managers, and developers evaluating full-stack capabilities for SDE/FinTech roles.

---

## ✨ Key Features

### 🔐 Authentication
- JWT-based authentication
- Secure password hashing with bcrypt
- Protected routes and API endpoints
- Session management

### 📊 Dashboard
- Monthly financial summary (income, expenses, savings)
- Real-time analytics and visualizations
- Recent transactions overview
- Category-based spending breakdown

### 📁 CSV/Excel Import
- Drag-and-drop file upload
- Multi-format support (CSV, XLSX, XLS)
- Automatic debit/credit detection
- Duplicate transaction prevention
- Flexible date format parsing

### 🤖 AI-Powered Features
- **Smart Categorization**: Automatically categorizes transactions using Gemini AI
- **Fallback System**: Keyword-based classification for resilience and cost optimization
- **Bulk Recategorization**: Recategorize selected or all transactions
- **Confidence Scoring**: AI provides confidence levels for manual review
- **Regional Support**: Supports both US and Indian merchants

### 📈 Analytics
- Spending by category (pie charts)
- 6-month income vs. expenses trend (bar charts)
- Top merchants analysis
- Budget tracking and alerts
- Savings rate calculation

### 🗑️ Bulk Operations
- Select multiple transactions with checkboxes
- Bulk delete (selected or all)
- Bulk recategorization with AI
- Transaction management tools

### 🎨 Modern UI/UX
- Dark theme with Tailwind CSS
- Responsive design (mobile-first)
- shadcn/ui component library
- Smooth animations and transitions
- Accessible interface (WCAG compliant)

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Library:** shadcn/ui
- **State Management:** React Query (TanStack Query)
- **Forms:** React Hook Form
- **Charts:** Recharts
- **HTTP Client:** Axios

### Backend
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Validation:** Zod
- **File Upload:** Multer
- **Excel Parsing:** xlsx
- **Testing:** Vitest

### AI & External Services
- **AI Provider:** Google Gemini API
- **Model:** gemini-3.8-flash
- **Fallback:** Mock AI service (keyword-based)

### DevOps & Tools
- **Version Control:** Git
- **Package Manager:** npm workspaces
- **Linting:** ESLint
- **Formatting:** Prettier
- **Database Migrations:** Prisma Migrate
- **Development:** Concurrently, ts-node-dev

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20.x or higher
- PostgreSQL 14 or higher
- npm or yarn package manager
- Google Gemini API key (optional, can use mock service)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd finance-copilot
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

**Backend** (`backend/.env`):
```env
PORT=4000
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/finance_copilot"
JWT_SECRET="your-secure-jwt-secret-change-this"
JWT_EXPIRES_IN="7d"

# AI Configuration
AI_PROVIDER="gemini"  # or "mock" for testing without API costs
GEMINI_API_KEY="your-gemini-api-key"

# Optional: Google OAuth
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:4000/auth/google/callback"
```

**Frontend** (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:4000
```

4. **Set up the database**
```bash
cd backend
npx prisma migrate dev
npx prisma generate
npm run seed  # Optional: Load sample data
```

5. **Start the development servers**

From the root directory:
```bash
npm run dev
```

This starts:
- **Backend:** http://localhost:4000
- **Frontend:** http://localhost:3000

---

## 📁 Project Structure

```
finance-copilot/
├── frontend/                 # Next.js frontend application
│   ├── src/
│   │   ├── app/             # App Router pages
│   │   │   ├── dashboard/   # Dashboard page
│   │   │   ├── upload/      # CSV upload page
│   │   │   ├── analytics/   # Analytics page
│   │   │   ├── ai-chat/     # AI assistant page
│   │   │   ├── budget/      # Budget management
│   │   │   └── auth/        # Login/register
│   │   ├── components/      # React components
│   │   │   ├── dashboard/   # Dashboard-specific
│   │   │   ├── layout/      # Layout components
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── services/        # API service layer
│   │   ├── hooks/           # Custom React hooks
│   │   └── lib/             # Utilities
│   └── package.json
│
├── backend/                  # Express backend API
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # API routes
│   │   ├── services/        # Business logic
│   │   │   ├── ai/          # AI services (Gemini, Mock)
│   │   │   ├── analytics.service.ts
│   │   │   └── transaction.service.ts
│   │   ├── middleware/      # Express middleware
│   │   ├── schemas/         # Zod validation schemas
│   │   ├── utils/           # Helper functions
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   ├── migrations/      # Database migrations
│   │   └── seed.ts          # Seed data
│   └── package.json
│
├── package.json              # Root workspace config
└── README.md
```

---

## 🔑 API Endpoints

### Authentication
- `POST /auth/register` - Create new user account
- `POST /auth/login` - Login and receive JWT token
- `GET /auth/me` - Get current user (protected)

### Transactions
- `GET /transactions` - List transactions (paginated, filterable)
- `POST /transactions/upload` - Upload CSV/Excel file
- `PATCH /transactions/:id/category` - Update transaction category
- `DELETE /transactions/:id` - Delete single transaction
- `POST /transactions/bulk-delete` - Delete multiple/all transactions
- `POST /transactions/bulk-recategorize` - Recategorize with AI

### Analytics
- `GET /analytics/summary` - Get financial summary and charts

### AI
- `POST /ai/categorize` - Categorize single transaction
- `POST /ai/chat` - Chat with AI financial advisor

---

## 🗄️ Database Schema

### User
- Authentication and profile information
- One-to-many with Accounts

### Account
- Bank account information
- Links users to their transactions

### Transaction
- Individual financial transactions
- Supports both manual and AI categories
- Includes fraud detection (risk score, flagged status)
- Duplicate detection via hash

### Budget
- Monthly spending limits by category
- One budget per category per user

### Report
- Monthly PDF reports (planned feature)

---

## 🤖 AI Integration

### Architecture
The application uses a **strategy pattern** for AI services, allowing easy switching between providers:

```typescript
interface AIService {
  categorizeTransaction(tx: TransactionContext): Promise<CategorizationResult>;
  chat(userMessage: string, context: string): Promise<string>;
}
```

### Providers

**1. Gemini AI Service** (`AI_PROVIDER=gemini`)
- Uses Google's Gemini 3.8-flash model
- High accuracy for complex transactions
- Automatic fallback on rate limits or errors
- Requires API key

**2. Mock AI Service** (`AI_PROVIDER=mock`)
- Keyword-based classification
- Zero API costs
- Instant responses
- Supports US and Indian merchants
- Perfect for development and testing

### Fallback Strategy
```
Gemini API → (on failure) → Mock Service → (always succeeds)
```

This ensures:
- ✅ System never fails completely
- ✅ Cost optimization (no runaway API bills)
- ✅ Performance (local classification is faster)
- ✅ Testability (work without consuming quota)

---

## 🧪 Testing

### Run Backend Tests
```bash
cd backend
npm run test           # Run all tests
npm run test:watch     # Watch mode
npm run test:coverage  # Generate coverage report
```

### Run Frontend Tests
```bash
cd frontend
npm run test
```

### Test Categories
- Unit tests (services, utilities)
- Integration tests (API endpoints)
- E2E tests (planned)

---

## 🎨 UI Features

### Responsive Design
- Mobile-first approach
- Breakpoints for tablet and desktop
- Touch-friendly interactions

### Accessibility
- Semantic HTML
- ARIA labels
- Keyboard navigation
- Screen reader support
- Color contrast compliance (WCAG AA)

### Dark Theme
- Consistent color palette
- High contrast for readability
- Modern glassmorphism effects

---

## 📊 Sample CSV Format

The application supports flexible CSV/Excel formats. Common formats:

**Format 1: Debit/Credit columns**
```csv
Date,Description,Debit,Credit
2024-01-15,Swiggy Food Delivery,697.69,
2024-01-16,Salary Deposit,,50000
```

**Format 2: Single Amount column**
```csv
Date,Merchant,Amount,Type
2024-01-15,Swiggy Ltd,-697.69,Expense
2024-01-16,ABC Corp,50000,Income
```

**Supported date formats:**
- `YYYY-MM-DD` (2024-01-15)
- `DD/MM/YYYY` (15/01/2024)
- `DD MMM YYYY` (15 Jan 2024)

---

## 🚧 Roadmap / Future Enhancements

### Planned Features
- [ ] Monthly PDF report generation
- [ ] Email notifications for budget alerts
- [ ] Multi-currency support
- [ ] OCR for receipt scanning
- [ ] Mobile app (React Native)
- [ ] Plaid API integration for automatic bank sync
- [ ] Recurring transaction detection
- [ ] Budget recommendations
- [ ] Investment tracking
- [ ] Bill reminders
- [ ] Export to Excel/PDF

### Technical Improvements
- [ ] Redis caching layer
- [ ] Rate limiting middleware
- [ ] Comprehensive E2E tests
- [ ] Docker containerization
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] API documentation (Swagger/OpenAPI)
- [ ] Performance monitoring
- [ ] Error tracking (Sentry)

---

## 🔒 Security Features

- ✅ Password hashing with bcrypt
- ✅ JWT token authentication
- ✅ Protected API routes
- ✅ SQL injection prevention (Prisma)
- ✅ XSS protection
- ✅ CORS configuration
- ✅ Input validation (Zod)
- ✅ Environment variable management
- ⚠️ Rate limiting (planned)
- ⚠️ HTTPS enforcement (production)

---

## 🎓 Learning Outcomes

This project demonstrates:

### Architecture & Design
- Clean architecture principles
- Service layer pattern
- Repository pattern (via Prisma)
- Strategy pattern (AI services)
- Dependency injection

### Backend Skills
- RESTful API design
- Authentication & authorization
- Database modeling and migrations
- File upload and processing
- Error handling and validation
- Testing strategies

### Frontend Skills
- Modern React patterns (hooks, context)
- Server/client component separation
- State management with React Query
- Form handling and validation
- Data visualization
- Responsive design

### DevOps & Tools
- Monorepo management (npm workspaces)
- Environment configuration
- Database migrations
- Script automation
- Git workflow

---

## 📝 License

This project is open source and available for portfolio and educational purposes.

---

## 👨‍💻 Author

**Your Name**  
[Portfolio](https://your-portfolio.com) • [LinkedIn](https://linkedin.com/in/yourprofile) • [GitHub](https://github.com/yourusername)

---

## 🙏 Acknowledgments

- Google Gemini for AI capabilities
- shadcn/ui for beautiful components
- Prisma team for excellent ORM
- Next.js team for the amazing framework

---

## 📧 Contact

For questions, suggestions, or collaboration opportunities:
- Email: your.email@example.com
- LinkedIn: [Your Profile](https://linkedin.com/in/yourprofile)

---

**Built with ❤️ for technical interviews and portfolio demonstrations**
