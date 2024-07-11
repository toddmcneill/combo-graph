# combo-graph
Discover clustering of MTG cards used in combos by using online combo data

## Usage
Use node v22

Install dependencies with `yarn`

Start dgraph with `docker compose up -d`

View ratel at http://localhost:8000/

Run `yarn start`

## Example Queries

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
    cub as count(usedBy)
    cuw as count(usedWith)
    ratio as math(cuw / max(cub, 1.0))
  }
    
  top50 as var(func: uid(node), orderdesc: colorAffinity, first: 50)
    
  q(func: uid(top50), orderdesc: val(ratio)) {
    xid
    name
    colorIdentity
    oracleText
    adjacentCards: val(cub)
    comboCount: val(cuw)
    val(ratio)
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

First and second order cards, combos, and features from a given commander:
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
