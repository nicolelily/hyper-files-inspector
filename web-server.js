#!/usr/bin/env node

import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// HyperFilesInspector class for web server
class HyperFilesInspector {
    constructor() {
        this.pythonPath = path.join(__dirname, '.venv', 'bin', 'python');
        this.inspectorScript = path.join(__dirname, 'hyper_inspector.py');
    }

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

    async inspectFile(filePath) {
        try {
            const result = await this.executePython(['inspect', filePath]);
            return result.success ? result : null;
        } catch (error) {
            console.error('Error inspecting file:', error.message);
            return null;
        }
    }

    async exportFile(filePath, options = {}) {
        const { sampleOnly = false, maxRows = null } = options;
        
        try {
            const args = ['export', filePath];
            if (sampleOnly) args.push('--sample-only');
            if (maxRows) args.push('--max-rows', maxRows.toString());
            
            const result = await this.executePython(args);
            return result.success ? result : null;
        } catch (error) {
            console.error('Error exporting file:', error.message);
            return null;
        }
    }
}

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
try {
    await fs.mkdir(uploadsDir, { recursive: true });
} catch (error) {
    // Directory already exists
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Keep original filename with timestamp to avoid conflicts
        const timestamp = Date.now();
        const originalName = file.originalname;
        cb(null, `${timestamp}-${originalName}`);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Only accept .hyper files
        if (file.originalname.toLowerCase().endsWith('.hyper')) {
            cb(null, true);
        } else {
            cb(new Error('Only .hyper files are allowed!'), false);
        }
    },
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

const inspector = new HyperFilesInspector();

// Routes

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Upload file endpoint
app.post('/api/upload', upload.single('hyperFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            id: req.file.filename,
            originalName: req.file.originalname,
            size: req.file.size,
            path: req.file.path,
            uploadTime: new Date().toISOString()
        };

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: fileInfo
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});

// Inspect file endpoint
app.post('/api/inspect/:fileId', async (req, res) => {
    try {
        const filePath = path.join(uploadsDir, req.params.fileId);
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'File not found' });
        }

        const result = await inspector.inspectFile(filePath);
        
        if (result) {
            res.json({
                success: true,
                data: result
            });
        } else {
            res.status(500).json({ error: 'Failed to inspect file' });
        }
    } catch (error) {
        console.error('Inspect error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Export file endpoint
app.post('/api/export/:fileId', async (req, res) => {
    try {
        const filePath = path.join(uploadsDir, req.params.fileId);
        const { sampleOnly = false, maxRows = null } = req.body;
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'File not found' });
        }

        const result = await inspector.exportFile(filePath, {
            sampleOnly,
            maxRows
        });
        
        if (result) {
            res.json({
                success: true,
                data: result
            });
        } else {
            res.status(500).json({ error: 'Failed to export file' });
        }
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Download exported data as JSON
app.get('/api/download/:fileId/:format', async (req, res) => {
    try {
        const filePath = path.join(uploadsDir, req.params.fileId);
        const format = req.params.format; // 'json' or 'csv'
        const { sampleOnly = false, maxRows = null } = req.query;
        
        // Check if file exists
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({ error: 'File not found' });
        }

        const result = await inspector.exportFile(filePath, {
            sampleOnly: sampleOnly === 'true',
            maxRows: maxRows ? parseInt(maxRows) : null
        });
        
        if (!result) {
            return res.status(500).json({ error: 'Failed to export file' });
        }

        const originalName = req.params.fileId.split('-').slice(1).join('-').replace('.hyper', '');
        
        if (format === 'json') {
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', `attachment; filename="${originalName}-export.json"`);
            res.send(JSON.stringify(result, null, 2));
        } else if (format === 'csv') {
            // Convert to CSV format
            let csvContent = '';
            
            for (const table of result.tables) {
                if (table.data && table.data.length > 0) {
                    // Headers
                    const headers = Object.keys(table.data[0]);
                    csvContent += headers.join(',') + '\\n';
                    
                    // Data rows
                    for (const row of table.data) {
                        const values = headers.map(header => {
                            const value = row[header];
                            if (value === null || value === undefined) return '';
                            const str = String(value);
                            if (str.includes(',') || str.includes('"') || str.includes('\\n')) {
                                return `"${str.replace(/"/g, '""')}"`;
                            }
                            return str;
                        });
                        csvContent += values.join(',') + '\\n';
                    }
                    csvContent += '\\n'; // Separator between tables
                }
            }
            
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename="${originalName}-export.csv"`);
            res.send(csvContent);
        } else {
            res.status(400).json({ error: 'Invalid format. Use json or csv.' });
        }
    } catch (error) {
        console.error('Download error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Clean up old files (files older than 1 hour)
async function cleanupOldFiles() {
    try {
        const files = await fs.readdir(uploadsDir);
        const now = Date.now();
        const oneHour = 60 * 60 * 1000;
        
        for (const file of files) {
            const filePath = path.join(uploadsDir, file);
            const stats = await fs.stat(filePath);
            
            if (now - stats.mtime.getTime() > oneHour) {
                await fs.unlink(filePath);
                console.log(`Cleaned up old file: ${file}`);
            }
        }
    } catch (error) {
        console.error('Cleanup error:', error);
    }
}

// Run cleanup every 30 minutes
setInterval(cleanupOldFiles, 30 * 60 * 1000);

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'File too large. Maximum size is 500MB.' });
        }
    }
    
    console.error('Unhandled error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
    console.log(`🚀 Hyper Files Inspector Web UI running at http://localhost:${port}`);
    console.log(`📁 Upload directory: ${uploadsDir}`);
    console.log(`🧹 Files are automatically cleaned up after 1 hour`);
});