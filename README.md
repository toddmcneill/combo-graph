# combo-graph
Discover clustering of MTG cards used in combos by using online combo data

## Usage
Use node v22

Install dependencies with `yarn`

Start dgraph with `docker compose up -d`

View ratel at http://localhost:8000/

Run `yarn start`

## Example Queries

See all cards used in at least 30 combos and which combos they're used in:
```
{
  q(func: type(Card)) @filter(ge(count(~uses), 30)) {
    xid
    name
      ~uses {
      xid
      name
    }
  }
}
```

See a specific card, which combos use it, and which other cards those combos use:
```
{
  q(func: type(Card)) @filter(allofterms(name, "Spike Feeder")) {
    xid
    name
    ~uses {
      xid
      name
      uses {
        xid
        name
      }
    }
  }  
}
```

See all combos and which cards they use
```
{
  q(func: type(Combo)) {
    xid
    name
    uses {
      xid
      name
    }
  }
}
```

## TODO
* Do more data analysis, computing centrality and subgraph size.
* Maybe pull data from commander spellbook instead.