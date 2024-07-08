const dgraph = require('./dgraph')
const fs = require('fs')
const path = require('path')
const { DGRAPH_TYPES, DGRAPH_EDGES } = require('./enums')

async function setSchema() {
  const filename = path.join(__dirname, 'schema.dgraph')
  const schema = fs.readFileSync(filename, 'utf-8')
  return dgraph.setSchema(schema)
}

async function upsertCombo(id, name) {
  const obj = {
    type: DGRAPH_TYPES.COMBO,
    id,
    name,
  }
  return dgraph.upsertObject(obj)
}

async function getAllCombos() {
  const query = `
    {
      q(func: type(Combo)) {
        xid
        name
      }
    }
  `
  const { q } = await dgraph.query(query)
  return q
}

async function upsertCard(id, name) {
  const obj = {
    type: DGRAPH_TYPES.CARD,
    id,
    name,
  }
  return dgraph.upsertObject(obj)
}

async function upsertCards(cards) {
  const objs = cards.map(card => ({
    type: DGRAPH_TYPES.CARD,
    id: card.id,
    name: card.name,
  }))
  return dgraph.bulkUpsertObjects(objs)
}

async function setComboUsesCard(comboId, cardId) {
  await dgraph.createEdge(comboId, cardId, DGRAPH_EDGES.USES)
  await dgraph.createEdge(cardId, comboId, DGRAPH_EDGES.USES)
}

async function calculateCentrality(iterations = 1) {
  // Set initial values
  const initialQuery = `{ node as var(func: type(Node)) @filter(type(Combo) or type(Card)) }`
  const initialNquads = [`uid(node) <centrality> "1" .`]
  await dgraph.upsert(initialQuery, initialNquads)

  for (let i = 0; i < iterations; i++) {
    // Compute new values
    const computeQuery = `{
      node as var(func: type(Node)) @filter(type(Combo) or type(Card)) {
        uses {
          neighborCentrality as centrality
        }
        newCentrality as sum(val(neighborCentrality))
      }
    }`
    const computeNquads = [`uid(node) <centrality> val(newCentrality) .`]
    await dgraph.upsert(computeQuery, computeNquads)

    // Normalize values between 0 and 1
    const normalizeQuery = `{
      node as var(func: has(centrality)) { c as centrality }
      var() { m as max(val(c)) }
      var(func: uid(node)) { normalized as math(c / m) }
    }`
    const normalizeNquads = [`uid(node) <centrality> val(normalized) .`]
    await dgraph.upsert(normalizeQuery, normalizeNquads)
  }
}

module.exports = {
  setSchema,
  upsertCombo,
  getAllCombos,
  upsertCard,
  upsertCards,
  setComboUsesCard,
  calculateCentrality,
}