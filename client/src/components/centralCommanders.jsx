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
    <div className="flex flex-wrap gap-8 justify-around">
      {centralCommanders.map(card => (
        <Link href={`/suggestions/${card.id}`} key={card.id}>
          <Card name={card.name} imageUri={card.imageUri} />
          <div className="text-center">{card.ratio1.toFixed(2)}</div>
        </Link>
      ))}
    </div>
  )
}

export default CentralCommanders