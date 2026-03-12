export function parseCSV(text) {
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''))
  return lines.slice(1).map(line => {
    const vals = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      if (line[i] === '"') { inQ = !inQ }
      else if (line[i] === ',' && !inQ) { vals.push(cur.trim()); cur = '' }
      else { cur += line[i] }
    }
    vals.push(cur.trim())
    const obj = {}
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
    return obj
  })
}

export function mergeJobs(existing, incoming) {
  const map = {}
  existing.forEach(j => { map[j.deposition_id] = { ...j } })
  incoming.forEach(row => {
    const id = row.deposition_id
    if (!id) return
    if (map[id]) {
      // If incoming is CANCELLED, always update status
      if (row.deposition_status === 'CANCELLED') {
        map[id] = { ...map[id], ...row }
      } else if (map[id].deposition_status === row.deposition_status) {
        // Same status — update all fields with latest data
        map[id] = { ...map[id], ...row }
      } else {
        // Status changed — update with latest
        map[id] = { ...map[id], ...row }
      }
    } else {
      map[id] = { ...row, _addedAt: new Date().toISOString() }
    }
  })
  return Object.values(map)
}
