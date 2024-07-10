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
  const neighborMap = createNeighborMap(cardsUsedWith)

  let iterations = 0
  let maxIterations = 100
  let threshold = 1e-6
  let maxChange = Infinity
  while (maxChange > threshold && iterations < maxIterations) {
    const max = stepNeighborMap(neighborMap)
    maxChange = normalizeNeighborMap(neighborMap, max)
    iterations++
  }

  const centralityByNodeId = {}
  Object.values(neighborMap).forEach(({ id, centrality }) => {
    centralityByNodeId[id] = centrality
  })
  return centralityByNodeId
}

function createNeighborMap(cardsUsedWith) {
  const neighborMap = {}
  cardsUsedWith.forEach(({ id }) => {
    neighborMap[id] = { id, centrality: 1, neighbors: [] }
  })
  cardsUsedWith.forEach(({id, usedWith}) => {
    usedWith?.forEach(({id: usedWithId}) => {
      neighborMap[id].neighbors.push(neighborMap[usedWithId])
    })
  })
  return neighborMap
}

function stepNeighborMap(neighborMap) {
  // Calculate new centrality values for each node based on the sum of the value of its neighbors.
  let max = 0
  Object.values(neighborMap).forEach(({ id, neighbors }) => {
    const neighborsCentrality = neighbors.reduce((acc, cur) => acc + cur.centrality, 0)
    const dampedNeighborsCentrality = 0.1 + (0.9 * neighborsCentrality)
    max = Math.max(max, dampedNeighborsCentrality)
    neighborMap[id].neighborsCentrality = dampedNeighborsCentrality
  })
  return max
}

function normalizeNeighborMap(neighborMap, max) {
  // Normalize centrality values between 0 and 1.
  let maxChange = 0
  Object.values(neighborMap).forEach(({ id, centrality, neighborsCentrality }) => {
    const newCentrality = neighborsCentrality / max
    maxChange = Math.max(maxChange, Math.abs(newCentrality - centrality))
    neighborMap[id].centrality = newCentrality
  })
  return maxChange
}

module.exports = {
  calculateCentrality,
  createNeighborMap,
  stepNeighborMap,
  normalizeNeighborMap,
}
