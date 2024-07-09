const dgraph = require('../db/dgraph')

async function calculateCentrality() {
  const query = `{
    cardsUsedWith(func: type(Card)) @cascade {
      id: xid
      usedWith {
        id: xid
      }
    }
  }`
  const { cardsUsedWith } = await dgraph.query(query)

  // Set up neighbor map
  const keyedCards = {}
  cardsUsedWith.forEach(({ id }) => {
    keyedCards[id] = { id, centrality: 1, neighbors: [] }
  })

  cardsUsedWith.forEach(({ id, usedWith }) => {
    usedWith.forEach(({ id: usedWithId }) => {
      keyedCards[id].neighbors.push(keyedCards[usedWithId])
    })
  })

  let iterations = 0
  let maxIterations = 100
  let threshold = 1e-6
  let maxChange = Infinity

  while (maxChange > threshold && iterations < maxIterations) {
    // Calculate new values
    let max = 0
    Object.values(keyedCards).forEach(({ id, neighbors }) => {
      const neighborsCentrality = neighbors.reduce((acc, cur) => acc + cur.centrality, 0)
      const dampedNeighborsCentrality = 0.1 + (0.9 * neighborsCentrality)
      max = Math.max(max, dampedNeighborsCentrality)
      keyedCards[id].neighborsCentrality = dampedNeighborsCentrality
    })

    // Normalize values
    maxChange = 0
    Object.values(keyedCards).forEach(({ id, centrality, neighborsCentrality }) => {
      const newCentrality = neighborsCentrality / max
      maxChange = Math.max(maxChange, Math.abs(newCentrality - centrality))
      keyedCards[id].centrality = newCentrality
    })

    iterations++
  }

  const centralityByNodeId = {}
  Object.values(keyedCards).forEach(({ id, centrality }) => {
    centralityByNodeId[id] = centrality
  })
  return centralityByNodeId
}

module.exports = {
  calculateCentrality
}
