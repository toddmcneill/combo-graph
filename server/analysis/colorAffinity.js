const dgraph = require('../db/dgraph')
const { createNeighborMap, stepNeighborMap, normalizeNeighborMap } = require('./centrality')

const allColors = 'WUBRGC'
function getAllColorCombinations(str = allColors) {
  let permutations = new Set([str.split('').sort().join('')])
  if (str.length === 1) {
    return Array.from(permutations).sort()
  }
  for (let i = 0; i < str.length; i++) {
    let smallerStr = str.slice(0, i) + str.slice(i + 1)
    let smallerPermutations = getAllColorCombinations(smallerStr)
    for (let permutation of smallerPermutations) {
      permutations.add(permutation.split('').sort().join(''))
    }
  }
  return Array.from(permutations).sort()
}

const colorValues = {}
for (let i = 0; i < allColors.length; i++) {
  colorValues[allColors[i]] = Math.pow(2, i)
}
function convertColorsToInt(colors) {
  return colors.split('').reduce((acc, cur) => acc + (colorValues[cur] || 0), 0)
}

const colorlessValue = convertColorsToInt('C')
function areColorsPartOfIdentity(colors, identity) {
  const colorValue = convertColorsToInt(colors)
  const identityValue = convertColorsToInt(identity)
  const identityValueWithColorless = (identityValue | colorlessValue)
  return (colorValue & identityValueWithColorless) === colorValue
}

async function calculateNodesInIdentityByColorIdentity() {
  const query = `{
    colorIdentities(func: type(ColorIdentity)) {
      id: xid
      colorIdentity
    }
    nodes(func: has(colorIdentity)) @filter(type(Card) or type(Combo)) {
      id: xid
      colorIdentity
    }
  }`
  const { colorIdentities, nodes } = await dgraph.query(query)

  const nodesByColorIdentity = {}
  colorIdentities.forEach(colorIdentity => {
    nodesByColorIdentity[colorIdentity.id] = []
    nodes.forEach(node => {
      if (areColorsPartOfIdentity(node.colorIdentity, colorIdentity.colorIdentity)) {
        nodesByColorIdentity[colorIdentity.id].push(node.id);
      }
    })
  })
  return nodesByColorIdentity
}

async function calculateNodesMatchingColorIdentity() {
  const query = `{
    colorIdentities(func: type(ColorIdentity)) {
      id: xid
      colorIdentity
    }
    nodes(func: has(colorIdentity)) @filter(type(Card) or type(Combo)) {
      id: xid
      colorIdentity
    }
  }`
  const { colorIdentities, nodes } = await dgraph.query(query)

  const nodesMatchingColorIdentity = {}
  colorIdentities.forEach(colorIdentity => {
    nodesMatchingColorIdentity[colorIdentity.id] = nodes
      .filter(node => node.colorIdentity === colorIdentity.colorIdentity)
      .map(node => node.id)
  })
  return nodesMatchingColorIdentity
}

async function calculateCommanderColorAffinity() {
  const allColorCombinations = getAllColorCombinations(allColors)

  // Select cards from each color identity and ones they're used with where the other card and the combo joining them also belong to the color identity.
  const cardsUsedWithByColorIdentity = {}
  await Promise.all(allColorCombinations.map(async colorCombination => {
    const query = `{
      var(func: eq(xid, "colorIdentity-${colorCombination}")) {
        ${colorCombination}nodes as containsColorIdentityOf
      }

      var(func: uid(${colorCombination}nodes)) {
        usedBy @filter(uid(${colorCombination}nodes)) {
          usedWith${colorCombination} as uses @filter(uid(${colorCombination}nodes))
        }
      }

      ${colorCombination}(func: type(Card)) @filter(uid(${colorCombination}nodes)) {
        id: xid
        usedWith @filter(uid(usedWith${colorCombination})) {
          id: xid
        }
      }
    }`
    const res = await dgraph.query(query)
    cardsUsedWithByColorIdentity[colorCombination] = res[colorCombination]
  }))

  // Create neighbor maps for each color identity.
  const neighborMapByColorIdentity = {}
  for (let colorCombination in cardsUsedWithByColorIdentity) {
    neighborMapByColorIdentity[colorCombination] = createNeighborMap(cardsUsedWithByColorIdentity[colorCombination])
  }

  let iterations = 0
  let maxIterations = 100
  let threshold = 1e-6
  let maxChange = Infinity
  while (maxChange > threshold && iterations < maxIterations) {
    // Calculate new values.
    let max = 0
    for (let colorIdentity in neighborMapByColorIdentity) {
      const neighborMap = neighborMapByColorIdentity[colorIdentity]
      const colorMax = stepNeighborMap(neighborMap)
      max = Math.max(max, colorMax)
    }

    // Normalize values.
    maxChange = 0
    for (let colorIdentity in neighborMapByColorIdentity) {
      const neighborMap = neighborMapByColorIdentity[colorIdentity]
      const colorMaxChange = normalizeNeighborMap(neighborMap, max)
      maxChange = Math.max(maxChange, colorMaxChange)
    }

    iterations++
  }

  const query = `{
    commanders(func: eq(isCommander, true)) {
      id: xid
      colorIdentity
    }
  }`
  const { commanders } = await dgraph.query(query)

  const colorAffinityByCommanderId = {}
  commanders.forEach(({ id, colorIdentity }) => {
    colorAffinityByCommanderId[id] = neighborMapByColorIdentity[colorIdentity][id].centrality
  })
  return colorAffinityByCommanderId
}

async function calculateCommanderComboRatio() {
  const commanderQuery = `{
    commanders(func: eq(isCommander, true)) {
      id: xid
    }
  }`
  const { commanders } = await dgraph.query(commanderQuery)
  const commanderData = await Promise.all(commanders.map(async (commander) => {
    const query = `{
      commanderNode as var(func: eq(isCommander, true)) @filter(eq(xid, "${commander.id}")) {
        ci as matchesColorIdentity
      }
      
      var(func: uid(commanderNode)) {
        combos as count(usedBy) @filter(uid_in(~containsColorIdentityOf, uid(ci)))
        comboNode as usedBy @filter(uid_in(~containsColorIdentityOf, uid(ci)))
      }
      
      var(func: uid(commanderNode)) {
        cards as count(usedWith) @filter(uid_in(usedBy, uid(comboNode)))
      }
      
      q(func: uid(commanderNode)) {
        id: xid
        combos: val(combos)
        cards: val(cards)
      }
    }`
    const { q } = await dgraph.query(query)
    return q
  }))

  return commanderData.flat()
}

module.exports = {
  getAllColorCombinations,
  calculateNodesInIdentityByColorIdentity,
  calculateNodesMatchingColorIdentity,
  calculateCommanderColorAffinity,
  calculateCommanderComboRatio
}
