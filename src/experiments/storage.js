const storageKey = 'lhc-completed-experiments'

export function loadCompletedExperiments() {
  try { return JSON.parse(localStorage.getItem(storageKey) ?? '[]') } catch { return [] }
}

export function saveCompletedExperiment(experiment) {
  const existing = loadCompletedExperiments().filter((item) => item.id !== experiment.id)
  localStorage.setItem(storageKey, JSON.stringify([experiment, ...existing]))
}

export function deleteCompletedExperiment(id) {
  localStorage.setItem(storageKey, JSON.stringify(loadCompletedExperiments().filter((experiment) => experiment.id !== id)))
}