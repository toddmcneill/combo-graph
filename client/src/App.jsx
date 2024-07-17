import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRoutes, Link } from 'raviger'
import comboGraphLogo from '/comboGraph.svg'
import Home from './components/home'
import CentralCommanders from './components/centralCommanders.jsx'
import Suggestions from './components/suggestions'
import DeckAnalyzer from './components/deckAnalyzer'

const queryClient = new QueryClient()

function App() {
  const [currentPath, setCurrentPath] = useState(null)

  const routes = {
    '/': () => {
      // setCurrentPath('/')
      return <Home />
    },
    '/central-commanders': () => {
      // setCurrentPath('/central-commanders')
      return<CentralCommanders />
    },
    '/suggestions/:cardId': ({ cardId }) => {
      // setCurrentPath('/suggestions/:cardId')
      return <Suggestions cardId={cardId} />
    },
    '/deck-analyzer': () => {
      // setCurrentPath('/deck-analyzer')
      return <DeckAnalyzer />
    },
  }
  const route = useRoutes(routes)

  const navLinks = [
    {
      path: '/central-commanders',
      name: 'Central Commanders',
    },
    {
      path: '/deck-analyzer',
      name: 'Deck Analyzer',
    },
  ]

  return (
    <>
      <div className="bg-slate-100">
        <div>
          <Link href="/">
            <h1 className="text-6xl font-semibold flex gap-8 items-center justify-center">
              <div className="inline-block w-32">
                <img src={comboGraphLogo} alt="Combo Graph Logo"/>
              </div>
              Combo Graph
            </h1>
          </Link>
        </div>
        <div className="bg-slate-300 flex gap-2">
          {
            navLinks.map(({ path, name }) => {
              const styles = path === currentPath ? 'bg-slate-400' : ''
              return (
                <Link
                  href={path}
                  className={`p-4 font-semibold text-lg ${styles} hover:bg-slate-800 hover:text-white`}
                  key={path}
                >
                  {name}
                </Link>
              )
            })
          }
        </div>
      </div>
      <div>
        <QueryClientProvider client={queryClient}>
          {route}
        </QueryClientProvider>
      </div>
    </>
  )
}

export default App
