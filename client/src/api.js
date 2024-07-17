import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import config from './config'

function loadCentralCommanders() {
  return useQuery({
    queryKey: ['topCommanders'],
    queryFn: () => {
      return fetch(`${config.apiHost}/central-commanders`)
        .then(res => res.json())
    }
  })
}

function loadSuggestions(cardId, { include, exclude, cardCount, priceCap, preferCompletion }) {
  const params = ['suggestions', cardId, include, exclude, cardCount, priceCap, preferCompletion]
  const [debouncedParams, setDebouncedParams] = useState(params)
  useEffect(() => {
    if (JSON.stringify(params) !== JSON.stringify(debouncedParams)) {
      const timerId = setTimeout(
        () => setDebouncedParams(params),
        1000
      )
      return () => clearTimeout(timerId)
    }
  }, [params])

  const queryString = Object.entries({ include, exclude, cardCount, priceCap, preferCompletion })
    .map(([key, value]) => value ? `${key}=${encodeURIComponent(value)}` : null)
    .filter(x => x)
    .join('&')
  return useQuery({
    queryKey: debouncedParams,
    queryFn: () => {
      return fetch(`${config.apiHost}/suggest/${cardId}${queryString ? `?${queryString}` : ''}`)
        .then(res => res.json())
    }
  })
}

export default {
  loadCentralCommanders,
  loadSuggestions,
}