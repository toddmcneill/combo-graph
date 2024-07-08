const dgraph = require('./dgraph')
const edhrec = require('./edhrec')
const db = require('./db')

async function run() {
  await dgraph.dropAll()
  await db.setSchema()

  // Upsert combos
  const allEdhrecCombos = await edhrec.fetchAllColorCombos()
  await Promise.all(allEdhrecCombos.map(combo => {
    return db.upsertCombo(getComboId(combo), combo.header)
  }))

  // Upsert cards
  const keyedCardList = {}
  allEdhrecCombos.forEach(combo => combo.cardviews.forEach(({ sanitized, name }) => {
    keyedCardList[sanitized] = {
      id: sanitized,
      name
    }
  }))
  await db.upsertCards(Object.values(keyedCardList))

  // Create edges
  await Promise.all(allEdhrecCombos.map(combo => {
    return Promise.all(combo.cardviews.map(({ sanitized }) => {
      return db.setComboUsesCard(getComboId(combo), sanitized)
    }))
  }))

  // Cache all combo details
  const paths = allEdhrecCombos.map(combo => combo.href)
  await edhrec.fetchAllComboDetails(paths)
  // TODO: add these to the combo nodes

  // Determine centrality
  await db.calculateCentrality(50)
}

function getComboId(combo) {
  return combo.cardviews.map(({ sanitized }) => sanitized).sort().join('_')
}

run().then(() => {
    dgraph.close()
    setTimeout(() => process.exit(0),100)
  }
)
