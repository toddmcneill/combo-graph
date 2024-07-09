const cache = require('../cache')

async function fetchPage(url, shouldWriteCache = true, shouldReadCache = true) {
  if (shouldReadCache) {
    const cached = await cache.read(url)
    if (cached) {
      return JSON.parse(cached)
    }
  }

  try {
    const response = await fetch(url)
    if (!response.ok) {
      console.error('HTTP Error: ', response.status, url)
      return
    }
    const json = await response.json()
    if (shouldWriteCache) {
      cache.write(url, JSON.stringify(json))
    }
    return json
  } catch (err) {
    console.error('Fetch Error: ', err)
  }
}

module.exports = {
  fetchPage
}
