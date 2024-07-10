const dgraph = require('./dgraph')

function saveUses(combos) {
  const edges = combos.flatMap(combo => {
    return combo.usesCards.flatMap(cardId => {
      return [
        [combo.id, 'uses', cardId],
        [cardId, 'usedBy', combo.id]
      ]
    })
  })
  return dgraph.createEdges(edges)
}

function saveProduces(combos) {
  const edges = combos.flatMap(combo => {
    return combo.producesFeatures.flatMap(featureId => {
      return [
        [combo.id, 'produces', featureId],
        [featureId, 'producedBy', combo.id]
      ]
    })
  })
  return dgraph.createEdges(edges)
}

function saveUsedWith(combos) {
  const edges = combos.flatMap(combo => {
    const cards = combo.usesCards
    const comboEdges = []
    for (let i = 0; i < cards.length - 1; i++) {
      for (let j = i + 1; j < cards.length; j++) {
        comboEdges.push([cards[i], 'usedWith', cards[j]])
        comboEdges.push([cards[j], 'usedWith', cards[i]])
      }
    }
    return comboEdges
  })
  return dgraph.createEdges(edges)
}

function saveIncludesColorIdentityOf(nodesInIdentityByCommanderId) {
  const edges = Object.entries(nodesInIdentityByCommanderId).flatMap(([ commanderId, nodeIds ]) => {
    return nodeIds.map(nodeId => ([commanderId, 'includesColorIdentityOf', nodeId]))
  })
  return dgraph.createEdges(edges)
}

module.exports = {
  saveUses,
  saveProduces,
  saveUsedWith,
  saveIncludesColorIdentityOf,
}
