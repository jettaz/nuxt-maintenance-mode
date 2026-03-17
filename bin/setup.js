#!/usr/bin/env node

import { createInterface } from 'node:readline'
import { randomBytes } from 'node:crypto'
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join, relative, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { execSync } from 'node:child_process'

const cwd = process.cwd()
const nuxtConfigPath = join(cwd, 'nuxt.config.ts')

if (!existsSync(nuxtConfigPath)) {
  console.error('Error: nuxt.config.ts not found in current directory.')
  process.exit(1)
}

const projectPkgPath = join(cwd, 'package.json')

if (!existsSync(projectPkgPath)) {
  console.error('Error: package.json not found in current directory.')
  process.exit(1)
}

const projectPkg = JSON.parse(readFileSync(projectPkgPath, 'utf8'))
const alreadyInstalled =
  projectPkg.dependencies?.['@jettaz/nuxt-maintenance-mode'] !== undefined ||
  projectPkg.devDependencies?.['@jettaz/nuxt-maintenance-mode'] !== undefined

if (!alreadyInstalled) {
  const packageDir = dirname(dirname(fileURLToPath(import.meta.url)))
  const relPath = relative(cwd, packageDir)
  projectPkg.dependencies = projectPkg.dependencies ?? {}
  projectPkg.dependencies['@jettaz/nuxt-maintenance-mode'] = `file:${relPath}`
  writeFileSync(projectPkgPath, JSON.stringify(projectPkg, null, 2) + '\n')
  console.log('Installing @jettaz/nuxt-maintenance-mode...')
  execSync('npm install', { cwd, stdio: 'inherit' })
  console.log('✓ @jettaz/nuxt-maintenance-mode installed')
} else {
  console.log('✓ @jettaz/nuxt-maintenance-mode already installed')
}

const rl = createInterface({ input: process.stdin, output: process.stdout })

const question = (prompt) => new Promise((resolve) => rl.question(prompt, resolve))

console.log('\n@jettaz/nuxt-maintenance-mode setup\n')

const randomPin = String(Math.floor(1000 + Math.random() * 9000))

const pin = (await question(`Pincode [${randomPin}]: `)).trim() || randomPin
const route = (await question(`Route [/maintenance]: `)).trim() || '/maintenance'
const title = (await question(`Page title [Under Maintenance]: `)).trim() || 'Under Maintenance'
const message = (await question(`Message [Enter the PIN code to gain access.]: `)).trim() || 'Enter the PIN code to gain access.'
const buttonText = (await question(`Button text [Access]: `)).trim() || 'Access'
const errorMessage = (await question(`Error message [Incorrect PIN code.]: `)).trim() || 'Incorrect PIN code.'

rl.close()

const secret = randomBytes(32).toString('base64url')

let nuxtConfig = readFileSync(nuxtConfigPath, 'utf8')

const escape = (str) => str.replace(/'/g, "\\'")

const moduleConfig = `['@jettaz/nuxt-maintenance-mode', {
    route: '${escape(route)}',
    title: '${escape(title)}',
    message: '${escape(message)}',
    buttonText: '${escape(buttonText)}',
    errorMessage: '${escape(errorMessage)}',
  }]`

const modulesMatch = nuxtConfig.match(/modules\s*:\s*\[/)
if (!modulesMatch) {
  console.error('Error: Could not find modules array in nuxt.config.ts.')
  process.exit(1)
}

const insertPos = nuxtConfig.indexOf(modulesMatch[0]) + modulesMatch[0].length

const alreadyHas = nuxtConfig.includes("'@jettaz/nuxt-maintenance-mode'") || nuxtConfig.includes('"@jettaz/nuxt-maintenance-mode"')

if (!alreadyHas) {
  nuxtConfig = nuxtConfig.slice(0, insertPos) + '\n    ' + moduleConfig + ',' + nuxtConfig.slice(insertPos)
}

writeFileSync(nuxtConfigPath, nuxtConfig)

const envPath = join(cwd, '.env')
let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf8') : ''

const setEnvVar = (content, key, value) => {
  const regex = new RegExp(`^${key}=.*$`, 'm')
  if (regex.test(content)) {
    return content.replace(regex, `${key}=${value}`)
  }
  const separator = content.length > 0 && !content.endsWith('\n') ? '\n' : ''
  return content + separator + `${key}=${value}\n`
}

envContent = setEnvVar(envContent, 'NUXT_MAINTENANCE_MODE_PIN', pin)
envContent = setEnvVar(envContent, 'NUXT_MAINTENANCE_MODE_SECRET', secret)

writeFileSync(envPath, envContent)

console.log('\n✓ nuxt.config.ts updated')
console.log('✓ .env updated')
console.log('\nSet these variables on your server:\n')
console.log(`  NUXT_MAINTENANCE_MODE_PIN=${pin}`)
console.log(`  NUXT_MAINTENANCE_MODE_SECRET=${secret}`)
console.log(`  NUXT_PUBLIC_MAINTENANCE_MODE_ENABLED=true`)
console.log()
