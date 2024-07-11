const dgraph = require('../db/dgraph')

async function run() {
  await dgraph.dropAll()
}

run().then(() => {
  dgraph.close()
  setTimeout(() => process.exit(0),100)
})
