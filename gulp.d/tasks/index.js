'use strict'

import { readdirSync } from 'fs'
import { dirname, resolve, basename } from 'path'
import { fileURLToPath } from 'url'

const camelCase = (name) => name.replace(/[-]./g, (m) => m.slice(1).toUpperCase())

const __dirname = dirname(fileURLToPath(import.meta.url))

const tasks = {}
const taskFiles = readdirSync(__dirname).filter(f => f !== 'index.js' && f.endsWith('.js'))

for (const file of taskFiles) {
  const name = camelCase(basename(file, '.js'))
  const modulePath = resolve(__dirname, file)
  tasks[name] = await import(modulePath).then(m => m.default)
}

export default tasks
