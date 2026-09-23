import { useMemo } from 'react'

export const usePasswordStrength = (password = '') => {
  return useMemo(() => {
    if (!password) return { score: 0, label: '', bars: 4 }

    let score = 0
    if (password.length >= 8)              score++
    if (/[A-Z]/.test(password))            score++
    if (/[0-9]/.test(password))            score++
    if (/[^A-Za-z0-9]/.test(password))     score++

    const labels = ['', 'Débil', 'Regular', 'Buena', 'Fuerte']
    return { score, label: labels[score], bars: 4 }
  }, [password])
}
