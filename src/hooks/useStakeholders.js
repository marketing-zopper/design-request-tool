import { useEffect, useState } from 'react'
import { fetchStakeholders } from '../lib/api'

export function useStakeholders() {
  const [stakeholders, setStakeholders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    fetchStakeholders()
      .then((data) => {
        if (mounted) setStakeholders(data)
      })
      .catch((err) => {
        if (mounted) setError(err)
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => {
      mounted = false
    }
  }, [])

  return { stakeholders, loading, error }
}
