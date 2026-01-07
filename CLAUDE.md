# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Hyper Files Inspector is a JavaScript/Node.js application for inspecting and exporting data from Tableau Hyper files. It features both a web UI and CLI interface, using a hybrid architecture where Node.js handles the frontend/interface while Python handles the Tableau Hyper API interactions.

## Setup and Installation

**Initial Setup:**
```bash
npm run setup
```
This installs Node.js dependencies and creates a Python virtual environment (`.venv`) with the `tableauhyperapi` package.

**Important:** The Python virtual environment must exist at `.venv/bin/python` for the application to work. All Python scripts use this venv path.

## Common Commands

**Web UI (Primary Interface):**
```bash
npm run web          # Start web server on http://localhost:3000
./start-web-ui.sh    # Alternative with instructions
```

**CLI Mode:**
```bash
npm start                                    # Interactive mode
node index.js interactive [directory]        # Interactive with directory
node index.js discover [directory]           # Find all .hyper files
node index.js inspect <file.hyper>           # Inspect specific file
node index.js export <file.hyper> [options]  # Export to JSON
```

**Export Options:**
- `--output <file>` or `-o <file>` - Save to file
- `--sample` or `-s` - Export only first 5 rows per table
- `--max-rows <number>` or `-m <number>` - Limit rows per table

**Utility Scripts:**
```bash
node json-to-csv.js <exported.json> [output-dir]  # Convert JSON export to CSV
node analyze-export.js <exported.json>             # Analyze exported JSON data
```

**Testing:**
```bash
python3 create-sample.py    # Create sample .hyper file for testing
```

## Architecture

### Hybrid Node.js + Python Design

The application uses a two-layer architecture:

1. **Node.js Layer** (`index.js`, `server.js`, `web-server.js`)
   - Handles all user interaction (CLI, web UI)
   - Provides beautiful output formatting with chalk, ora, and table libraries
   - Spawns Python subprocess and communicates via JSON over stdin/stdout
   - Web server uses Express with Multer for file uploads

2. **Python Layer** (`hyper_inspector.py`)
   - Interfaces with Tableau Hyper API (only available in Python/C++/Java)
   - Provides JSON output consumed by Node.js layer
   - Implements three main operations: discover, inspect, export

### Communication Protocol

Node.js spawns Python processes and parses JSON from stdout:
```javascript
const process = spawn(this.pythonPath, [this.inspectorScript, ...args]);
// Reads JSON response from stdout
const result = JSON.parse(stdout);
```

All Python operations return structured JSON with `success` boolean and either `error` or data fields.

### Key Classes

**`HyperFilesInspector` (JavaScript)**
- Constructor sets paths to `.venv/bin/python` and `hyper_inspector.py`
- `executePython(args)` - Spawns Python subprocess, returns parsed JSON
- `discoverFiles(directory)` - Find .hyper files
- `inspectFile(filePath)` - Get metadata and schema
- `exportFile(filePath, options)` - Export to JSON with row limits

**`HyperFileInspector` (Python)**
- Context manager that starts/stops HyperProcess
- `discover_files(directory)` - Recursively find .hyper files
- `inspect_file(file_path)` - Extract metadata, schemas, tables, sample data
- `export_file_data(file_path, include_sample_only, max_rows_per_table)` - Full data export

### Web Server Architecture

Two web server implementations exist:
- `server.js` - Main web server with upload handling, file cleanup (1-hour TTL), download endpoints
- `web-server.js` - Alternative implementation with similar functionality
- Both use `public/index.html` for the UI
- Uploads stored in `./uploads/` directory (auto-created, auto-cleaned)
- Supports both browser download and disk save (to user-specified paths like `~/Desktop`)

### File Organization

```
index.js              # Main CLI entry point with Commander.js
hyper_inspector.py    # Python backend for Hyper API
server.js             # Primary web server
web-server.js         # Alternative web server
public/index.html     # Web UI
json-to-csv.js        # Convert JSON exports to CSV
analyze-export.js     # Analyze JSON exports
create-sample.py      # Generate test .hyper files
```

## Important Implementation Details

### Python Virtual Environment
All code assumes Python is at `.venv/bin/python`. When modifying Python execution:
```javascript
this.pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
```

### Error Handling Pattern
Python scripts return JSON with `success` field:
```json
{"success": false, "error": "Error message"}
{"success": true, "data": {...}}
```

Node.js checks `result.success` before processing data.

### Hyper API Context Manager
Python code uses context managers to ensure HyperProcess cleanup:
```python
with HyperFileInspector() as inspector:
    result = inspector.inspect_file(file_path)
```

### Data Type Mapping
Tableau Hyper types are exposed as strings in JSON (e.g., "bigint", "text", "date", "double precision"). Column definitions include `type`, `nullable`, and `default_value` fields.

### Export Formats
Exports produce structured JSON with:
- File metadata (name, size, type)
- Schema information
- Table definitions (columns with types)
- Row data as array of objects

The web UI allows downloading as JSON or converting to CSV client-side.

## Module System

The project uses ES modules (`"type": "module"` in package.json). All imports use ES6 syntax:
```javascript
import { spawn } from 'child_process';
import path from 'path';
```

For `__dirname` in ES modules:
```javascript
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
```
