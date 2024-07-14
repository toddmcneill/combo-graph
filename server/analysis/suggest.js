const db = require('../db')
const { performance } = require('node:perf_hooks')

async function suggestCards(rootCardId, excludedCardIds = [], cardCount = 70, priceCap = null) {
  const colorIdentity = await db.getColorIdentityOfCard(rootCardId)

  const suggestedCardIds = [rootCardId]
  const suggestedCardSet = new Set(suggestedCardIds)
  let connectedCombos = []
  let areRemainingCards = true

  while (suggestedCardIds.length < cardCount && areRemainingCards) {
    // Find all connected combos from cards so far in the root color identity.
    connectedCombos = await db.getConnectedCombosAndCardsFromCardIds(suggestedCardIds, colorIdentity, excludedCardIds)

    // Filter for incomplete connected combos and combos that use excluded cards.
    const filteredCombos = connectedCombos.filter(combo => {
      const cardIds = combo.uses.map(({ id }) => id)
      const isComplete = cardIds.every(cardId => suggestedCardSet.has(cardId))
      const hasExcludedCards = cardIds.some(cardId => excludedCardIds.includes(cardId))
      return !isComplete && !hasExcludedCards
    })

    // Determine which card is used most in the incomplete connected combos and is under the price cap, if any.
    const cardUsage = filteredCombos
      .flatMap(combo => combo.uses)
      .filter(card => !suggestedCardSet.has(card.id))
      .filter(card => priceCap ? card.price <= priceCap : true)
      .reduce((acc, cur) => {
        if (!(cur.id in acc)) {
          acc[cur.id] = { ...cur, paths: 0 }
        }
        acc[cur.id].paths++
        return acc
      }, {})

    // Add the card that is used in the most combos, using centrality as a tiebreaker.
    const cardOptions = Object.values(cardUsage).sort((a, b) => {
      if (a.paths === b.paths) {
        return a.centrality < b.centrality ? 1 : -1
      }
      return a.paths < b.paths ? 1: -1
    })

    if (!cardOptions.length) {
      areRemainingCards = false
      continue
    }

    suggestedCardIds.push(cardOptions[0].id)
    suggestedCardSet.add(cardOptions[0].id)
  }

  // Load card data, preserving the order cards were selected.
  const cardData = await db.getCards(suggestedCardIds)
  const cards = suggestedCardIds.map(cardId => cardData.find(card => card.id === cardId))

  const combos = connectedCombos.map(combo => {
    const isComplete = combo.uses.every(card => suggestedCardSet.has(card.id))
    return { ...combo, isComplete }
  }).filter(combo => combo.isComplete)

  const features = (await db.getFeaturesForCombos(combos.map(combo => combo.id)))
    .sort((a, b) => a.paths < b.paths ? 1 : -1)

  return {
    cards,
    combos,
    features,
  }
}

module.exports = {
  suggestCards
}
