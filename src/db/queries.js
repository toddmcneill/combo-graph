const dgraph = require('./dgraph')
const { sanitizeValue } = dgraph

async function getCentralCommanders() {
  const query = `{
    node as var(func: eq(isCommander, true)) {
      combos1 as count(usedBy)
      cards1 as count(usedWith)
      usedWith {
        combosInner as count(usedBy)
        cardsInner as count(usedWith)
      }
      combos2 as sum(val(combosInner))
      cards2 as sum(val(cardsInner))
      ratio1 as math(combos1 / max(cards1, 1.0))
      ratio2 as math((combos1 + combos2) / max((cards1 + cards2), 1.0))
    }
      
    top50 as var(func: uid(node), orderdesc: colorAffinity, first: 50)
      
    centralCommanders(func: uid(top50), orderdesc: val(ratio1)) {
      xid
      name
      colorIdentity
      oracleText
      imageUri
      adjacentCards1: val(cards1)
      adjacentCards2: val(cards2)
      comboCount1: val(combos1)
      comboCount2: val(combos2)
      val(ratio1)
      val(ratio2)
    }
  }`
  return dgraph.query(query)
}

async function getAdjacentCardsByCommander(commanderId) {
  const query = `{
    commanderNode as var(func: eq(isCommander, true)) @filter(eq(xid, "${sanitizeValue(commanderId)}")) {
      matchesColorIdentity {
        subgraph as containsColorIdentityOf
      }
    }
      
    commander(func: uid(commanderNode)) @ignorereflex {
      id: xid
      name
      usedBy @filter(uid(subgraph)) {
        name
        produces
        uses @filter(uid(subgraph)) {
          id: xid
          name
          price
        }
      }
    }
  }`
  const { commander } = await dgraph.query(query)

  const cards = {}
  commander[0].usedBy.forEach(combo => {
    combo.uses?.forEach(card => {
      if (!(card.id in cards)) {
        cards[card.id] = {
          id: card.id,
          name: card.name,
          price: card.price,
          cnt: 0,
        }
      }
      cards[card.id].cnt++
    })
  })

  return Object.values(cards).sort((a, b) => a.cnt < b.cnt ? -1 : 1).reverse()
}

module.exports = {
  getCentralCommanders,
  getAdjacentCardsByCommander,
}
