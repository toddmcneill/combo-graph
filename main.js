const fs = require("fs");
const path = require("path");
const dgraph = require('./db/dgraph')
const commanderSpellbook = require('./api/commanderSpellbook')
const centrality = require('./analysis/centrality')
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
  console.log('Calcualting Centrality')
  const centralityByNodeId = await centrality.calculateCentrality()

  console.log('Saving Centrality')
  await db.saveCentrality(centralityByNodeId)
}

run().then(() => {
    dgraph.close()
    setTimeout(() => process.exit(0),100)
  }
)
