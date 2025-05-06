const fs = require('fs');
const path = require('path');

// Version
const version = 'v1.3';

// Function to walk through a directory
const walkDir = (dir) => {
    const results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results.push(...walkDir(fullPath));
        } else if (fullPath.endsWith('.js')) {
            results.push(fullPath);
        }
    });
    return results;
};

// Function to extract functions and their descriptions from a file
const extractFunctions = (file) => {
    const content = fs.readFileSync(file, 'utf-8');
    const functionRegex = /(?:async\s+)?function\s+(\w+)\s*\(.*\)\s*{/g;
    const functions = [];
    let match;

    while ((match = functionRegex.exec(content)) !== null) {
        const functionName = match[1];
        const startIdx = match.index;

        // Look backwards for a comment starting with //#
        const beforeFunction = content.substring(0, startIdx);
        const lines = beforeFunction.split('\n').reverse();

        let description = 'No description provided.';
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed === '') continue;
            if (trimmed.startsWith('//#')) {
                description = trimmed;
                break;
            } else if (!trimmed.startsWith('//')) {
                break;
            }
        }

        functions.push({ file, functionName, description });
    }

    return functions;
};

// Function to scan the addon folder for JavaScript files
const scanAddonFolder = (folderPath) => {
    const files = walkDir(folderPath);
    const functions = [];

    files.forEach((file) => {
        const functionDetails = extractFunctions(file);
        functionDetails.forEach(({ file, functionName, description }) => {
            const filename = path.basename(file);
            functions.push(`${filename} - ${functionName}\n${description}\n`);
        });
    });

    return functions;
};

// Function to write the results to a file
const writeToFile = (functions, filePath) => {
    const content = functions.join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');
};

// Main script
const addonPath = __dirname;
const outputFilePath = path.join(addonPath, 'function_list.txt');
console.log(`Version ${version}`);

const functions = scanAddonFolder(addonPath);
writeToFile(functions, outputFilePath);
console.log(`Functions written to ${outputFilePath}`);
