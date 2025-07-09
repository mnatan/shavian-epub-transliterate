const { spawn } = require('child_process');
const path = require('path');

let pythonProcess = null;
let isInitialized = false;
let pendingRequests = new Map();
let requestId = 0;

function initializePythonProcess() {
    if (isInitialized) return;
    
    // Check for virtual environment in the project root
    const projectRoot = path.resolve(__dirname, '..');
    const venvPath = path.join(projectRoot, 'venv');
    const venvPythonPath = path.join(venvPath, 'bin', 'python');
    
    // Use venv Python if it exists, otherwise fall back to system Python
    let pythonPath;
    try {
        const fs = require('fs');
        if (fs.existsSync(venvPythonPath)) {
            pythonPath = venvPythonPath;
        } else {
            pythonPath = process.env.VIRTUAL_ENV
                ? path.join(process.env.VIRTUAL_ENV, 'bin', 'python')
                : 'python3';
        }
    } catch (error) {
        pythonPath = process.env.VIRTUAL_ENV
            ? path.join(process.env.VIRTUAL_ENV, 'bin', 'python')
            : 'python3';
    }
    
    const scriptPath = path.join(__dirname, 'latin2shaw.py');
    pythonProcess = spawn(pythonPath, [scriptPath, '--stdin-stdout'], {
        stdio: ['pipe', 'pipe', 'pipe']
    });
    isInitialized = true;
    let buffer = '';
    pythonProcess.stdout.on('data', (data) => {
        buffer += data.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
            // Parse the response format: "ID:RESULT"
            const colonIndex = line.indexOf(':');
            if (colonIndex !== -1) {
                const id = parseInt(line.substring(0, colonIndex));
                const result = line.substring(colonIndex + 1);
                const request = pendingRequests.get(id);
                if (request) {
                    pendingRequests.delete(id);
                    request.resolve(result);
                }
            }
        }
    });
    pythonProcess.stderr.on('data', (data) => {
        // Silence stderr in production
    });
    pythonProcess.on('exit', (code) => {
        isInitialized = false;
        pythonProcess = null;
    });
}

function latin2shaw(text) {
    initializePythonProcess();
    return new Promise((resolve, reject) => {
        const id = requestId++;
        pendingRequests.set(id, { resolve, reject });
        // Send request with ID: "ID:TEXT"
        pythonProcess.stdin.write(`${id}:${text}\n`);
    });
}

function closePythonProcess() {
    if (pythonProcess) {
        try {
            // Clear any pending requests
            for (const { reject } of pendingRequests.values()) {
                reject(new Error('Process terminated'));
            }
            pendingRequests.clear();
            
            // End stdin gracefully
            pythonProcess.stdin.end();
            
            // Kill the process after a short delay
            setTimeout(() => {
                if (pythonProcess && !pythonProcess.killed) {
                    pythonProcess.kill();
                }
            }, 100);
            
            pythonProcess = null;
            isInitialized = false;
        } catch (error) {
            // Ignore errors during cleanup
        }
    }
}

// Handle process termination
process.on('exit', closePythonProcess);
process.on('SIGINT', () => {
    closePythonProcess();
    process.exit(0);
});
process.on('SIGTERM', () => {
    closePythonProcess();
    process.exit(0);
});

module.exports = { latin2shaw, closePythonProcess }; 