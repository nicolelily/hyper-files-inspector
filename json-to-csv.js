#!/usr/bin/env node
/**
 * Convert exported Hyper JSON data to CSV format
 */

import { promises as fs } from 'fs';
import path from 'path';

function escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
}

function jsonToCSV(tableData) {
    if (!tableData.data || tableData.data.length === 0) {
        return '';
    }
    
    // Get headers from first row
    const headers = Object.keys(tableData.data[0]);
    
    // Create CSV content
    let csv = headers.map(escapeCSV).join(',') + '\\n';
    
    // Add data rows
    for (const row of tableData.data) {
        const values = headers.map(header => escapeCSV(row[header]));
        csv += values.join(',') + '\\n';
    }
    
    return csv;
}

async function convertToCSV(jsonFile, outputDir = null) {
    try {
        // Read the exported JSON file
        const data = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
        
        const baseDir = outputDir || path.dirname(jsonFile);
        const baseName = path.basename(jsonFile, '.json');
        
        console.log(`🔄 Converting ${data.file_name} to CSV format...`);
        
        for (const table of data.tables) {
            const csvContent = jsonToCSV(table);
            
            if (csvContent) {
                const csvFileName = `${baseName}-${table.schema}-${table.name}.csv`;
                const csvPath = path.join(baseDir, csvFileName);
                
                await fs.writeFile(csvPath, csvContent);
                console.log(`✅ Created: ${csvFileName} (${table.exported_rows.toLocaleString()} rows)`);
            } else {
                console.log(`⚠️  Skipped: ${table.full_name} (no data)`);
            }
        }
        
        console.log(`\\n🎉 Conversion complete! Files saved to: ${baseDir}`);
        
    } catch (error) {
        console.error('❌ Error converting to CSV:', error.message);
    }
}

// Command line usage
const jsonFile = process.argv[2];
const outputDir = process.argv[3];

if (!jsonFile) {
    console.log('Usage: node json-to-csv.js <exported-json-file> [output-directory]');
    console.log('\\nExample:');
    console.log('  node json-to-csv.js spotify-tracks.json');
    console.log('  node json-to-csv.js sample-data-export.json ./csv-output');
    process.exit(1);
}

convertToCSV(jsonFile, outputDir);