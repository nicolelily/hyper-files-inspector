# Hyper Files Inspector 🔍

A JavaScript application to inspect Tableau Hyper files and discover their contents. This tool provides an easy-to-use interface for exploring `.hyper` files when you've forgotten what data they contain.

## Features

- 🌐 **Web Interface**: Modern drag-and-drop web UI for easy file uploads and analysis
- 📁 **File Discovery**: Automatically find all `.hyper` files in a directory and subdirectories
- 🔍 **File Inspection**: Extract detailed metadata, schema information, and sample data
- 📤 **Data Export**: Export complete data from `.hyper` files to JSON/CSV format
- ⬇️ **Download Options**: Direct download of exported data in multiple formats
- 📊 **Rich Display**: Beautiful web interface and terminal output with tables and formatting
- 🖥️ **Interactive Mode**: User-friendly CLI interface for selecting and inspecting files
- 🧹 **Auto Cleanup**: Automatic cleanup of uploaded files for privacy and storage
- ⚡ **Fast**: Leverages Tableau's Hyper API for efficient data access
- 🛠️ **CLI Interface**: Command-line tools for automation and scripting

## Prerequisites

- **Node.js** (v16.0.0 or higher)
- **Python** (3.8 or higher)
- **macOS, Windows, or Linux** (64-bit)

## Installation

1. **Clone or download this project**
   ```bash
   cd hyper-files-inspector
   ```

2. **Install dependencies**
   ```bash
   npm run setup
   ```
   
   This will install both Node.js and Python dependencies including the Tableau Hyper API.

## Usage

### Web UI (Recommended)

The easiest way to use the inspector is through the web interface:

```bash
npm run web
# or
./start-web-ui.sh
```

This starts a local web server at `http://localhost:3000` where you can:
- 📤 **Upload & Auto-Inspect**: Drag & drop .hyper files to automatically view metadata and sample data
- 📊 **Dynamic Analysis**: View detailed table schemas and sample data immediately
- 💾 **Seamless Export**: Export to JSON or CSV and save to disk after inspection
- 🧹 **Privacy**: Automatic cleanup of uploaded files after 1 hour

### Interactive Mode (CLI)

For command-line usage, you can use interactive mode:

```bash
npm start
# or
node index.js
# or
node index.js interactive
```

You can also specify a directory to search:
```bash
node index.js interactive /path/to/your/hyper/files
```

### Command Line Interface

#### Discover Files
Find all `.hyper` files in a directory:
```bash
node index.js discover [directory]
```

Example:
```bash
node index.js discover ./data
node index.js discover /Users/username/Documents/Tableau
```

#### Inspect a Specific File
Get detailed information about a specific `.hyper` file:
```bash
node index.js inspect path/to/file.hyper
```

Example:
```bash
node index.js inspect ./sample-data.hyper
```

#### Export Data to JSON
Extract all data from a `.hyper` file to JSON format:
```bash
node index.js export path/to/file.hyper [options]
```

**Export Options:**
- `--output <file>` or `-o <file>` - Save to JSON file (defaults to stdout)
- `--sample` or `-s` - Export only sample data (first 5 rows per table)
- `--max-rows <number>` or `-m <number>` - Maximum rows to export per table

**Examples:**
```bash
# Export all data to console
node index.js export ./sample-data.hyper

# Export all data to file
node index.js export ./sample-data.hyper --output data.json

# Export only sample data (first 5 rows per table)
node index.js export ./sample-data.hyper --sample --output sample.json

# Export maximum 1000 rows per table
node index.js export ./large-file.hyper --max-rows 1000 --output subset.json
```

### Available Scripts

- `npm run web` - **Start the web UI** (recommended)
- `npm start` - Run in CLI interactive mode
- `npm run inspect` - Alias for inspect command
- `npm run discover` - Alias for discover command
- `npm run export` - Alias for export command
- `npm run setup` - Install all dependencies
- `./start-web-ui.sh` - Start web UI with helpful instructions

## What Information Does It Extract?

### Inspection Mode
When inspecting a `.hyper` file, the tool provides:

### File Information
- File name and path
- File size (human-readable format)
- Total number of tables
- Total number of rows across all tables

### Schema Information
- All schemas in the database
- Schema names and organization

### Table Details
For each table:
- **Name and type** (table, view, etc.)
- **Row count** with formatted numbers
- **Column schema** including:
  - Column names
  - Data types
  - Nullable/required constraints
  - Default values
- **Sample data** (first few rows) with proper formatting

### Export Mode
When exporting a `.hyper` file, the tool generates:

#### JSON Structure
- **File metadata**: name, size, export type, row counts
- **Schema information**: all schemas and their organization
- **Complete table data**: structured JSON with all rows and columns
- **Column definitions**: data types, nullable constraints, default values
- **Flexible output**: sample data only, row limits, or complete export

#### Export Formats
The exported JSON contains a structured format like:
```json
{
  "file_name": "data.hyper",
  "export_type": "full_data",
  "total_tables": 2,
  "total_rows_exported": 1500,
  "tables": [
    {
      "schema": "Extract",
      "name": "Orders",
      "columns": [...],
      "total_rows": 1000,
      "exported_rows": 1000,
      "data": [
        {"order_id": 1, "customer": "John Doe", "amount": 150.00},
        {"order_id": 2, "customer": "Jane Smith", "amount": 250.50},
        ...
      ]
    }
  ]
}
```

## Example Output

```
✓ Successfully inspected: sales-data.hyper

📁 File Information:
   Name: sales-data.hyper
   Size: 2.4 MB
   Path: /Users/username/data/sales-data.hyper
   Total Tables: 3
   Total Rows: 15,847

🗂️  Schemas:
   • Extract
   • public

📊 Tables:

   1. "Extract"."Orders"
      Type: TABLE
      Rows: 9,994
      Columns: 21
      Schema:
        • Row ID: bigint (required)
        • Order ID: text (required)
        • Order Date: date (nullable)
        • Ship Date: date (nullable)
        • Ship Mode: text (nullable)
        • Customer ID: text (required)
        • Customer Name: text (nullable)
        • Segment: text (nullable)
        • Country: text (nullable)
        • City: text (nullable)
        • State: text (nullable)
        • Postal Code: text (nullable)
        • Region: text (nullable)
        • Product ID: text (required)
        • Category: text (nullable)
        • Sub-Category: text (nullable)
        • Product Name: text (nullable)
        • Sales: double precision (nullable)
        • Quantity: bigint (nullable)
        • Discount: double precision (nullable)
        • Profit: double precision (nullable)
      Sample Data:
      ┌────────┬──────────────────┬──────────────┬──────────────┬──────────────────┐
      │ Row ID │ Order ID         │ Order Date   │ Ship Date    │ Ship Mode        │
      ├────────┼──────────────────┼──────────────┼──────────────┼──────────────────┤
      │ 1      │ CA-2016-152156   │ 2016-11-08   │ 2016-11-11   │ Second Class     │
      │ 2      │ CA-2016-152156   │ 2016-11-08   │ 2016-11-11   │ Second Class     │
      │ 3      │ CA-2016-138688   │ 2016-06-12   │ 2016-06-16   │ Second Class     │
      └────────┴──────────────────┴──────────────┴──────────────┴──────────────────┘
```

## Architecture

This application uses a hybrid architecture:

- **JavaScript/Node.js Frontend**: Provides the CLI interface, interactive mode, and beautiful output formatting
- **Python Backend**: Handles the actual Hyper API communication since the Tableau Hyper API is only available for Python, C++, and Java

The communication between frontend and backend happens through JSON over subprocess calls, making it seamless for the end user.

## Error Handling

The application handles various error scenarios gracefully:

- **File not found**: Clear error message with file path
- **Invalid .hyper files**: Validation before processing
- **Corrupted files**: Hyper API error handling
- **Permission issues**: File access error reporting
- **Python/API errors**: Detailed error messages with context

## Troubleshooting

### "tableauhyperapi not found" error
Make sure you've run the setup command:
```bash
npm run setup
```

### Python environment issues
The application uses a virtual environment. If you're having issues, try:
```bash
pip install tableauhyperapi
```

### Permission errors
Make sure you have read access to the `.hyper` files you're trying to inspect.

### Large files taking long time
This is normal for very large `.hyper` files. The tool shows progress indicators while processing.

## Supported Platforms

- macOS 10.13+ (Intel and Apple Silicon)
- Windows 8+ (64-bit)
- Linux (Ubuntu 18.04+, RHEL 8.3+, etc.)

## Contributing

Feel free to submit issues and enhancement requests!

## License

MIT License - feel free to use this tool for your data exploration needs.

## Related Links

- [Tableau Hyper API Documentation](https://tableau.github.io/hyper-db/docs/)
- [Tableau Hyper API Python Guide](https://tableau.github.io/hyper-db/docs/guides/hyper_api_python)
- [Hyper API Samples](https://github.com/tableau/hyper-api-samples)
