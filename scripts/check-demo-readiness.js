#!/usr/bin/env node

/**
 * Demo Readiness Checker
 * 
 * This script checks if the application is ready for public demos
 * Run: node scripts/check-demo-readiness.js
 */

const fs = require('fs')
const path = require('path')

const checks = {
  passed: [],
  failed: [],
  warnings: [],
}

function check(name, condition, message) {
  if (condition) {
    checks.passed.push(`✅ ${name}: ${message}`)
  } else {
    checks.failed.push(`❌ ${name}: ${message}`)
  }
}

function warn(name, message) {
  checks.warnings.push(`⚠️  ${name}: ${message}`)
}

// Check 1: Error boundaries exist
check(
  'Error Boundaries',
  fs.existsSync(path.join(__dirname, '../app/error.tsx')) &&
    fs.existsSync(path.join(__dirname, '../app/global-error.tsx')),
  'Error boundaries are in place'
)

// Check 2: Not found page exists
check(
  '404 Page',
  fs.existsSync(path.join(__dirname, '../app/not-found.tsx')),
  '404 page exists'
)

// Check 3: Demo config exists
check(
  'Demo Configuration',
  fs.existsSync(path.join(__dirname, '../lib/demo-config.ts')),
  'Demo configuration file exists'
)

// Check 4: Demo readiness docs exist
check(
  'Documentation',
  fs.existsSync(path.join(__dirname, '../docs/DEMO_READINESS.md')),
  'Demo readiness documentation exists'
)

// Check 5: Environment variables file exists (but not committed)
const envLocalExists = fs.existsSync(path.join(__dirname, '../.env.local'))
const gitignore = fs.readFileSync(path.join(__dirname, '../.gitignore'), 'utf8')
const envInGitignore = gitignore.includes('.env.local')

check(
  'Environment Variables',
  envLocalExists && envInGitignore,
  envLocalExists
    ? envInGitignore
      ? '.env.local exists and is in .gitignore'
      : '.env.local exists but is NOT in .gitignore (security risk!)'
    : '.env.local file not found'
)

// Check 6: Migration files exist
const migrationsDir = path.join(__dirname, '../supabase/migrations')
const requiredMigrations = [
  '001_initial_schema.sql',
  '002_seed_demo_data.sql',
  '003_seed_conversations.sql',
  '004_banking_schema.sql',
  '005_banking_demo_data.sql',
  '012_banking_knowledge_base.sql',
]

const existingMigrations = fs.existsSync(migrationsDir)
  ? fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql'))
  : []

requiredMigrations.forEach((migration) => {
  check(
    `Migration: ${migration}`,
    existingMigrations.includes(migration),
    existingMigrations.includes(migration) ? 'Found' : 'Missing'
  )
})

// Check 7: Key API routes exist
const apiRoutes = [
  'app/api/conversations/route.ts',
  'app/api/knowledge/search/route.ts',
  'app/api/automation/inbox/route.ts',
]

apiRoutes.forEach((route) => {
  check(
    `API Route: ${route}`,
    fs.existsSync(path.join(__dirname, '..', route)),
    fs.existsSync(path.join(__dirname, '..', route)) ? 'Exists' : 'Missing'
  )
})

// Check 8: Key pages exist
const pages = [
  'app/(dashboard)/inbox/page.tsx',
  'app/(dashboard)/automation/page.tsx',
  'app/(dashboard)/knowledge/page.tsx',
  'app/(dashboard)/quality/page.tsx',
  'app/login/page.tsx',
]

pages.forEach((page) => {
  check(
    `Page: ${page}`,
    fs.existsSync(path.join(__dirname, '..', page)),
    fs.existsSync(path.join(__dirname, '..', page)) ? 'Exists' : 'Missing'
  )
})

// Warnings
if (!fs.existsSync(path.join(__dirname, '../.env.example'))) {
  warn('Environment Example', '.env.example file not found (optional but recommended)')
}

// Print results
console.log('\n📋 Demo Readiness Check Results\n')
console.log('='.repeat(50))

if (checks.passed.length > 0) {
  console.log('\n✅ Passed Checks:')
  checks.passed.forEach((msg) => console.log(`  ${msg}`))
}

if (checks.warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  checks.warnings.forEach((msg) => console.log(`  ${msg}`))
}

if (checks.failed.length > 0) {
  console.log('\n❌ Failed Checks:')
  checks.failed.forEach((msg) => console.log(`  ${msg}`))
}

console.log('\n' + '='.repeat(50))
console.log(`\nSummary: ${checks.passed.length} passed, ${checks.failed.length} failed, ${checks.warnings.length} warnings\n`)

if (checks.failed.length === 0) {
  console.log('🎉 All critical checks passed! Your app is ready for demos.\n')
  process.exit(0)
} else {
  console.log('⚠️  Some checks failed. Please fix the issues above before deploying.\n')
  process.exit(1)
}

