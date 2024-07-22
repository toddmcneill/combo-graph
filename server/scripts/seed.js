const fs = require("fs");
const path = require("path");
const dgraph = require('../db/dgraph')
const commanderSpellbook = require('../api/commanderSpellbook')
const scryfall = require('../api/scryfall')
const centrality = require('../analysis/centrality')
const colorAffinity = require('../analysis/colorAffinity')
const db = require('../db')

async function run() {
  await storeData()
  await analyze()
}

async function storeData() {
  await dgraph.dropAll()
  const schemaFilename = path.join(__dirname, '../db/schema.dgraph')
  const schema = fs.readFileSync(schemaFilename, 'utf-8')
  await dgraph.setSchema(schema)

  console.log('Saving Cards (Commander Spellbook)')
  const cards = await commanderSpellbook.fetchAllCards()
  await dgraph.upsertObjects(cards.map(card => {
    const { id, name, oracleId, oracleText, colorIdentity, price } = card
    return { type: 'Card', id, name, oracleId, oracleText, colorIdentity, price }
  }))
  console.log('cards: ', cards.length)

  console.log('Saving Card Data (Scryfall)')
  const cardData = await scryfall.fetchBulkCardData()
  await dgraph.updateObjects(cardData.map(card => {
    const { id, isCommander, imageUri, price } = card
    return {
      id,
      isCommander,
      imageUri,
      ...(imageUri ? { imageUri } : {}),
      ...(price ? { price } : {}),
    }
  }))

  console.log('Saving Features (Commander Spellbook)')
  const features = await commanderSpellbook.fetchAllFeatures()
  await dgraph.upsertObjects(features.map(feature => {
    const { id, name, uncountable } = feature
    return { type: 'Feature', id, name, uncountable }
  }))
  console.log('features: ', features.length)

  console.log('Saving Templates (Commander Spellbook)')
  const templates = await commanderSpellbook.fetchAllTemplates()
  await dgraph.upsertObjects(templates.map(template => {
    const { id, name, scryfallUrl } = template
    return { type: 'Template', id, name, scryfallUrl }
  }))
  console.log('templates: ', templates.length)

  console.log('Saving Combos (Commander Spellbook)')
  const combos = await commanderSpellbook.fetchAllCombos()
  await dgraph.upsertObjects(combos.map(combo => {
    const { id, name, description, prerequisites, colorIdentity, price } = combo
    return { type: 'Combo', id, name, description, prerequisites, colorIdentity, price }
  }))
  console.log('combos: ', combos.length)

  console.log('Saving Relationships:')
  console.log('...Uses')
  await db.saveUses(combos)
  console.log('...Requires')
  await db.saveRequires(combos)
  console.log('...Produces')
  await db.saveProduces(combos)
  console.log('...Used With')
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

  console.log('Calculating Commander Combo Ratios')
  const commanderComboRatios = await colorAffinity.calculateCommanderComboRatio()
  console.log('Saving Commander Combo Ratios')
  await dgraph.updateObjects(commanderComboRatios.map(({ id, combos, cards }) => ({
    id,
    commanderCombos: combos,
    commanderCards: cards,
  })))
}

run().then(() => {
  dgraph.close()
  setTimeout(() => process.exit(0),100)
})
