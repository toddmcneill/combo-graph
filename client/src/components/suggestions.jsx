import { useState } from 'react'
import api from '../api'
import Card from './card'
import Feature from './feature'
import Combo from './combo'

function Suggestions({ cardId }) {
  let [includeCardIds, setIncludeCardIds] = useState(new Set())
  let [excludeCardIds, setExcludeCardIds] = useState(new Set())
  let [cardCount, setCardCount] = useState(10)
  let [priceCap, setPriceCap] = useState('')
  let [preferCompletion, setPreferCompletion] = useState(true)
  let [selectedCardIds, setSelectedCardIds] = useState(new Set())
  let [showCombos, setShowCombos] = useState(false)

  const { isPending, error, data: suggestions } = api.loadSuggestions(cardId, {
    include: Array.from(includeCardIds),
    exclude: Array.from(excludeCardIds),
    cardCount,
    priceCap,
    preferCompletion
  })

  if (isPending && selectedCardIds.size) {
    setSelectedCardIds(new Set())
  }

  function toggleSelectedCard(cardId) {
    const newSet = new Set([cardId])
    if (selectedCardIds.has(cardId)) {
      setSelectedCardIds(selectedCardIds.difference(newSet))
    } else {
      setSelectedCardIds(selectedCardIds.union(newSet))
    }
  }

  return (
    <div>
      {
        renderFilters()
      }
      {
        (isPending || error) ? (
          <div>Loading...</div>
        ) : (
          <>
            <div>
              <div className="px-4 flex gap-8">
                <h2 className="text-xl">Price: ${suggestions.totalPrice}</h2>
                <h2 className="text-xl">Combo Count: <span className="font-bold">{suggestions.combos.length}</span></h2>
              </div>
              {renderFeatures()}
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-4 justify-around p-4 items-start">
                {renderCards()}
              </div>
            </div>
            <div
              className={`sticky relative bottom-0 mt-16 p-4 bg-white border-t-2 ${showCombos ? 'h-[40vh] min-h-[450px]' : 'h-16'}`}>
              <button
                className="absolute top-[-1.5rem] left-[calc(50%-1rem)] bg-white border-2 w-8 h-8 flex items-center justify-center m-2"
                onMouseDown={() => setShowCombos(!showCombos)}
              >{showCombos ? 'V' : '^'}
              </button>
              <div className="h-full overflow-auto">{
                showCombos ? renderCombos() : <div className="text-xl text-center">Combos</div>
              }</div>
            </div>
          </>
        )
      }
    </div>
  )

  function renderFilters() {
    return (
      <div className="flex gap-8 p-4">
        <div>
        <label className="flex gap-2">
            <span>Cards:</span>
            <input className="w-96" type="range" min="5" max="60" step="5" value={cardCount}
                   onChange={e => setCardCount(e.target.value)}/>
            <input type="number" className="border-2 w-14 text-center" min="1" max="60" value={cardCount}
                   onInput={(e => setCardCount(e.target.value))}/>
          </label>
          <div className="text-slate-400 text-sm">Suggestions generate at a rate of 5-10 per second</div>
        </div>
        <div>
          <label className="flex gap-2">
            <span className="whitespace-nowrap">Price Cap:</span>
            <input type="number" className="border-2" value={priceCap} onInput={e => setPriceCap(e.target.value)}/>
            <button type="button" onMouseDown={() => setPriceCap('')}>Clear</button>
          </label>
        </div>
        <div>
          <label className="flex gap-2 items-center">
            <span>Prefer:</span>
            <button type="button" className={`px-2 border-2 ${preferCompletion ? 'bg-slate-600 text-white' : ''}`} onMouseDown={() => setPreferCompletion(true)}>Completion
            </button>
            <button type="button" className={`px-2 border-2 ${preferCompletion ? '' : 'bg-slate-600 text-white'}`} onMouseDown={() => setPreferCompletion(false)}>Potential
            </button>
          </label>
          <div className="text-slate-400 text-sm">Completion: Prefer cards that complete the most partial combos.</div>
          <div className="text-slate-400 text-sm">Potential: Prefer cards that are part of the most combos overall.</div>
        </div>
        <div className={`${selectedCardIds.size ? 'visible' : 'invisible'} flex gap-4 items-center`}>
          <span>Selected Cards:</span>
          <span className="font-bold text-xl">{selectedCardIds.size}</span>
          <button type="button" className="px-2 border-2" onMouseDown={() => setSelectedCardIds(new Set())}>Deselect All</button>
          <button type="button" className="px-2 border-2" onMouseDown={() => setIncludeCardIds(includeCardIds.union(new Set(selectedCardIds)))}>Include First</button>
          <button type="button" className="px-2 border-2" onMouseDown={() => setExcludeCardIds(excludeCardIds.union(new Set(selectedCardIds)))}>Exclude</button>
        </div>
      </div>
    )
  }

  function renderFeatures() {
    return (
      <div className="flex flex-col flex-wrap justify-around p-4 max-h-48 overflow-auto">
        {suggestions.features.map(feature => <Feature name={feature.name} paths={feature.paths} key={feature.id}/>)}
      </div>
    )
  }

  function renderCards() {
    return (
      suggestions.cards.map(card => (
        <div
          key={card.id}
          onMouseDown={() => toggleSelectedCard(card.id)}
          className={`p-2 border-2 rounded-lg cursor-pointer ${selectedCardIds.has(card.id) ? 'border-gray-500 bg-gray-300' : 'border-transparent'}`}
        >
          <Card name={card.name} imageUri={card.imageUri}/>
          <div className="text-center">${card.price.toFixed(2)}</div>
        </div>
      ))
    )
  }

  function renderCombos() {
    return (
      <div className="flex flex-col gap-4">{
        suggestions.combos
          .filter(combo => !selectedCardIds.size || selectedCardIds.values().every(cardId => combo.cards.find(card => card.id === cardId)))
          .map(combo => {
            return (
              <Combo
                cards={combo.cards}
                description={combo.description}
                templates={combo.templates}
                prerequisites={combo.prerequisites}
                features={combo.features}
                selectedCardIds={selectedCardIds}
                onCardClick={(cardId) => toggleSelectedCard(cardId)}
                key={combo.id}
              />
            )
          })
      }</div>
    )
  }
}

export default Suggestions