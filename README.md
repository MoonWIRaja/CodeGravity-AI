# CodeGravity AI

> 🎮 **AI-Powered IDE in Your Browser** - Pixel Art Theme

```
╔══════════════════════════════════════════════════════════════╗
║  ░▒▓ CODEGRAVITY AI ▓▒░                                      ║
║                                                              ║
║     ██████╗ ██████╗ ██████╗ ███████╗                        ║
║    ██╔════╝██╔═══██╗██╔══██╗██╔════╝                        ║
║    ██║     ██║   ██║██║  ██║█████╗                          ║
║    ██║     ██║   ██║██║  ██║██╔══╝                          ║
║    ╚██████╗╚██████╔╝██████╔╝███████╗                        ║
║     ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝  GRAVITY AI            ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 📋 Table of Contents

1. [Prerequisites](#-prerequisites)
2. [Installation](#-installation)
3. [Environment Setup](#-environment-setup)
4. [Database Setup](#-database-setup)
5. [GitHub OAuth Setup](#-github-oauth-setup)
6. [Running the Application](#-running-the-application)
7. [Project Structure](#-project-structure)
8. [AI Providers Setup](#-ai-providers-setup)

---

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software

| Software | Version | Download |
|----------|---------|----------|
| **Node.js** | v20.0.0+ | [nodejs.org](https://nodejs.org/) |
| **Bun** | v1.0.0+ | [bun.sh](https://bun.sh/) |
| **PostgreSQL** | v15+ | [postgresql.org](https://www.postgresql.org/download/) |
| **Redis** | v7+ | [redis.io](https://redis.io/download/) |
| **Git** | Latest | [git-scm.com](https://git-scm.com/) |

### Installing Prerequisites

#### Windows

```powershell
# Install Node.js (using winget)
winget install OpenJS.NodeJS.LTS

# Install Bun
powershell -c "irm bun.sh/install.ps1 | iex"

# Install PostgreSQL
winget install PostgreSQL.PostgreSQL

# Install Redis (using Memurai for Windows)
winget install Memurai.Memurai
```

#### macOS

```bash
# Install Node.js
brew install node@20

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
brew install postgresql@15

# Install Redis
brew install redis
```

#### Linux (Ubuntu/Debian)

```bash
# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install PostgreSQL
sudo apt-get install postgresql postgresql-contrib

# Install Redis
sudo apt-get install redis-server
```

---

## 🚀 Installation

### Step 1: Clone or Create Project

```bash
# If cloning from repository
git clone https://github.com/your-username/codegravity-ai.git
cd codegravity-ai

# Or if starting fresh
cd "CodeGravity AI"
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root + workspaces)
npm install
```

### Step 3: Install CLI Globally (Optional)

```bash
# Link CLI for global access
npm link
```

---

## ⚙️ Environment Setup

### Step 1: Create Environment Files

#### API Environment (`apps/api/.env`)

```bash
# Create the file
copy apps\api\.env.example apps\api\.env
```

```env
# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/codegravity

# Redis
REDIS_URL=redis://localhost:6379

# GitHub OAuth
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret

# Security
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
ENCRYPTION_KEY=your-32-byte-hex-encryption-key

# Server
PORT=3000
NODE_ENV=development
```

#### Web Environment (`apps/web/.env`)

```bash
# Create the file
copy apps\web\.env.example apps\web\.env
```

```env
# API URL
PUBLIC_API_URL=http://localhost:3000

# GitHub OAuth (for client-side redirect)
PUBLIC_GITHUB_CLIENT_ID=your_github_client_id
```

### Step 2: Generate Secure Keys

```bash
# Generate JWT Secret (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate Encryption Key (Node.js)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## 🗄️ Database Setup

### Step 1: Start PostgreSQL Service

#### Windows
```powershell
# Start PostgreSQL service
net start postgresql-x64-15
```

#### macOS
```bash
brew services start postgresql@15
```

#### Linux
```bash
sudo systemctl start postgresql
```

### Step 2: Create Database

```bash
# Connect to PostgreSQL
psql -U postgres

# In psql shell
CREATE DATABASE codegravity;
CREATE USER codegravity WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE codegravity TO codegravity;
\q
```

### Step 3: Run Database Migrations

```bash
# Push schema to database
npm run db:push

# View database in Drizzle Studio
npm run db:studio
```

---

## 🔐 GitHub OAuth Setup

### Step 1: Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **"OAuth Apps"** → **"New OAuth App"**
3. Fill in the details:

| Field | Development Value |
|-------|-------------------|
| **Application name** | CodeGravity AI (Dev) |
| **Homepage URL** | http://localhost:5173 |
| **Authorization callback URL** | http://localhost:3000/api/auth/github/callback |

4. Click **"Register application"**
5. Copy the **Client ID**
6. Generate and copy the **Client Secret**

### Step 2: Update Environment Variables

```env
# In apps/api/.env
GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# In apps/web/.env
PUBLIC_GITHUB_CLIENT_ID=Iv1.xxxxxxxxxxxx
```

---

## 🖥️ Running the Application

### Development Mode

```bash
# Start both API and Web in development mode
npm run dev

# Or using CLI (if linked globally)
codegravity dev
```

This will start:
- **API Server**: http://localhost:3000
- **Web App**: http://localhost:5173

### Production Mode

```bash
# Build all apps
npm run build

# Start in production mode
npm run start

# Or using CLI
codegravity start
```

### Individual Services

```bash
# Start only API
npm run dev:api

# Start only Web
npm run dev:web
```

### Database Commands

```bash
# Push schema changes to database
npm run db:push
# Or: codegravity db:push

# Open Drizzle Studio (database viewer)
npm run db:studio
# Or: codegravity db:studio
```

---

## 📁 Project Structure

```
codegravity-ai/
├── apps/
│   ├── api/                    # Backend - Bun + Hono
│   │   ├── src/
│   │   │   ├── routes/         # API endpoints
│   │   │   ├── middleware/     # Auth, CORS, rate limit
│   │   │   ├── services/       # Business logic
│   │   │   ├── db/             # Drizzle schema
│   │   │   └── lib/            # Utilities
│   │   ├── drizzle.config.ts
│   │   └── package.json
│   │
│   └── web/                    # Frontend - SvelteKit
│       ├── src/
│       │   ├── routes/         # SvelteKit pages
│       │   ├── lib/
│       │   │   ├── components/ # Svelte components
│       │   │   ├── stores/     # State management
│       │   │   ├── services/   # API clients
│       │   │   └── styles/     # Pixel art CSS
│       │   └── app.html
│       ├── static/             # Fonts, images
│       └── package.json
│
├── bin/
│   └── cli.js                  # CLI tool
├── package.json                # Root workspace config
└── README.md                   # This file
```

---

## 🤖 AI Providers Setup

CodeGravity AI supports multiple AI providers through **BYOK** (Bring Your Own Key).

### Supported Providers

| Provider | Models | Get API Key |
|----------|--------|-------------|
| **OpenAI** | GPT-4, GPT-4 Turbo, GPT-3.5 | [platform.openai.com](https://platform.openai.com/api-keys) |
| **Anthropic** | Claude 3 Opus, Sonnet, Haiku | [console.anthropic.com](https://console.anthropic.com/) |
| **Google Gemini** | Gemini Pro, Gemini Ultra | [aistudio.google.com](https://aistudio.google.com/app/apikey) |
| **DeepSeek** | DeepSeek Coder, Chat | [platform.deepseek.com](https://platform.deepseek.com/) |

### Adding Your API Key

1. Log in to CodeGravity AI
2. Go to **Settings** → **AI Provider**
3. Select your provider
4. Enter your API key
5. Choose your preferred model
6. Click **Save**

> 💡 **Tip**: Your API keys are encrypted with AES-256 before storage. They are never sent to our servers in plain text.

---

## 🆘 Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F
```

#### Database Connection Failed

1. Ensure PostgreSQL service is running
2. Check DATABASE_URL in `.env`
3. Verify database exists: `psql -U postgres -c "\l"`

#### Redis Connection Failed

1. Ensure Redis service is running
2. Check REDIS_URL in `.env`
3. Test connection: `redis-cli ping`

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

Made with 💜 and ☕ by CodeGravity AI Team
