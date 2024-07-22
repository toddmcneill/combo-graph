import api from '../api'
import Card from './card'
import { Link } from 'raviger'

function CentralCommanders() {
  const { isPending, error, data: centralCommanders } = api.loadCentralCommanders()
  if (isPending) {
    return 'Loading...'
  }
  if (error) {
    return 'error!'
  }

  return (
    <div>
      <div className="p-4">
        <p>This is a list of commanders that belong to at least one combo in their color identity, sorted by the ratio of combos to cards the commander is directly related to</p>
        <p>Color affinity is a measure of how central the commander is to cards in their respective color identity. A low color affinity means the commander is more isolated from other parts of the combo graph.</p>
      </div>
      <div className="flex flex-wrap gap-4 justify-around">
        {centralCommanders.map(card => (
          <Link href={`/suggestions/${card.id}`} key={card.id}>
            <div>
              <Card name={card.name} imageUri={card.imageUri} />
              <div className="text-center">
                <div>
                  {card.commanderCombos} combos / {card.commanderCards} cards = <span className="font-bold">{card.ratio.toFixed(2)}</span>
                </div>
                <div>
                  Color Affinity: {(card.colorAffinity * 10000).toFixed(0)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

export default CentralCommanders