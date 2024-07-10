const fs = require("fs");
const path = require("path");
const dgraph = require('./db/dgraph')
const commanderSpellbook = require('./api/commanderSpellbook')
const scryfall = require('./api/scryfall')
const centrality = require('./analysis/centrality')
const colorAffinity = require('./analysis/colorAffinity')
const db = require('./db/db')

async function run() {
  // await storeData()
  // await analyze()

  const colorAffinityByNodeId = await colorAffinity.calculateColorAffinity()
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

  console.log('Calculating Includes Color Identity')
  const nodesInIdentityByCommanderId = await colorAffinity.calculateNodesInIdentityByColorIdentity()
  console.log('Saving Includes Color Identity')
  await db.saveIncludesColorIdentityOf(nodesInIdentityByCommanderId)

  console.log('Calculating Color Affinity')
  const colorAffinityByNodeId = await colorAffinity.calculateColorAffinity()
  console.log('Saving Color Affinity')
}

run().then(() => {
    dgraph.close()
    setTimeout(() => process.exit(0),100)
  }
)
