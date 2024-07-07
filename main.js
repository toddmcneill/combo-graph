const dgraph = require('./dgraph')
const edhrec = require('./edhrec')
const db = require("./db")

async function test() {
  await dgraph.dropAll()
  await db.setSchema()

  const allEdhrecCombos = await edhrec.fetchAllColorCombos()
  // console.dir(allEdhrecCombos.slice(0, 1), { depth: 5, color: true})

  // Upsert combos
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
  let edgeCount = 0
  await Promise.all(allEdhrecCombos.map(combo => {
    return Promise.all(combo.cardviews.map(({ sanitized }) => {
      return db.setComboUsesCard(getComboId(combo), sanitized)
    }))
  }))

  // const paths = allCombos.map(combo => combo.href)
  // const comboDetails = await edhrec.fetchAllComboDetails(paths)
  // console.log('comboDetails:', comboDetails.length)
}

function getComboId(combo) {
  return combo.cardviews.map(({ sanitized }) => sanitized).sort().join('_')
}

test().then(() => process.exit(0))
