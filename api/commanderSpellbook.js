const { fetchPage } = require('./api')

async function fetchAll(startingUrl, shouldLog = false) {
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
    iterations++
    if (shouldLog) {
      process.stdout.write(iterations % 10 === 0 ? iterations + '' : '.')
    }
  } while (nextPage && iterations <= pageCount)
  if (shouldLog) {
    console.log('')
  }
  return results
}

async function fetchAllCards() {
  const cards = await fetchAll('https://backend.commanderspellbook.com/cards/')

  return cards.filter(card => card.legalities.commander).map(card => ({
    id: `card-${card.id}`,
    name: card.name,
    oracleId: card.oracleId,
    oracleText: card.oracleText,
    colorIdentity: card.identity,
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

async function fetchAllCombos() {
  const combos = await fetchAll('https://backend.commanderspellbook.com/variants/')

  return combos.map(combo => ({
    id: `combo-${combo.id}`,
    name: combo.uses.map(piece => piece.card.name).join(' : '),
    description: combo.description,
    colorIdentity: combo.identity,
    price: combo.prices.cardkingdom,
    usesCards: combo.uses.map(uses => `card-${uses.card.id}`),
    producesFeatures: combo.produces.map(produces => `feature-${produces.feature.id}`),
  }))
}

module.exports = {
  fetchAllCards,
  fetchAllFeatures,
  fetchAllCombos,
}
