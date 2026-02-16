#!/usr/bin/env node
// Build script to generate config.js from environment variables
const fs = require('fs');
const path = require('path');

// Get environment variables or use defaults for local dev
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

// Generate config.js
const configContent = `// Auto-generated config file - do not edit
const CONFIG = {
  SUPABASE_URL: '${supabaseUrl}',
  SUPABASE_ANON_KEY: '${supabaseAnonKey}'
};`;

fs.writeFileSync(path.join(__dirname, 'config.js'), configContent);
console.log('✓ config.js generated successfully');
