const db = require('../db')
const dgraph = require('../db/dgraph')

async function run() {
  const cards = await db.getAdjacentCardsByCommander("card-e579a72f-4933-40fe-9e57-96f8d65370bc")
  console.log(cards)
}

run().then(() => {
  dgraph.close()
  setTimeout(() => process.exit(0),100)
})
