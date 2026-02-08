#!/usr/bin/env node

/**
 * MindMosaic - Environment Verification Script
 * 
 * Run this to verify your .env.local file is correct
 * 
 * Usage: node verify-env.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

console.log('🔍 MindMosaic Environment Verification\n');

const rootDir = process.cwd();
const envFiles = ['.env.local', '.env', '_env.local'];

// Check which env files exist
console.log('📁 Checking for environment files...');
let foundFile = null;

for (const file of envFiles) {
  const filePath = join(rootDir, file);
  if (existsSync(filePath)) {
    console.log(`  ✓ Found: ${file}`);
    foundFile = { name: file, path: filePath };
  } else {
    console.log(`  ✗ Not found: ${file}`);
  }
}

if (!foundFile) {
  console.log('\n❌ ERROR: No environment file found!');
  console.log('   Create .env.local with your Supabase credentials\n');
  process.exit(1);
}

if (foundFile.name === '_env.local') {
  console.log('\n⚠️  WARNING: File is named _env.local');
  console.log('   Vite will NOT load this file!');
  console.log('   Rename to .env.local:\n');
  console.log('   mv _env.local .env.local\n');
  process.exit(1);
}

// Read and parse env file
console.log(`\n📖 Reading ${foundFile.name}...`);
const envContent = readFileSync(foundFile.path, 'utf-8');
const lines = envContent.split('\n');

const config = {};
for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  
  const [key, ...valueParts] = trimmed.split('=');
  const value = valueParts.join('=').trim();
  config[key] = value;
}

// Validate required variables
console.log('\n🔑 Validating environment variables...\n');

const checks = [
  {
    key: 'VITE_SUPABASE_URL',
    name: 'Supabase URL',
    validate: (val) => {
      if (!val) return { ok: false, msg: 'Missing' };
      if (!val.startsWith('https://')) return { ok: false, msg: 'Must start with https://' };
      if (!val.includes('.supabase.co')) return { ok: false, msg: 'Must be a Supabase URL' };
      return { ok: true, msg: 'Valid' };
    }
  },
  {
    key: 'VITE_SUPABASE_ANON_KEY',
    name: 'Supabase Anon Key',
    validate: (val) => {
      if (!val) return { ok: false, msg: 'Missing' };
      if (!val.startsWith('eyJ')) return { ok: false, msg: 'Must be a JWT token (starts with eyJ)' };
      if (val.length < 150) return { ok: false, msg: 'Too short (expected ~200 chars)' };
      if (val.length > 250) return { ok: false, msg: 'Too long (expected ~200 chars)' };
      return { ok: true, msg: `Valid (${val.length} chars)` };
    }
  }
];

let allValid = true;

for (const check of checks) {
  const value = config[check.key];
  const result = check.validate(value);
  
  const status = result.ok ? '✓' : '✗';
  const icon = result.ok ? '✅' : '❌';
  
  console.log(`${icon} ${check.name}`);
  console.log(`   ${status} ${result.msg}`);
  
  if (result.ok && value) {
    // Show preview
    if (check.key === 'VITE_SUPABASE_URL') {
      console.log(`   → ${value}`);
    } else {
      console.log(`   → ${value.substring(0, 30)}...`);
    }
  }
  
  console.log('');
  
  if (!result.ok) allValid = false;
}

// Final result
console.log('═'.repeat(50));
if (allValid) {
  console.log('✅ All checks passed!');
  console.log('   Your environment is configured correctly.\n');
  console.log('Next steps:');
  console.log('  1. Restart your dev server: npm run dev');
  console.log('  2. Check browser console for Supabase client logs');
  console.log('  3. Try logging in with test credentials\n');
} else {
  console.log('❌ Configuration errors found!');
  console.log('   Fix the issues above and run this script again.\n');
  console.log('To get your Supabase credentials:');
  console.log('  1. Go to https://app.supabase.com');
  console.log('  2. Select your project');
  console.log('  3. Go to Settings → API');
  console.log('  4. Copy "URL" and "anon public" key\n');
  process.exit(1);
}
