export const particleTypes = {
  proton: { label: 'Proton', symbol: 'p+', color: '#59d7cd', accent: '#b4fff0', size: 1, mass: '1.00 u' },
  electron: { label: 'Electron', symbol: 'e−', color: '#8fb8ff', accent: '#d9e5ff', size: 0.72, mass: '0.00 u' },
  positron: { label: 'Positron', symbol: 'e+', color: '#f0b36d', accent: '#ffe4b9', size: 0.8, mass: '0.00 u' },
  muon: { label: 'Muon', symbol: 'μ−', color: '#e990c8', accent: '#ffd3ed', size: 1.12, mass: '0.11 u' },
}

export const particleOptions = Object.entries(particleTypes).map(([value, particle]) => ({ value, ...particle }))

export function getParticleType(type) {
  return particleTypes[type] ?? particleTypes.proton
}