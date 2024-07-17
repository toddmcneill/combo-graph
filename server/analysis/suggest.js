const db = require('../db')
const { performance } = require('node:perf_hooks')

async function suggestCards(
  rootCardId,
  {
    includeCardIds = [],
    excludeCardIds = [],
    cardCount = 20,
    priceCap = null,
    preferCompletion = false
  }
) {
  console.log({ rootCardId, includeCardIds, excludeCardIds, cardCount, priceCap, preferCompletion })

  const colorIdentity = await db.getColorIdentityOfCard(rootCardId)

  const suggestedCardIds = [rootCardId, ...includeCardIds]
  const suggestedCardSet = new Set(suggestedCardIds)
  let connectedCombos = []
  let areRemainingCards = true

  let iter = 0
  while (suggestedCardIds.length < cardCount && areRemainingCards) {
    // Find all connected combos from cards so far in the root color identity.
    connectedCombos = await db.getConnectedCombosAndCardsFromCardIds(suggestedCardIds, colorIdentity, excludeCardIds)
    console.log('iteration: ', iter, 'connectedCombos: ', connectedCombos.length)
    iter++

    // Filter for incomplete connected combos and combos that use excluded cards.
    const filteredCombos = connectedCombos.filter(combo => {
      const cardIds = combo.uses?.map(({ id }) => id) || []
      const isComplete = cardIds.every(cardId => suggestedCardSet.has(cardId))
      const hasExcludedCards = cardIds.some(cardId => excludeCardIds.includes(cardId))
      const isUnderPriceCap = !priceCap || combo.uses.every(card => card.price <= priceCap)
      return !isComplete && !hasExcludedCards && isUnderPriceCap
    })

    // Determine which card is used most in the incomplete connected combos and is under the price cap, if any.
    const cardsWithRankData = filteredCombos
      .flatMap(combo => combo.uses)
      .filter(card => !suggestedCardSet.has(card.id))
      .reduce((acc, cur) => {
        if (!(cur.id in acc)) {
          acc[cur.id] = { ...cur, paths: 0 }
        }
        acc[cur.id].paths++
        return acc
      }, {})

    // Determine which card completes the most combos. Score is (1 / cards left to complete combo).
    filteredCombos.forEach(combo => {
      const unusedCards = combo.uses.filter(card => !suggestedCardSet.has(card.id))
      unusedCards.forEach(unusedCard => {
        if (!(unusedCard.id in cardsWithRankData)) {
          cardsWithRankData[unusedCard.id] = unusedCard
        }
        if (!('completionScore' in cardsWithRankData[unusedCard.id])) {
          cardsWithRankData[unusedCard.id].completionScore = 0
          cardsWithRankData[unusedCard.id].extendedCompletionScore = 0
        }

        cardsWithRankData[unusedCard.id].completionScore += unusedCards.length === 1 ? 1 : 0
        cardsWithRankData[unusedCard.id].extendedCompletionScore += (1 / Math.pow(unusedCards.length, 3))
      })
    })

    // Add the card that is used in the most combos, using centrality as a tiebreaker.
    const cardOptions = Object.values(cardsWithRankData)
      .sort((a, b) => a.centrality < b.centrality ? 1 : -1)
      .sort((a, b) => {
        if (preferCompletion) {
          if (a.completionScore === b.completionScore) {
            if (a.extendedCompletionScore === b.extendedCompletionScore) {
              return 0
            }
            return a.extendedCompletionScore < b.extendedCompletionScore ? 1 : -1
          }
          return a.completionScore < b.completionScore ? 1 : -1
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
  const completeComboIds = connectedCombos.filter(combo => combo.uses?.every(card => suggestedCardSet.has(card.id))).map(combo => combo.id)
  console.log('complete combo ids: ', completeComboIds.length)
  const combos = await db.getCombos(completeComboIds)
  const features = combos.length ? (await db.getFeaturesForCombos(combos.map(combo => combo.id)))
    .sort((a, b) => a.paths < b.paths ? 1 : -1) : []

  return {
    cards,
    combos,
    features,
  }
}

module.exports = {
  suggestCards
}
