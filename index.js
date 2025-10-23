#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { glob } from 'glob';
import { table as createTable } from 'table';
import { spawn } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class HyperFilesInspector {
    constructor() {
        this.pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
        this.inspectorScript = path.join(__dirname, 'hyper_inspector.py');
    }

    /**
     * Execute Python script with given arguments
     */
    async executePython(args) {
        return new Promise((resolve, reject) => {
            const process = spawn(this.pythonPath, [this.inspectorScript, ...args]);
            
            let stdout = '';
            let stderr = '';
            
            process.stdout.on('data', (data) => {
                stdout += data.toString();
            });
            
            process.stderr.on('data', (data) => {
                stderr += data.toString();
            });
            
            process.on('close', (code) => {
                if (code === 0) {
                    try {
                        const result = JSON.parse(stdout);
                        resolve(result);
                    } catch (error) {
                        reject(new Error(`Failed to parse JSON output: ${error.message}\\n${stdout}`));
                    }
                } else {
                    reject(new Error(`Python script failed with code ${code}:\\n${stderr}`));
                }
            });
            
            process.on('error', (error) => {
                reject(new Error(`Failed to start Python process: ${error.message}`));
            });
        });
    }

    /**
     * Format file size in human readable format
     */
    formatFileSize(bytes) {
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        if (bytes === 0) return '0 Bytes';
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Format timestamp to readable date
     */
    formatDate(timestamp) {
        return new Date(timestamp * 1000).toLocaleString();
    }

    /**
     * Discover .hyper files in directory
     */
    async discoverFiles(directory) {
        const spinner = ora('Searching for .hyper files...').start();
        
        try {
            const result = await this.executePython(['discover', directory]);
            spinner.stop();
            
            if (!result.success) {
                console.error(chalk.red('Error:'), result.error);
                return null;
            }
            
            return result;
        } catch (error) {
            spinner.stop();
            console.error(chalk.red('Error discovering files:'), error.message);
            return null;
        }
    }

    /**
     * Inspect a single .hyper file
     */
    async inspectFile(filePath) {
        const spinner = ora(`Inspecting ${path.basename(filePath)}...`).start();
        
        try {
            const result = await this.executePython(['inspect', filePath]);
            spinner.stop();
            
            if (!result.success) {
                console.error(chalk.red('Error:'), result.error);
                return null;
            }
            
            return result;
        } catch (error) {
            spinner.stop();
            console.error(chalk.red('Error inspecting file:'), error.message);
            return null;
        }
    }

    /**
     * Export data from a .hyper file to JSON
     */
    async exportFile(filePath, options = {}) {
        const { sampleOnly = false, maxRows = null, outputFile = null } = options;
        const action = sampleOnly ? 'sample data' : (maxRows ? `up to ${maxRows} rows` : 'all data');
        const spinner = ora(`Exporting ${action} from ${path.basename(filePath)}...`).start();
        
        try {
            const args = ['export', filePath];
            if (sampleOnly) args.push('--sample-only');
            if (maxRows) args.push('--max-rows', maxRows.toString());
            // Don't pass output file to Python, we'll handle it in JavaScript
            
            const result = await this.executePython(args);
            spinner.stop();
            
            if (!result.success) {
                console.error(chalk.red('Error:'), result.error);
                return null;
            }
            
            return result;
        } catch (error) {
            spinner.stop();
            console.error(chalk.red('Error exporting file:'), error.message);
            return null;
        }
    }

    /**
     * Display file discovery results
     */
    displayDiscoveryResults(result) {
        console.log(chalk.green(`\\n✓ Found ${result.files_found} .hyper file(s) in ${result.directory}\\n`));
        
        if (result.files_found === 0) {
            console.log(chalk.yellow('No .hyper files found in the specified directory.'));
            return;
        }

        const tableData = [
            [
                chalk.bold('File Name'),
                chalk.bold('Size'),
                chalk.bold('Modified'),
                chalk.bold('Path')
            ]
        ];

        result.files.forEach(file => {
            tableData.push([
                file.name,
                this.formatFileSize(file.size),
                this.formatDate(file.modified),
                file.path
            ]);
        });

        console.log(createTable(tableData, {
            border: {
                topBody: '─',
                topJoin: '┬',
                topLeft: '┌',
                topRight: '┐',
                bottomBody: '─',
                bottomJoin: '┴',
                bottomLeft: '└',
                bottomRight: '┘',
                bodyLeft: '│',
                bodyRight: '│',
                bodyJoin: '│',
                joinBody: '─',
                joinLeft: '├',
                joinRight: '┤',
                joinJoin: '┼'
            }
        }));
    }

    /**
     * Display export results
     */
    displayExportResults(result, outputFile = null) {
        console.log(chalk.green(`\\n✓ Successfully exported data from: ${result.file_name}\\n`));
        
        // Basic export info
        console.log(chalk.bold('📁 Export Information:'));
        console.log(`   Source File: ${result.file_name}`);
        console.log(`   File Size: ${this.formatFileSize(result.file_size)}`);
        console.log(`   Export Type: ${result.export_type === 'sample_only' ? 'Sample Data Only' : 'Full Data Export'}`);
        if (result.max_rows_per_table) {
            console.log(`   Max Rows Per Table: ${result.max_rows_per_table.toLocaleString()}`);
        }
        console.log(`   Total Tables: ${result.total_tables}`);
        console.log(`   Total Rows Exported: ${result.total_rows_exported.toLocaleString()}`);
        
        if (outputFile) {
            console.log(`   Output File: ${outputFile}`);
        }
        
        // Table summary
        if (result.tables.length > 0) {
            console.log(chalk.bold('\\n📊 Exported Tables:'));
            
            const tableData = [
                [
                    chalk.bold('Table'),
                    chalk.bold('Schema'),
                    chalk.bold('Total Rows'),
                    chalk.bold('Exported Rows'),
                    chalk.bold('Columns')
                ]
            ];
            
            result.tables.forEach(table => {
                tableData.push([
                    table.name,
                    table.schema,
                    typeof table.total_rows === 'number' ? table.total_rows.toLocaleString() : table.total_rows,
                    table.exported_rows.toLocaleString(),
                    table.columns.length.toString()
                ]);
            });
            
            console.log(createTable(tableData, {
                border: {
                    topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
                    bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
                    bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
                    joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
                }
            }));
        }
        
        if (!outputFile) {
            console.log(chalk.yellow('\\n💡 Tip: Use --output filename.json to save the exported data to a file'));
        }
    }

    /**
     * Display file inspection results
     */
    displayInspectionResults(result) {
        console.log(chalk.green(`\\n✓ Successfully inspected: ${result.file_name}\\n`));
        
        // Basic file info
        console.log(chalk.bold('📁 File Information:'));
        console.log(`   Name: ${result.file_name}`);
        console.log(`   Size: ${this.formatFileSize(result.file_size)}`);
        console.log(`   Path: ${result.file_path}`);
        console.log(`   Total Tables: ${result.total_tables}`);
        console.log(`   Total Rows: ${result.total_rows.toLocaleString()}`);
        
        // Schemas
        if (result.schemas.length > 0) {
            console.log(chalk.bold('\\n🗂️  Schemas:'));
            result.schemas.forEach(schema => {
                console.log(`   • ${schema}`);
            });
        }
        
        // Tables
        if (result.tables.length > 0) {
            console.log(chalk.bold('\\n📊 Tables:'));
            
            result.tables.forEach((table, index) => {
                console.log(`\\n   ${index + 1}. ${chalk.cyan(table.full_name)}`);
                console.log(`      Type: ${table.type}`);
                console.log(`      Rows: ${typeof table.row_count === 'number' ? table.row_count.toLocaleString() : table.row_count}`);
                console.log(`      Columns: ${table.columns.length}`);
                
                // Column details
                if (table.columns.length > 0) {
                    console.log(`      Schema:`);
                    table.columns.forEach(col => {
                        const nullable = col.nullable ? chalk.gray('(nullable)') : chalk.yellow('(required)');
                        console.log(`        • ${col.name}: ${chalk.green(col.type)} ${nullable}`);
                    });
                }
                
                // Sample data
                if (table.sample_data.length > 0 && Array.isArray(table.sample_data[0])) {
                    console.log(`      Sample Data:`);
                    const sampleTableData = [table.columns.map(col => chalk.bold(col.name))];
                    
                    table.sample_data.slice(0, 3).forEach(row => {
                        const formattedRow = row.map(value => {
                            if (value === null) return chalk.gray('NULL');
                            if (typeof value === 'string' && value.length > 50) {
                                return value.substring(0, 47) + '...';
                            }
                            return String(value);
                        });
                        sampleTableData.push(formattedRow);
                    });
                    
                    console.log(createTable(sampleTableData, {
                        border: {
                            topBody: '─', topJoin: '┬', topLeft: '┌', topRight: '┐',
                            bottomBody: '─', bottomJoin: '┴', bottomLeft: '└', bottomRight: '┘',
                            bodyLeft: '│', bodyRight: '│', bodyJoin: '│',
                            joinBody: '─', joinLeft: '├', joinRight: '┤', joinJoin: '┼'
                        }
                    }));
                }
            });
        }
    }

    /**
     * Interactive mode for selecting files to inspect
     */
    async interactiveMode(directory = '.') {
        console.log(chalk.blue('🔍 Hyper Files Inspector - Interactive Mode\\n'));
        
        // Discover files
        const discovery = await this.discoverFiles(directory);
        if (!discovery || discovery.files_found === 0) {
            return;
        }
        
        this.displayDiscoveryResults(discovery);
        
        // Let user select files to inspect
        const choices = discovery.files.map(file => ({
            name: `${file.name} (${this.formatFileSize(file.size)})`,
            value: file.path
        }));
        
        const { selectedFiles } = await inquirer.prompt([
            {
                type: 'checkbox',
                name: 'selectedFiles',
                message: 'Select files to inspect:',
                choices: choices,
                validate: (input) => input.length > 0 || 'Please select at least one file'
            }
        ]);
        
        // Inspect selected files
        for (const filePath of selectedFiles) {
            const inspection = await this.inspectFile(filePath);
            if (inspection) {
                this.displayInspectionResults(inspection);
                console.log('\\n' + '─'.repeat(80) + '\\n');
            }
        }
    }
}

// CLI Setup
const program = new Command();
const inspector = new HyperFilesInspector();

program
    .name('hyper-files-inspector')
    .description('A JavaScript application to inspect Tableau Hyper files')
    .version('1.0.0');

program
    .command('discover')
    .description('Discover .hyper files in a directory')
    .argument('[directory]', 'Directory to search in', '.')
    .action(async (directory) => {
        const result = await inspector.discoverFiles(directory);
        if (result) {
            inspector.displayDiscoveryResults(result);
        }
    });

program
    .command('inspect')
    .description('Inspect a specific .hyper file')
    .argument('<file>', 'Path to the .hyper file')
    .action(async (file) => {
        const result = await inspector.inspectFile(file);
        if (result) {
            inspector.displayInspectionResults(result);
        }
    });

program
    .command('export')
    .description('Export data from a .hyper file to JSON format')
    .argument('<file>', 'Path to the .hyper file')
    .option('-o, --output <file>', 'Output JSON file (defaults to stdout)')
    .option('-s, --sample', 'Export only sample data (first 5 rows per table)')
    .option('-m, --max-rows <number>', 'Maximum number of rows to export per table', parseInt)
    .action(async (file, options) => {
        const result = await inspector.exportFile(file, {
            sampleOnly: options.sample,
            maxRows: options.maxRows,
            outputFile: options.output
        });
        
        if (result) {
            if (options.output) {
                // Save data to file manually since we got the result
                try {
                    await fs.writeFile(options.output, JSON.stringify(result, null, 2));
                    inspector.displayExportResults(result, options.output);
                } catch (error) {
                    console.error(chalk.red('Error saving file:'), error.message);
                }
            } else {
                // Output to console
                console.log(JSON.stringify(result, null, 2));
            }
        }
    });

program
    .command('interactive')
    .alias('i')
    .description('Interactive mode to discover and inspect files')
    .argument('[directory]', 'Directory to search in', '.')
    .action(async (directory) => {
        await inspector.interactiveMode(directory);
    });

// Default action (interactive mode)
program.action(async () => {
    await inspector.interactiveMode();
});

// Error handling
program.configureHelp({
    sortSubcommands: true,
});

program.parseAsync(process.argv).catch((error) => {
    console.error(chalk.red('Error:'), error.message);
    process.exit(1);
});