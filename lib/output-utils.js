const fs = require('fs');
const path = require('path');
const { log, colors } = require('./utils');

function generateHtml({ chapters, metadata }) {
    log(`📝 Generating HTML for: ${metadata.title}`, 'cyan');
    return `<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <title>Shavian: ${metadata.title}</title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8"/>
    <style>
        .calibre {
            display: block;
            font-size: 1em;
            padding-left: 0;
            padding-right: 0;
            text-align: justify;
            margin: 0 5pt;
        }
        .calibre1 {
            background-color: white;
            color: black;
            display: block;
            font-size: 2em;
            font-style: normal;
            font-weight: bold;
            line-height: 1.2;
            text-align: center;
            width: 100%;
            margin: 0.67em 0 8px;
        }
        .calibre3 {
            display: block;
            text-align: justify;
            text-indent: 1em;
            margin: 0;
        }
        .calibre4 {
            font-weight: bold;
        }
        .calibre5 {
            display: block;
            text-align: justify;
            text-indent: 1em;
            margin: 0 0 0.5em;
        }
        .calibre6 {
            font-style: italic;
        }
        .original-text {
            display: block;
            text-align: right;
            font-size: 0.8em;
            color: #666666;
            font-style: italic;
            margin-top: -0.5em;
        }
        .legend {
            display: block;
            text-align: left;
            margin: 1em 0;
            padding: 1em;
            border: 1px solid #ccc;
            background-color: #f9f9f9;
            font-size: 0.9em;
        }
        .legend-title {
            font-weight: bold;
            margin-bottom: 0.5em;
        }
        .legend-item {
            margin: 0.25em 0;
        }
    </style>
</head>
<body class="calibre">
    <p class="calibre1"> <b class="calibre4">Shavian: ${metadata.title}</b> </p>
    <p class="calibre5"></p>
    <p class="calibre3"> <i class="calibre6">By ${metadata.creator}</i> </p>
    <p class="calibre5"></p>
    <div class="legend">
        <div class="legend-title">Transliteration Legend:</div>
        <div class="legend-item">• <b>[p]</b> - Phonetically transliterated word (not found in dictionary)</div>
        <div class="legend-item">• <b>[c]</b> - Constructed word using prefixes/suffixes (approximate transliteration)</div>
        <div class="legend-item">• <b>·</b> - Proper noun indicator (names, places, etc.)</div>
    </div>
    <p class="calibre5"></p>
    <!-- Chapter Content -->
    ${chapters.map(chapter => chapter.content).join('\n')}
</body>
</html>`;
}

function convertToEpub(htmlFile, epubFile, coverFile, ebookConvertPath, logFn = log) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        let command = `${ebookConvertPath} "${htmlFile}" "${epubFile}"`;
        command += ` --output-profile kindle --insert-metadata`;
        if (coverFile && fs.existsSync(coverFile)) {
            command += ` --cover "${coverFile}"`;
            logFn(`📷 Using cover: ${path.basename(coverFile)}`, 'cyan');
        }
        logFn(`🔧 Running: ${command}`, 'magenta');
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 127) {
                    logFn('❌ ebook-convert not found! Please install Calibre and ensure ebook-convert is in your PATH, or set EBOOK_CONVERT_PATH.', 'red');
                } else {
                    logFn(`❌ EPUB conversion failed: ${error.message}`, 'red');
                }
                reject(error);
            } else {
                logFn(`✅ EPUB created: ${path.basename(epubFile)}`, 'green');
                resolve();
            }
        });
    });
}

function convertToMobi(epubFile, mobiFile, coverFile, ebookConvertPath, logFn = log) {
    return new Promise((resolve, reject) => {
        const { exec } = require('child_process');
        let command = `${ebookConvertPath} "${epubFile}" "${mobiFile}"`;
        command += ` --mobi-file-type both --output-profile kindle --insert-metadata`;
        if (coverFile && fs.existsSync(coverFile)) {
            command += ` --cover "${coverFile}"`;
            logFn(`📷 Using cover: ${path.basename(coverFile)}`, 'cyan');
        }
        logFn(`🔧 Running: ${command}`, 'magenta');
        exec(command, (error, stdout, stderr) => {
            if (error) {
                if (error.code === 127) {
                    logFn('❌ ebook-convert not found! Please install Calibre and ensure ebook-convert is in your PATH, or set EBOOK_CONVERT_PATH.', 'red');
                } else {
                    logFn(`❌ MOBI conversion failed: ${error.message}`, 'red');
                }
                reject(error);
            } else {
                logFn(`✅ MOBI created: ${path.basename(mobiFile)}`, 'green');
                resolve();
            }
        });
    });
}

module.exports = {
    generateHtml,
    convertToEpub,
    convertToMobi,
}; 