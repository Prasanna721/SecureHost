# Privacy Guardian - Enterprise Screenshot Security Analysis

## User Request

> i am building a enterprise privacy application - when we Screenshots are the hidden backdoor in every organization's security. While companies invest millions in DLP, encryption, and access controls, employees casually screenshot API keys, passwords, and sensitive customer data daily. These images bypass every security tool, sit unencrypted on desktops, and get shared through Slack, email, and tickets without any oversight.
>
> so the app is simple (dont make it compilcated i need just MVP scrappy but modular)
>
> so the app -> when i take a screenshot it should send it to pipelex workflow same as the results/inputs.json format the screenshot image and rules text, and the output from the pipelex workflow should be (stored in local db) shown in react app list every run
> first i want to build it and later i would want add from structured response from pipelex workflow i want queue delete screenshot (after the timelimit it will be deleted automatically from that location if present) first i want want to see the result from the pipelex workflow so that i can modify and make workflow better to give result i want
>
> the rules are in claude.md agents.md .cursor use that,
>
> see i have already created the pipelex file scan_image.plx and the input param is inputs.json (you have to use that, thats it)
>
> for pipelex what you have to do is run the workflow the workflow get the output
>
> flow my rules for pipelex and for everything do whatever is best
>
> and make sure this MVP (i only want what i have mentioned so only implement those things) you can also implement the scafolding for delete cron jobs so later i tell you

## Problem Statement

**The Security Gap:** Screenshots are the hidden backdoor in enterprise security. While organizations invest heavily in:
- Data Loss Prevention (DLP)
- Encryption systems
- Access controls

Employees routinely bypass all these protections by:
- Taking screenshots of sensitive data (API keys, passwords, customer data)
- Storing them unencrypted on local desktops
- Sharing through Slack, email, and ticketing systems
- Creating an invisible security risk

## Current Solution Architecture

### User Flow
```
User Takes Screenshot → File Watcher Detects → Pipelex Analysis → Database Storage → React Dashboard
```

### Implementation Architecture

```
┌─────────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   File Watcher      │    │    Pipelex       │    │   SQLite        │
│   (~/Desktop/       │───▶│    Workflow      │───▶│   Database      │
│    ~/Downloads/)    │    │   scan_image.plx │    │                 │
└─────────────────────┘    └──────────────────┘    └─────────────────┘
                                                           │
┌─────────────────────┐    ┌──────────────────┐           │
│   React             │    │   Express.js     │           │
│   Dashboard         │◀───│   API Server     │◀──────────┘
│   (Frontend)        │    │   (Backend)      │
└─────────────────────┘    └──────────────────┘

┌─────────────────────┐
│   Delete Scheduler  │
│   (Cron Jobs)       │ ← Scaffolding for future
│   [Future]          │
└─────────────────────┘
```

## Technical Implementation

### Core Components

#### 1. Screenshot File Watcher (`src/screenshot-monitor.js`)
- **Purpose**: Monitors user screenshot activity and triggers analysis
- **Watch Directories**: 
  - `~/Desktop/`
  - `~/Downloads/`
- **Smart Detection**: Recognizes screenshot files by patterns:
  - `Screenshot 2024-10-30 at...` (macOS default)
  - `screenshot-...`, `capture-...`, `cleanshot-...`
  - Common screenshot naming conventions
- **Process**:
  1. File watcher detects new screenshot files
  2. Copy screenshot to app's `uploads/` directory
  3. Create database record with status 'pending'
  4. Execute Pipelex workflow with screenshot and rules
  5. Parse workflow results and update database

#### 2. Express API Server (`src/server.js`)
- **Purpose**: RESTful API and data management
- **Database**: SQLite with schema:
  ```sql
  CREATE TABLE scan_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    screenshot_path TEXT NOT NULL,
    image_url TEXT NOT NULL,
    rules_text TEXT NOT NULL,
    classification TEXT,
    sensitivity_rating INTEGER,
    should_be_deleted BOOLEAN,
    deletion_date TEXT,
    reasoning TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME,
    status TEXT DEFAULT 'pending'
  )
  ```
- **Endpoints**:
  - `GET /api/scan-results` - Fetch all results
  - `POST /api/scan-results` - Create/update scan results
  - `DELETE /api/scan-results/:id` - Delete result and file
  - `GET /api/health` - Health check

#### 3. React Dashboard (`client/`)
- **Purpose**: Visual interface for monitoring and management
- **Features**:
  - Real-time display of scan results
  - Auto-refresh every 10 seconds
  - Statistics dashboard (total scans, confidential items, pending, to delete)
  - Color-coded sensitivity classification
  - Screenshot preview with click-to-expand
  - Manual deletion capability
  - Responsive design with modern UI

#### 4. Pipelex Integration
- **Workflow**: Uses existing `results/scan_image.plx`
- **Input Format**: Follows `results/inputs.json` structure:
  ```json
  {
    "image": {
      "concept": "native.Image",
      "content": { "url": "screenshot_url" }
    },
    "rules": {
      "concept": "native.Text", 
      "content": "privacy_rules_text"
    }
  }
  ```
- **Output Processing**: Parses `working_memory_01.json` for structured results
- **Execution**: Shell command with virtual environment activation

#### 5. Delete Scheduler (Scaffolding) (`src/delete-scheduler.js`)
- **Purpose**: Future automated deletion based on policies
- **Implementation**: Cron job framework ready for:
  - Time-based deletion policies
  - Sensitivity-based retention rules
  - Compliance-driven data lifecycle management
- **Functions**:
  - `checkAndDeleteExpiredFiles()` - Main deletion logic
  - `scheduleFileForDeletion()` - Policy-based scheduling
  - `markForImmediateDeletion()` - Manual override
  - `getScheduledDeletions()` - Audit trail

### Data Flow

#### Screenshot Processing Pipeline
1. **User Action**: User takes screenshot using system tools (Cmd+Shift+3/4/5, etc.)
2. **Detection**: File watcher detects new screenshot in monitored directories
3. **Copy**: Screenshot copied to app's `uploads/` directory with UUID filename
4. **Queuing**: Database record created with 'pending' status
5. **Analysis**: Pipelex workflow executed with:
   - Screenshot image URL
   - Privacy classification rules
6. **Results**: Structured output containing:
   - Classification level (Public/Internal/Restricted/Confidential)
   - Sensitivity rating (0-10)
   - Deletion recommendation (boolean)
   - Reasoning explanation
   - Scheduled deletion date
7. **Update**: Database record updated with analysis results
8. **Display**: React dashboard shows real-time results

#### Privacy Rules Engine
Built-in classification rules covering:
- **CONFIDENTIAL (8-10)**: API keys, passwords, personal data, financial data
- **INTERNAL (5-7)**: Employee directories, system dashboards, business reports
- **RESTRICTED (3-4)**: Source code, configurations, processes
- **PUBLIC (0-2)**: Marketing materials, public documentation

### File Structure

```
privacy-guardian/
├── src/
│   ├── server.js              # Express API server
│   ├── screenshot-monitor.js  # File watcher + Pipelex
│   └── delete-scheduler.js    # Deletion policies (scaffolding)
├── client/                    # React frontend app
│   ├── public/
│   ├── src/
│   │   ├── App.js            # Main dashboard component
│   │   ├── App.css           # Component styles
│   │   ├── index.js          # React entry point
│   │   └── index.css         # Global styles
│   └── package.json          # Frontend dependencies
├── results/
│   ├── scan_image.plx        # Existing Pipelex workflow
│   ├── inputs.json           # Workflow input template
│   └── working_memory_01.json # Workflow output (generated)
├── uploads/                   # Screenshot storage directory
├── privacy_guardian.db        # SQLite database
├── package.json              # Main dependencies and scripts
└── README.md                 # Setup and usage instructions
```

### Technology Stack

**Backend:**
- Node.js + Express.js (API server)
- SQLite (lightweight database)
- Chokidar (file watching)
- node-cron (scheduled tasks)

**Frontend:**
- React 18 (modern UI framework)  
- CSS3 (responsive styling)
- Fetch API (HTTP client)

**Integration:**
- Pipelex (AI workflow engine)
- Python virtual environment
- Shell command execution

**Development:**
- Nodemon (hot reload)
- Concurrently (multi-process management)

## Deployment & Operations

### Startup Sequence
1. `npm install` - Install Node.js dependencies
2. `cd client && npm install` - Install React dependencies  
3. `source .venv/bin/activate` - Activate Python environment
4. `pipelex validate results/scan_image.plx` - Verify workflow
5. `npm run dev` - Start API server and React client
6. `npm run screenshot-monitor` - Start file watcher (separate terminal)

### Process Management
- API Server: Port 3001 (Express.js)
- React Client: Port 3000 (Development server)
- Screenshot Monitor: File watcher process
- Database: SQLite file-based storage

### Usage Flow
1. Start all services
2. Take screenshots using normal system tools
3. File watcher automatically detects and processes them
4. View analysis results in React dashboard at http://localhost:3000
5. Monitor sensitivity classifications and deletion recommendations

### Monitoring & Observability
- Health check endpoint: `GET /api/health`
- Console logging for all file detection and processing
- Real-time dashboard updates
- Error handling and recovery

## Future Enhancements (Scaffolded)

### Automated Deletion Policies
- Time-based retention (24h, 7d, 30d)
- Sensitivity-based rules (immediate deletion for high-risk)
- Compliance frameworks (GDPR, HIPAA, SOX)
- Audit logging and reporting

### Advanced Features (Ready for Extension)
- Email/Slack notifications for high-risk screenshots
- Machine learning model refinement based on user feedback
- Integration with enterprise DLP systems
- Multi-user access controls and permissions
- Export capabilities for compliance reporting

## Security Considerations

### Current Implementation
- Local file storage (no cloud exposure)
- SQLite database (no network access)
- HTTP API (development only)
- File watching limited to user directories

### Production Hardening (Future)
- HTTPS encryption
- Authentication and authorization
- Encrypted file storage
- Database encryption at rest
- Network access controls
- Audit logging

This MVP provides a foundation for enterprise screenshot security monitoring that respects user workflow while maintaining comprehensive analysis capabilities.