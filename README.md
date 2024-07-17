# combo-graph
Discover clustering of MTG cards used in combos by using combo data from [commander spellbook](https://backend.commanderspellbook.com/) augmented with card data from [scryfall](https://scryfall.com/docs/api).

## Usage
* Install [node v22](https://nodejs.org/en/download/package-manager) (`nvm use` if [nvm](https://github.com/nvm-sh/nvm?tab=readme-ov-file#installing-and-updating) is installed) and [yarn](https://classic.yarnpkg.com/lang/en/docs/install)
* Install [docker](https://www.docker.com/get-started)
* Install dependencies with `yarn`
* Start dgraph and server with `docker compose up -d`
* Seed data with `yarn seed`
* View ratel at http://localhost:8000/
* Access server at http://localhost:3000/api

### Notes
The first run of seeding will download all data and save it to a cache (~1.2GB).    
Subsequent runs will wipe the database and reseed data using cached values. It will take ~2 minutes.  
You can ignore the cache (and force redownload of all files) by using `yarn seed:force`.

## Endpoints

### /central-commanders
#### Usage
http://localhost:3000/api/central-commanders
#### Returns
The 50 commanders with the highest centrality in their color identity, sorted by the ratio of adjacent combos to adjacent cards.
```
[
  {
    id
    name
    colorIdentity
    oracleText
    imageUri
    comboCount1 // Tier 1 adjacent combos (uses the commander)
    adjacentCards1 // Tier 1 adjacent cards (share a combo with the commander)
    comboCount2 // Tier 2 adjacent combos (use cards from tier 1)
    adjacentCards2 // Tier 2 adjacent cards (share a combo with cards from tier 1)
    ratio1
    ratio2
  }
]
```

### /adjacentCards/:commanderId
#### Usage
http://localhost:3000/api/adjacentCards/card-b8376cca-ea96-478a-8e98-c4482031300a  
(Sliver Queen)
#### Returns
All adjacent cards for a given commander, ordered by the number of combos they share with that commander
```
[
  {
    id
    name
    price
    cnt // How many combos this card shares with the commander
  }
]
```

### /suggest/:cardId
#### Query parameters
* cardCount - How many cards to return. About 5-10 cards can be calculated per second. Default: 20
* priceCap - Exclude cards over the given price cap and combos that use those cards.
* exclude - Exclude cards by id, comma-separated.
#### Usage
http://localhost:3000/api/suggest/card-e579a72f-4933-40fe-9e57-96f8d65370bc
(Ghave, Guru of Spores)
http://localhost:3000/api/suggest/card-e579a72f-4933-40fe-9e57-96f8d65370bc?priceCap=10&cardCount=30&exclude=card-4d18bcba-a346-445e-a182-6cc30b7e066d,card-8d02b297-97c4-4379-9862-0a462400f66f,card-68e1f7e0-a9b3-437f-8086-0c0cb85f2880
(Ghave, Guru of Spores, price cap of 100, exclude Ashnod's Altar, Phyrexian Altar, and Krark-Clan Ironworks)
#### Returns
```
{
  cards: [{ id, name, imageUri, price }] // In the order they were included.
  feature: [{ }] // Ordered by the number of paths through complete combos that produce them.
  totalPrice: int
  combos: [{ id, isComplete, uses: [{ id, price, centrality }] }]
}
```


## Example Queries
### Paste these queries into ratel. 

Top 10 most used cards, how many combos they're used by, and how many cards they're used with:
```
{
  var(func: type(Card)) {
    c as count(usedBy)
    u as count(usedWith)
  }
  
  q(func: type(Card), orderdesc: val(c), first: 10) {
    name
    cnt: val(c)
    ucnt: val(u) 
  }
}
```

A specific card, adjacent cards, and what its combos produce:
```
{
  var(func: type(Card)) @filter(allofterms(name, "Spike Feeder")) {
    usedWith {
      usedWithName as name
    }
    usedBy {
      produces {
        producesName as name
      }
    }
  }

  usedWith(func: uid(usedWithName)) @normalize {
    name: val(usedWithName)
  }

  produces(func: uid(producesName)) @normalize {
    produces: val(producesName)
  }
}
```

All combos, which cards they use, and what features they produce:
```
{
  q(func: type(Combo)) {
    name
    uses {
      name
    }
    produces {
      name
    }
  }
}
```

The top 50 most central cards:
```
{
  q(func: type(Card), orderdesc: centrality, first: 50) {
    name
    centrality
    colorIdentity
    adjacentCards: count(usedWith)
    comboCount: count(usedBy)
  }  
}
```

Commanders ordered by color affinity which measures how central a commander is to combos and cards in its color identity:
```
{
  q(func: eq(isCommander, true), orderdesc: colorAffinity) {
    name
    colorIdentity
    usedWithCount: count(usedWith)
  }
}
```

A feature and what cards produce it:
```
{  
  var (func: type(Feature)) @filter(eq(name, "Creatures cannot attack you")) {
    producedBy {
      uses {
        cardName as name
      }
    }
  }
    
  q(func: uid(cardName)) @normalize {
    cards: val(cardName)
  }
}
```

The top 50 most central commanders, ordered by the ratio of adjacent combos to adjacent cards, indicating denser combo potential:
```
{
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
    
  q(func: uid(top50), orderdesc: val(ratio1)) {
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
}
```

First and second order cards, combos, and features in a given commander's color identity:
```
{
  commanderNode as var(func: eq(isCommander, true)) @filter(eq(name, "Chatterfang, Squirrel General")) {
    matchesColorIdentity {
      subgraph as containsColorIdentityOf
    }
  }
    
  commander(func: uid(commanderNode)) @ignorereflex {
    name
    combos1 as usedBy @filter(uid(subgraph)) {
      features1 as produces
      cards1 as uses @filter(uid(subgraph)) {
        combos2 as usedBy @filter(uid(subgraph)) {
          features2 as produces
          cards2 as uses @filter(uid(subgraph))
        }
      }
    }
  }

  cards(func: uid(cards1, cards2)) {
    name
    price
  }

  combos(func: uid(combos1, combos2)) {
    name
    description
  }
  
  features(func: uid(features1, features2)) {
    name
  }
}
```
