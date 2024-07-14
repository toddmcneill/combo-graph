const fs = require('node:fs/promises')
const path = require('path')
const { Buffer } = require('node:buffer')
const crypto = require('crypto')

const basePath = path.join(__dirname, '..', '..', 'cache')

async function write(key, value) {
  await fs.mkdir(basePath, { recursive: true })

  const filePath = path.join(basePath, hashKey(key))
  const data = new Uint8Array(Buffer.from(value))
  return fs.writeFile(filePath, data)
}

async function read(key) {
  const keyExists = await exists(key)
  if (!keyExists) {
    return null
  }
  const filePath = path.join(basePath, hashKey(key))
  return fs.readFile(filePath, { encoding: 'utf8' })
}

async function exists(key) {
  const filePath = path.join(basePath, hashKey(key))
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

function hashKey(key) {
  return crypto.createHash('sha1').update(key).digest('hex');
}

module.exports = {
  write,
  read,
  exists
}