const fs = require("fs");
const path = require("path");
const dgraph = require('./db/dgraph')
const commanderSpellbook = require('./api/commanderSpellbook')
const scryfall = require('./api/scryfall')
const centrality = require('./analysis/centrality')
const colorAffinity = require('./analysis/colorAffinity')
const db = require('./db/db')

async function run() {
  await storeData()
  await analyze()
}

async function storeData() {
  await dgraph.dropAll()
  const filename = path.join(__dirname, 'schema.dgraph')
  const schema = fs.readFileSync(filename, 'utf-8')
  await dgraph.setSchema(schema)

  console.log('Saving Cards')
  const cards = await commanderSpellbook.fetchAllCards()
  await dgraph.upsertObjects(cards.map(card => {
    const { id, name, oracleId, oracleText, colorIdentity, price } = card
    return { type: 'Card', id, name, oracleId, oracleText, colorIdentity, price }
  }))
  console.log('cards: ', cards.length)

  console.log('Saving Card Data')
  const cardData = await scryfall.fetchBulkCardData()
  await dgraph.updateObjects(cardData.map(card => {
    const { id, imageUri, isCommander } = card
    return { id, imageUri, isCommander }
  }))

  console.log('Saving Features')
  const features = await commanderSpellbook.fetchAllFeatures()
  await dgraph.upsertObjects(features.map(feature => {
    const { id, name, uncountable } = feature
    return { type: 'Feature', id, name, uncountable }
  }))
  console.log('features: ', features.length)

  console.log('Saving Combos')
  const combos = await commanderSpellbook.fetchAllCombos()
  await dgraph.upsertObjects(combos.map(combo => {
    const { id, name, description, colorIdentity, price } = combo
    return { type: 'Combo', id, name, description, colorIdentity, price }
  }))
  console.log('combos: ', combos.length)

  console.log('Saving Uses')
  await db.saveUses(combos)

  console.log('Saving Produces')
  await db.saveProduces(combos)

  console.log('Saving Used With')
  await db.saveUsedWith(combos)
}

async function analyze() {
  console.log('Saving Centrality')
  const centralityByNodeId = await centrality.calculateCentrality()
  await dgraph.updateObjects(Object.entries(centralityByNodeId).map(([key, value]) => ({
    id: key,
    centrality: value
  })))

  console.log('Saving Color Identities')
  const colorCombinations = colorAffinity.getAllColorCombinations()
  await dgraph.upsertObjects(colorCombinations.map(colorCombination => ({
    type: 'ColorIdentity',
    id: `colorIdentity-${colorCombination}`,
    colorIdentity: colorCombination,
  })))

  console.log('Calculating Contains Color Identity')
  const nodesInIdentityByColorIdentity = await colorAffinity.calculateNodesInIdentityByColorIdentity()
  console.log('Saving Contains Color Identity')
  await db.saveContainsColorIdentityOf(nodesInIdentityByColorIdentity)

  console.log('Calculating Matches Color Identity')
  const nodesMatchingColorIdentity = await colorAffinity.calculateNodesMatchingColorIdentity()
  console.log('Saving Matches Color Identity')
  await db.saveMatchesColorIdentity(nodesMatchingColorIdentity)

  console.log('Calculating Commander Color Affinity')
  const colorAffinityByCommanderId = await colorAffinity.calculateCommanderColorAffinity()
  console.log('Saving Commander Color Affinity')
  await dgraph.updateObjects(Object.entries(colorAffinityByCommanderId).map(([commanderId, colorAffinity]) => ({
    id: commanderId,
    colorAffinity,
  })))
}

run().then(() => {
  dgraph.close()
  setTimeout(() => process.exit(0),100)
})
