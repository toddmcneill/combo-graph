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
  return dgraph.upsert(obj)
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
  return dgraph.upsert(obj)
}

async function upsertCards(cards) {
  const objs = cards.map(card => ({
    type: DGRAPH_TYPES.CARD,
    id: card.id,
    name: card.name,
  }))
  return dgraph.bulkUpsert(objs)
}

async function setComboUsesCard(comboId, cardId) {
  return dgraph.createEdge(comboId, cardId, DGRAPH_EDGES.USES)
}

module.exports = {
  setSchema,
  upsertCombo,
  getAllCombos,
  upsertCard,
  upsertCards,
  setComboUsesCard,
}