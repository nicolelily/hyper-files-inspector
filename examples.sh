#!/usr/bin/env bash
# Usage Examples for Hyper Files Inspector

echo "🔍 Hyper Files Inspector - Usage Examples"
echo "=========================================="
echo ""

echo "1. Interactive mode (recommended for beginners):"
echo "   npm start"
echo "   # or"
echo "   node index.js"
echo ""

echo "2. Discover .hyper files in current directory:"
echo "   node index.js discover"
echo ""

echo "3. Discover .hyper files in specific directory:"
echo "   node index.js discover /path/to/tableau/extracts"
echo ""

echo "4. Inspect a specific .hyper file:"
echo "   node index.js inspect sample-data.hyper"
echo ""

echo "5. Interactive mode in specific directory:"
echo "   node index.js interactive /path/to/tableau/files"
echo ""

echo "6. Help and available commands:"
echo "   node index.js --help"
echo ""

echo "Example workflow:"
echo "=================="
echo "1. Run 'npm start' to enter interactive mode"
echo "2. The tool will automatically discover .hyper files"
echo "3. Select files you want to inspect using checkboxes"
echo "4. View detailed information about tables, schemas, and data"
echo ""

echo "What you'll see:"
echo "================"
echo "• File information (name, size, path)"
echo "• Schema organization"
echo "• Table details (row counts, column types)"
echo "• Sample data from each table"
echo "• Data types and nullable constraints"
echo ""

echo "Try it now with the sample file:"
echo "================================"
echo "node index.js inspect sample-data.hyper"