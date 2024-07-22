import { useState } from 'react'
import Card from './card'
import Feature from './feature'

function Combo({ cards, description, templates, prerequisites, features, selectedCardIds, onCardClick }) {
  const [showDetails, setShowDetails] = useState(false)

  return (
    <div>
      <div className="flex gap-4 items-center">
        <div className="cursor-pointer text-3xl" onMouseDown={() => setShowDetails(!showDetails)}>👁️</div>
        {
          cards
            .sort((a, b) => a.name < b.name ? -1 : 1)
            .map(card => <span className={`text-xl px-2 rounded-full border-2 cursor-pointer ${selectedCardIds.has(card.id) ? 'bg-slate-600 text-white' : ''}`} onMouseDown={() => onCardClick(card.id)} key={card.id}>{card.name}</span>)
        }
        {
          !!templates && templates.map(template => <span className="text-slate-400" key={template.id}>{template.name}</span>)
        }
      </div>
      {showDetails && (
        <div className="pl-8 flex flex-col gap-2">
          <div className="flex gap-4 my-4">
            {cards.map(card => <Card name={card.name} imageUri={card.imageUri} imageOnly={true} small={true} key={card.id}/>)}
          </div>
          {!!templates && (
            <div>
              <span className="font-bold">Requirements:</span>
              <ul className="list-disc pl-8">
                {templates.map(template => <li key={template.id}><a href={template.scryfallUrl} target="_blank" className="underline">{replaceCosts(template.name)}</a></li>)}
              </ul>
            </div>
          )}
          {!!prerequisites && (
            <div>
              <span className="font-bold">Prerequisites:</span>
              <ul className="list-disc pl-8">
                {prerequisites.split('\n').map((line, i) => <li key={i}>{replaceCosts(line)}</li>)}
              </ul>
            </div>
          )}
          <div>
            <span className="font-bold">Steps:</span>
            <ol className="list-decimal pl-8">
              {description.split('\n').map((line, i) => <li key={i}>{replaceCosts(line)}</li>)}
            </ol>
          </div>
          <div>
            <span className="font-bold">Produces:</span>
            <ul className="list-disc pl-8">
              {features.map(feature => <li key={feature.id}><Feature name={feature.name} /></li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

function replaceCosts(originalStr) {
  let strParts = [originalStr]
  const symbolMap = {
    '{C}': <i className="ms ms-c ms-cost"/>,
    '{W}': <i className="ms ms-w ms-cost" />,
    '{U}': <i className="ms ms-u ms-cost" />,
    '{B}': <i className="ms ms-b ms-cost" />,
    '{R}': <i className="ms ms-r ms-cost" />,
    '{G}': <i className="ms ms-g ms-cost" />,
    '{0}': <i className="ms ms-0 ms-cost" />,
    '{1}': <i className="ms ms-1 ms-cost" />,
    '{2}': <i className="ms ms-2 ms-cost" />,
    '{3}': <i className="ms ms-3 ms-cost" />,
    '{4}': <i className="ms ms-4 ms-cost" />,
    '{5}': <i className="ms ms-5 ms-cost" />,
    '{6}': <i className="ms ms-6 ms-cost" />,
    '{7}': <i className="ms ms-7 ms-cost" />,
    '{8}': <i className="ms ms-8 ms-cost" />,
    '{9}': <i className="ms ms-9 ms-cost" />,
    '{X}': <i className="ms ms-x ms-cost" />,
    '{P}': <i className="ms ms-p ms-cost" />,
  }
  Object.entries(symbolMap).forEach(([key, value]) => {
    strParts = strParts.flatMap(strPart => {
      if (typeof strPart !== 'string') {
        return [strPart]
      }
      const split = strPart.split(key)
      const strPartSections = []
      for (let i = 0; i < split.length; i++) {
        strPartSections.push(split[i])
        if (i !== split.length - 1) {
          strPartSections.push(value)
        }
      }
      return strPartSections
    })
  })
  return strParts.map((strPart, i) => <span key={i}>{strPart}</span>)
}

export default Combo
