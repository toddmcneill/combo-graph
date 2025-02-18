const { fetchPage } = require('./api')

async function fetchBulkCardData() {
  const info = await fetchPage('https://api.scryfall.com/bulk-data', true)
  const url = info.data.find(({ type }) => type === 'oracle_cards').download_uri
  const cardData = await fetchPage(url)

  return cardData.filter(card => card.legalities.commander === 'legal').map(card =>{
    return {
      id: `card-${card.oracle_id}`,
      isCommander: card.type_line.includes('Legendary') && card.type_line.includes('Creature'),
      price: card.prices.usd,
      imageUri: card.image_uris?.normal,
    }
  })
}

module.exports = {
  fetchBulkCardData
}
