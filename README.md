# combo-graph
Discover clustering of MTG cards used in combos by using online combo data

## Usage
Use node v22

Install dependencies with `yarn`

Start dgraph with `docker compose up -d`

View ratel at http://localhost:8000/

Run `yarn start`

## Example Queries

See the top 10 most used cards, how many combos they're used by, and how many cards they're used with:
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

See a specific card, which combos use it, which other cards those combos use, and what those combos produce:
```
{
  q(func: type(Card)) @filter(allofterms(name, "Spike Feeder")) {
    name
    usedBy {
      name
      uses {
        name
      }
      produces {
        name
      }
    }
  }  
}
```

See all combos, which cards they use, and what features they produce,
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

## TODO
* Do more data analysis, computing centrality and subgraph size.
* Maybe pull data from commander spellbook instead.