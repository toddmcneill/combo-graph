const express = require('express')
const db = require('../db')
const { suggestCards } = require('../analysis/suggest')

const router = express.Router()

router.get('/central-commanders', async(req, res) => {
  const { centralCommanders } = await db.getCentralCommanders()
  res.send(centralCommanders)
})

router.get('/adjacentCards/:commanderId', async(req, res) => {
  const adjacentCards = await db.getAdjacentCardsByCommander(req.params.commanderId)
  res.send(adjacentCards)
})

router.get('/suggest/:cardId', async(req, res) => {
  const { cardId } = req.params
  const { include, exclude, cardCount, priceCap, preferCompletion } = req.query

  const { cards, combos, features } = await suggestCards(cardId, {
    includeCardIds: include ? include.split(',') : [],
    excludeCardIds: exclude ? exclude.split(',') : [],
    cardCount,
    priceCap,
    preferCompletion
  })

  const totalPrice = cards.reduce((acc, cur) => acc + cur.price, 0).toFixed(2)
  res.send({ cards, combos, totalPrice, features })
})

module.exports = router
