const { fetchPage } = require('./api')
const readline = require('node:readline')

async function fetchAll(startingUrl) {
  let nextPage = startingUrl
  const PAGE_SIZE = 100
  let pageCount = 0
  let iterations = 0
  const results = []
  do {
    const pageData = await fetchPage(nextPage)
    pageCount = pageData.count / PAGE_SIZE
    nextPage = pageData.next
    results.push(...pageData.results)

    readline.cursorTo(process.stdout, 0)
    readline.clearLine(process.stdout, 1)
    process.stdout.write(`Download progress: ${((iterations + 1) * 100 / pageCount).toFixed(2)}%`)
    iterations++
  } while (nextPage && iterations <= pageCount)
  readline.cursorTo(process.stdout, 0)
  readline.clearLine(process.stdout, 1)

  return results
}

async function fetchAllCards() {
  const cards = await fetchAll('https://backend.commanderspellbook.com/cards/')

  return cards.filter(card => card.legalities.commander).map(card => ({
    id: `card-${card.oracleId}`,
    name: card.name,
    oracleId: card.oracleId,
    oracleText: card.oracleText,
    colorIdentity: card.identity.split('').sort().join(''),
    price: card.prices.cardkingdom,
  }))
}

async function fetchAllFeatures() {
  const features = await fetchAll('https://backend.commanderspellbook.com/features/')

  return features.map(feature => ({
    id: `feature-${feature.id}`,
    name: feature.name,
    uncountable: feature.uncountable,
  }))
}

async function fetchAllTemplates() {
  const templates = await fetchAll('https://backend.commanderspellbook.com/templates/')

  return templates.map(template => ({
    id: `template-${template.id}`,
    name: template.name,
    scryfallUrl: `https://scryfall.com/search?q=${encodeURIComponent(template.scryfallQuery)}`,
  }))
}

async function fetchAllCombos() {
  const combos = await fetchAll('https://backend.commanderspellbook.com/variants/')

  return combos.map(combo => ({
    id: `combo-${combo.id}`,
    name: combo.uses.map(piece => piece.card.name).join(' : '),
    description: combo.description,
    prerequisites: combo.otherPrerequisites,
    colorIdentity: combo.identity.split('').sort().join(''),
    price: combo.prices.cardkingdom,
    usesCards: combo.uses.map(uses => `card-${uses.card.oracleId}`),
    requiresTemplates: combo.requires.map(requires => `template-${requires.template.id}`),
    producesFeatures: combo.produces.map(produces => `feature-${produces.feature.id}`),
  }))
}

module.exports = {
  fetchAllCards,
  fetchAllFeatures,
  fetchAllTemplates,
  fetchAllCombos,
}
