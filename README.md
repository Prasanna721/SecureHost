# SecureHost

Enterprise screenshot security monitoring powered by AI.

## The Problem

Screenshots are the biggest blind spot in company security. While we spend on DLP and access controls, people still screenshot API keys, passwords, and customer data—images that slip past tools, sit unencrypted, and get shared everywhere. Our fix: detect screenshots at capture, auto-redact or block secrets, encrypt locally, and track sharing.

## Solution

SecureHost automatically detects when users take screenshots, analyzes them for sensitive content using AI, and provides security recommendations.

## User Flow

1. **Take a screenshot** anywhere on your system
2. **Automatic detection** - SecureHost monitors Desktop and Downloads folders
3. **AI analysis** - Screenshot analyzed using Pipelex AI workflows
4. **Security classification** - Content rated as CONFIDENTIAL, INTERNAL, RESTRICTED, or PUBLIC
5. **Dashboard review** - View all screenshots with security recommendations
6. **Action decisions** - Keep safe content, delete sensitive material

## Pipelex Structure

```
scan_image.plx
├── extract_image_content (Extract text/images from screenshot)
├── analyze_image_content (AI analysis of extracted content)
└── classify_sensitivity (Security classification & recommendations)
```

**Input**: Screenshot image + Privacy classification rules  
**Output**: Security assessment with rating (0-10), classification, and deletion recommendation

## Quick Start

```bash
# Install dependencies
npm install && cd client && npm install

# Start both servers
npm run dev
```

This runs:
- **API Server** (port 3001) - Database and REST endpoints
- **React App** (port 3000) - Security dashboard

## Architecture

```
File Watcher → Screenshot Detection → AI Analysis → Database → Dashboard
     ↓              ↓                    ↓           ↓         ↓
  chokidar    Cloudinary upload    Pipelex AI    SQLite    React UI
```

**Components**:
- `screenshot-monitor.js` - Detects new screenshots
- `run_pipelex.py` - Executes AI analysis
- `server.js` - API and database
- `client/` - React dashboard

## Features

- **Automatic Detection** - Monitors common screenshot locations
- **AI Classification** - Identifies sensitive content types
- **Risk Assessment** - 0-10 rating scale with deletion recommendations
- **Clean Dashboard** - Modern UI for reviewing results
- **Secure Storage** - Local database with encrypted image hosting

## Configuration

Set your Cloudinary credentials in `src/image-uploader.js` for public image hosting (required for AI analysis).

## Privacy Rules

Configurable classification system:
- **CONFIDENTIAL** (8-10): API keys, passwords, customer data
- **INTERNAL** (5-7): Employee info, internal dashboards  
- **RESTRICTED** (3-4): Source code, system configs
- **PUBLIC** (0-2): Marketing materials, public docs