// ANSI color codes for nicer output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function renderProgressBar(current, total, width = 40) {
    const percent = current / total;
    const filled = Math.round(percent * width);
    const bar = '█'.repeat(filled) + '-'.repeat(width - filled);
    process.stdout.write(`\r[${bar}] ${current}/${total} (${Math.round(percent * 100)}%)`);
    if (current === total) process.stdout.write('\n');
}

module.exports = {
    colors,
    log,
    renderProgressBar
}; 