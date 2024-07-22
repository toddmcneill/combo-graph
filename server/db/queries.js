const dgraph = require('./dgraph')
const { sanitizeValue } = dgraph

async function getCentralCommanders() {
  const query = `{
    node as var(func: eq(isCommander, true)) {
      combos as commanderCombos
      cards as commanderCards
      ratio as math(combos / max(cards, 1.0))
    }
    
    centralCommanders(func: uid(node), orderdesc: val(ratio)) {
      id: xid
      name
      colorIdentity
      oracleText
      imageUri
      colorAffinity
      commanderCombos
      commanderCards
      ratio: val(ratio)
    }
  }`
  const { centralCommanders } = await dgraph.query(query)
  return centralCommanders
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

async function getConnectedCombosAndCardsFromCardIds(cardIds, colorIdentity) {
  const query = `{
    colorIdentity as var(func: type(ColorIdentity)) @filter(eq(colorIdentity, "${sanitizeValue(colorIdentity)}"))
    
    var(func: type(Card)) @filter(${dgraph.getFilterList('xid', cardIds)}) {
      comboIds as usedBy @filter(uid_in(~containsColorIdentityOf, uid(colorIdentity)))
    }
    
    combos(func: uid(comboIds)) {
      id: xid
      uses {
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
  if (!cardIds.length) {
    return []
  }
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

async function getCombos(comboIds){
  if (!comboIds.length) {
    return []
  }
  const query = `{
    combos(func: type(Combo)) @filter(${dgraph.getFilterList('xid', comboIds)}) {
      id: xid
      name
      description
      prerequisites
      cards: uses {
        id: xid
        name
        imageUri
      }
      templates: requires {
        id: xid
        name
        scryfallUrl
      }
      features: produces {
        id: xid
        name
      }
    }
  }`
  const { combos } = await dgraph.query(query)
  return combos
}

async function getFeaturesForCombos(comboIds) {
  if (!comboIds.length) {
    return []
  }
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
