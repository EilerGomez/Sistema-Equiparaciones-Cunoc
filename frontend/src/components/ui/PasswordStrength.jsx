import { usePasswordStrength } from '../../hooks/usePasswordStrength'

const colorMap = ['', 'active-weak', 'active-fair', 'active-good', 'active-strong']

export const PasswordStrength = ({ password }) => {
  const { score, label } = usePasswordStrength(password)
  if (!password) return null

  return (
    <div style={{ marginTop: 8 }}>
      <div className="pw-strength">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={`pw-bar ${i <= score ? colorMap[score] : ''}`}
          />
        ))}
      </div>
      {label && <p className="pw-label">{label}</p>}
    </div>
  )
}
