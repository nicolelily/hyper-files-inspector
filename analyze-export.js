#!/usr/bin/env node
/**
 * Example: Working with exported Hyper data in JSON format
 * This script demonstrates how to analyze the exported JSON data
 */

import { promises as fs } from 'fs';
import path from 'path';

async function analyzeExportedData(jsonFile) {
    try {
        // Read the exported JSON file
        const data = JSON.parse(await fs.readFile(jsonFile, 'utf8'));
        
        console.log(`📊 Analysis of: ${data.file_name}`);
        console.log(`📁 File size: ${(data.file_size / 1024).toFixed(1)} KB`);
        console.log(`🗂️  Schemas: ${data.schemas.join(', ')}`);
        console.log(`📋 Tables: ${data.total_tables}`);
        console.log(`📈 Total rows: ${data.total_rows_exported.toLocaleString()}`);
        
        // Analyze each table
        data.tables.forEach((table, index) => {
            console.log(`\\n🔍 Table ${index + 1}: ${table.name}`);
            console.log(`   Schema: ${table.schema}`);
            console.log(`   Rows: ${table.exported_rows.toLocaleString()}`);
            console.log(`   Columns: ${table.columns.length}`);
            
            // Show column types
            const columnTypes = {};
            table.columns.forEach(col => {
                columnTypes[col.type] = (columnTypes[col.type] || 0) + 1;
            });
            
            console.log('   Column types:');
            Object.entries(columnTypes).forEach(([type, count]) => {
                console.log(`     • ${type}: ${count} columns`);
            });
            
            // Show sample of first few records
            if (table.data && table.data.length > 0) {
                console.log('   Sample data:');
                const sampleSize = Math.min(3, table.data.length);
                for (let i = 0; i < sampleSize; i++) {
                    const record = table.data[i];
                    const firstFewFields = Object.entries(record).slice(0, 3);
                    const summary = firstFewFields.map(([key, value]) => `${key}: ${value}`).join(', ');
                    console.log(`     ${i + 1}. ${summary}${Object.keys(record).length > 3 ? '...' : ''}`);
                }
            }
        });
        
        // Suggestions for further analysis
        console.log('\\n💡 Possible next steps:');
        console.log('   • Import into a database (PostgreSQL, MongoDB, etc.)');
        console.log('   • Load into pandas/R for statistical analysis');
        console.log('   • Convert to CSV for spreadsheet analysis');
        console.log('   • Use in web applications or APIs');
        console.log('   • Migrate to other data platforms');
        
    } catch (error) {
        console.error('Error analyzing data:', error.message);
    }
}

// Example usage
const jsonFile = process.argv[2];
if (!jsonFile) {
    console.log('Usage: node analyze-export.js <exported-json-file>');
    console.log('\\nExample:');
    console.log('  node analyze-export.js spotify-tracks.json');
    console.log('  node analyze-export.js sample-data-export.json');
    process.exit(1);
}

analyzeExportedData(jsonFile);