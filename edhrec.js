const { fetchPage } = require('./api')
const cache = require('./cache')

async function fetchColorComboPage(colorString) {
  const url = `https://json.edhrec.com/pages/combos/${colorString}.json`
  const pageData = await fetchPage(url)
  return pageData.container.json_dict.cardlists
}

async function fetchAllColorCombos() {
  const colorStrings = ['w', 'u', 'b', 'r', 'g', 'colorless', 'wu', 'ub', 'br', 'rg', 'gw', 'wb', 'ur', 'bg', 'rw', 'gu', 'wub', 'ubr', 'brg', 'rgw', 'gwu', 'wbg', 'urw', 'bgu', 'rwb', 'gur', 'wubr', 'ubrg', 'brgw', 'rgwu', 'gwub', 'wubrg']
  const combos = await Promise.all(
    colorStrings.map(colorString => fetchColorComboPage(colorString))
  )
  return combos.flat()
}

function getComboDetailsPageFromPath(path) {
  return `https://json.edhrec.com/pages${path}`
}

async function fetchComboDetailsPage(path) {
  const pageData = await fetchPage(getComboDetailsPageFromPath(path))
  return pageData.combo
}

async function fetchAllComboDetails(paths) {
  const comboDetails = []

  const batchSize = 1
  for (let i = 0; i < paths.length; i += batchSize) {
    if (i % 10 === 0) {
      process.stdout.write(i + '')
    } else {
      process.stdout.write('.')
    }
    const isCached = await cache.exists(getComboDetailsPageFromPath(paths[i]))
    if (!isCached) {
      // If HTTP 403 errors start appearing, the IP address has probably been restricted.
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
    const batchPaths = paths.slice(i, i + batchSize)
    const comboDetails = await Promise.all(batchPaths.map(path => fetchComboDetailsPage(path)))
    comboDetails.push(...comboDetails)
  }

  return comboDetails
}

module.exports = {
  fetchAllColorCombos,
  fetchAllComboDetails
}
