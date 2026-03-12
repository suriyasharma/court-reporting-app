export const fmt = (c) => '$' + (c / 100).toFixed(2)
export const now = () => new Date().toISOString().split('T')[0]
