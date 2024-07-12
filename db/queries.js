const dgraph = require('./dgraph')
const { sanitizeValue } = dgraph

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

async function

module.exports = {
  getAdjacentCardsByCommander,
}
