const express = require('express')
const db = require('../db')
const { suggestCards } = require('../analysis/suggest')

const router = express.Router()

router.get('/centralCommanders', async(req, res) => {
  const { centralCommanders } = await db.getCentralCommanders()
  res.send(centralCommanders)
})

router.get('/adjacentCards/:commanderId', async(req, res) => {
  const adjacentCards = await db.getAdjacentCardsByCommander(req.params.commanderId)
  res.send(adjacentCards)
})

router.get('/suggest/:cardId', async(req, res) => {
  const { cardId } = req.params
  const { cardCount, priceCap, exclude } = req.query

  const excludedCardIds = exclude ? exclude.split(',') : []
  const { cards, combos, features } = await suggestCards(cardId, excludedCardIds, cardCount, priceCap)

  const comboCount = combos.length
  const totalPrice = cards.reduce((acc, cur) => acc + cur.price, 0).toFixed(2)
  res.send({ cards, comboCount, totalPrice, features })
})

module.exports = router
