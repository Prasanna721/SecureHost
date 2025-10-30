# Privacy Guardian

Enterprise privacy application that monitors screenshots and analyzes them for sensitive content using Pipelex workflows.

## Overview

Privacy Guardian captures screenshots and automatically analyzes them using AI to detect:
- API keys, passwords, and tokens
- Personal data (SSN, credit cards)
- Confidential business information
- Internal system data

The application provides a React dashboard to view analysis results and manage screenshot deletion based on sensitivity levels.

## Setup Instructions

### Prerequisites

1. **Python Virtual Environment**: Ensure you have Pipelex installed with an active virtual environment (typically `.venv`)
2. **Node.js**: Version 16 or higher
3. **NPM**: For installing dependencies

### Installation

1. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

2. **Install React client dependencies**:
   ```bash
   cd client
   npm install
   cd ..
   ```

3. **Activate Python virtual environment** (required for Pipelex):
   ```bash
   source .venv/bin/activate  # On macOS/Linux
   # or
   .venv\Scripts\activate  # On Windows
   ```

4. **Validate Pipelex workflow**:
   ```bash
   cd results
   pipelex validate scan_image.plx
   cd ..
   ```

### Running the Application

#### Option 1: Run everything together
```bash
npm run dev
```
This starts both the server and React client.

#### Option 2: Run components separately

1. **Start the API server**:
   ```bash
   npm run server
   ```

2. **Start the React client** (in another terminal):
   ```bash
   npm run client
   ```

3. **Start screenshot monitoring** (in another terminal):
   ```bash
   npm run screenshot-monitor
   ```

### Usage

1. Open your browser to `http://localhost:3000`
2. The application will automatically capture screenshots every 5 seconds
3. Each screenshot is analyzed using the Pipelex workflow
4. View results in the React dashboard with:
   - Sensitivity classification
   - Risk rating (0-10)
   - Deletion recommendations
   - Analysis reasoning

### API Endpoints

- `GET /api/scan-results` - Get all scan results
- `POST /api/scan-results` - Create new scan or update with Pipelex results
- `DELETE /api/scan-results/:id` - Delete scan result and screenshot
- `GET /api/health` - Health check

### File Structure

```
├── src/
│   ├── server.js              # Express API server
│   ├── screenshot-monitor.js  # Screenshot capture and Pipelex integration
│   └── delete-scheduler.js    # Scheduled deletion (scaffolding)
├── client/                    # React frontend
├── results/
│   ├── scan_image.plx        # Pipelex workflow
│   └── inputs.json           # Workflow input format
├── uploads/                   # Screenshot storage
└── privacy_guardian.db        # SQLite database
```

### Configuration

The application uses these default settings:
- Screenshot interval: 5 seconds
- Server port: 3001
- Client port: 3000
- Database: SQLite (`privacy_guardian.db`)

### Pipelex Workflow

The `scan_image.plx` workflow:
1. Extracts text and visual elements from screenshots
2. Analyzes content against privacy rules
3. Classifies sensitivity level
4. Provides risk rating and deletion recommendations

### Future Enhancements

The delete scheduler scaffolding is in place for automatic file deletion based on:
- Time-based policies
- Sensitivity levels
- Compliance requirements

To enable scheduled deletion, integrate `delete-scheduler.js` with your server startup.

### Security Notes

- Screenshots are stored locally in the `uploads/` directory
- Database contains metadata and analysis results
- Implement proper access controls in production
- Consider encrypting stored screenshots

### Troubleshooting

1. **Pipelex commands failing**: Ensure virtual environment is activated
2. **Screenshot capture issues**: Check system permissions for screen capture
3. **React app not connecting**: Verify proxy settings in `client/package.json`
4. **Database errors**: Check write permissions for SQLite database file