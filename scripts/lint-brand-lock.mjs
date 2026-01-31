#!/usr/bin/env node

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');
const srcDir = join(rootDir, 'src');

const BRAND_FILE = 'src/config/brand.ts';
const INDEX_CSS = 'src/index.css';

const BRAND_STRINGS = [
  'MindMosaic',
  'Turning Practice into Mastery',
];

const HEX_COLOR_REGEX = /#[0-9A-Fa-f]{6}\b/g;

const violations = [];

function getAllFiles(dir, files = []) {
  const entries = readdirSync(dir);
  
  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, files);
    } else if (stat.isFile()) {
      files.push(fullPath);
    }
  }
  
  return files;
}

function checkFile(filePath) {
  const relativePath = relative(rootDir, filePath);
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  const isBrandFile = relativePath === BRAND_FILE;
  const isIndexCss = relativePath === INDEX_CSS;
  const isAllowedHexFile = isBrandFile || isIndexCss;
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for brand strings (skip brand.ts)
    if (!isBrandFile) {
      for (const brandString of BRAND_STRINGS) {
        if (line.includes(brandString)) {
          violations.push({
            file: relativePath,
            line: lineNumber,
            message: `Found brand string "${brandString}"`,
          });
        }
      }
    }
    
    // Check for hex colors (skip brand.ts and index.css)
    if (!isAllowedHexFile) {
      const hexMatches = line.match(HEX_COLOR_REGEX);
      if (hexMatches) {
        for (const hex of hexMatches) {
          violations.push({
            file: relativePath,
            line: lineNumber,
            message: `Found hex color "${hex}"`,
          });
        }
      }
    }
  });
}

// Get all files in src/
const files = getAllFiles(srcDir);

// Check each file
for (const file of files) {
  // Only check text files
  if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.css')) {
    checkFile(file);
  }
}

// Report results
if (violations.length > 0) {
  console.error('\n❌ Brand lock violations found:\n');
  
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.message}\n`);
  }
  
  console.error(`Total: ${violations.length} violation(s)\n`);
  process.exit(1);
} else {
  console.log('\n✅ Brand lock check passed.\n');
  process.exit(0);
}
