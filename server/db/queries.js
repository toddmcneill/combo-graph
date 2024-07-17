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
      id: xid
      name
      colorIdentity
      oracleText
      imageUri
      comboCount1: val(combos1)
      adjacentCards1: val(cards1)
      comboCount2: val(combos2)
      adjacentCards2: val(cards2)
      ratio1: val(ratio1)
      ratio2: val(ratio2)
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

  return Object.values(cards).sort((a, b) => a.cnt < b.cnt ? 1 : -1)
}

async function getColorIdentityOfCard(cardId){
  const query = `{
    q(func: eq(xid, "${sanitizeValue(cardId)}")) {
      colorIdentity
    }
  }`
  const { q } = await dgraph.query(query)
  return q[0].colorIdentity
}

async function getConnectedCombosAndCardsFromCardIds(cardIds, colorIdentity, excludeCardIds) {
  const excludeCardFilter = dgraph.getFilterList('xid', excludeCardIds, false, true)
  const query = `{
    colorIdentity as var(func: type(ColorIdentity)) @filter(eq(colorIdentity, "${sanitizeValue(colorIdentity)}"))
    
    var(func: type(Card)) @filter(${dgraph.getFilterList('xid', cardIds)}) {
      comboIds as usedBy @filter(uid_in(~containsColorIdentityOf, uid(colorIdentity))) {
        cardIds as uses @filter(uid_in(~containsColorIdentityOf, uid(colorIdentity))${excludeCardIds.length ? ` AND ${excludeCardFilter}` : ''})
      }
    }
    
    combos(func: uid(comboIds)) {
      id: xid
      uses @filter(uid(cardIds)) {
        id: xid
        price
        centrality
      }
    }
  }`
  const { combos } = await dgraph.query(query)
  return combos
}

async function getCards(cardIds) {
  const query = `{
    cards(func: type(Card)) @filter(${dgraph.getFilterList('xid', cardIds)}) {
      id: xid
      name
      imageUri
      price
    }
  }`
  const { cards } = await dgraph.query(query)
  return cards
}

async function getCombos(comboIds) {
  const query = `{
    combos(func: type(Combo)) @filter(${dgraph.getFilterList('xid', comboIds)}) {
      id: xid
      name
      description
      cards: uses {
        id: xid
        name
        imageUri
      }
      features: produces {
        id: xid
      }
    }
  }`
  const { combos } = await dgraph.query(query)
  return combos
}

async function getFeaturesForCombos(comboIds) {
  console.log('combo ids in get features: ', comboIds.length, 'sample: ', comboIds.slice(0,5))
  const query = `{
    var(func: type(Combo)) @filter(${dgraph.getFilterList('xid', comboIds)}) {
      paths as math(1)
      feature as produces {
        p as math(paths)
      }
    }
  
    features(func: uid(feature)) {
      id: xid
      name
      paths: val(p)
    }
  }`
  const { features } = await dgraph.query(query)
  return features
}

module.exports = {
  getCentralCommanders,
  getAdjacentCardsByCommander,
  getColorIdentityOfCard,
  getConnectedCombosAndCardsFromCardIds,
  getCards,
  getCombos,
  getFeaturesForCombos,
}
