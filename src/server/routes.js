const express = require('express')
const db = require('../db')

const router = express.Router()

router.get('/centralCommanders', async(req, res) => {
  const centralCommanders = await db.getCentralCommanders()
  res.send(centralCommanders)
})

router.get('/adjacentCards/:commanderId', async(req, res) => {
  const adjacentCards = await db.getAdjacentCardsByCommander(req.params.commanderId)
  res.send(adjacentCards)
})

module.exports = router
