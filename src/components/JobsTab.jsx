import { useState } from 'react'
import { FileText, Upload, Plus, X, Pencil, Trash2 } from 'lucide-react'
import { now } from '../utils/format'
import { parseCSV, mergeJobs } from '../utils/csv'
import { JOB_FIELDS, REQUIRED_JOB_FIELDS, RECORDING_STATUS_LABELS, STATUS_COLORS } from '../utils/constants'

export default function JobsTab({ jobs, setJobs, reporters, onLog }) {
  const [showAdd, setShowAdd] = useState(false)
  const [editingJob, setEditingJob] = useState(null)
  const [editJobData, setEditJobData] = useState(null)
  const [uploadResult, setUploadResult] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [filterJobReporter, setFilterJobReporter] = useState('')
  const [filterJobDate, setFilterJobDate] = useState('')
  const [sortKey, setSortKey] = useState('deposition_datetime')
  const [sortDir, setSortDir] = useState('asc')
  const [newJob, setNewJob] = useState(() => Object.fromEntries(JOB_FIELDS.map(f => [f.key, ''])))
  const [errors, setErrors] = useState({})
  const [editErrors, setEditErrors] = useState({})
  const [selectedJobs, setSelectedJobs] = useState(new Set())
  const [deleteJobsConfirm, setDeleteJobsConfirm] = useState(false)

  const handleCSV = e => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => {
      const rows = parseCSV(ev.target.result)
      const before = jobs.length
      const merged = mergeJobs(jobs, rows)
      const added = merged.length - before
      const updated = rows.filter(r => jobs.find(j => j.deposition_id === r.deposition_id)).length
      setJobs(merged)
      setUploadResult({ total: rows.length, added, updated })
      setTimeout(() => setUploadResult(null), 5000)
      if (onLog) onLog('CSV Uploaded', `${rows.length} rows — ${added} added, ${updated} updated (${file.name})`)
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const validate = job => {
    const errs = {}
    REQUIRED_JOB_FIELDS.forEach(k => { if (!job[k]) errs[k] = true })
    return errs
  }

  const addJob = () => {
    const errs = validate(newJob)
    if (Object.keys(errs).length) { setErrors(errs); return }
    const jobToAdd = { ...newJob, deposition_id: newJob.deposition_id || `manual-${Date.now()}`, _addedAt: new Date().toISOString() }
    setJobs([...jobs, jobToAdd])
    if (onLog) onLog('Job Added', jobToAdd.deposition_name || jobToAdd.deposition_id)
    setNewJob(Object.fromEntries(JOB_FIELDS.map(f => [f.key, ''])))
    setErrors({})
    setShowAdd(false)
  }

  const openEditJob = j => { setEditingJob(j); setEditJobData({ ...j }); setEditErrors({}) }

  const toggleSelectJob = id => {
    setSelectedJobs(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const deleteSelectedJobs = () => {
    const count = selectedJobs.size
    setJobs(jobs.filter(j => !selectedJobs.has(j.deposition_id)))
    if (onLog) onLog('Jobs Deleted', `${count} job${count !== 1 ? 's' : ''} deleted`)
    setSelectedJobs(new Set())
    setDeleteJobsConfirm(false)
  }

  const saveJobEdit = () => {
    const errs = validate(editJobData)
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    const trackKeys = JOB_FIELDS.map(f => f.key)
    const changedNow = trackKeys.filter(k => (editJobData[k] || '') !== (editingJob[k] || ''))
    const prevEdited = editingJob._editedFields || []
    const allEdited = [...new Set([...prevEdited, ...changedNow])]
    setJobs(jobs.map(j => j.deposition_id === editingJob.deposition_id
      ? { ...editJobData, _updatedAt: new Date().toISOString(), _manuallyEdited: allEdited.length > 0, _editedAt: new Date().toISOString(), _editedFields: allEdited }
      : j
    ))
    if (onLog) onLog('Job Edited', `${editJobData.deposition_name || editJobData.deposition_id}${changedNow.length ? ' (' + changedNow.map(k => JOB_FIELDS.find(f => f.key === k)?.label || k).join(', ') + ')' : ''}`)
    setEditingJob(null); setEditJobData(null); setEditErrors({})
  }

  const fmtDate = v => { if (!v) return '—'; try { return new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return v } }
  const fmtShortDate = v => { if (!v) return '—'; try { return new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) } catch { return v } }

  const toggleSort = key => { if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc'); else { setSortKey(key); setSortDir('asc') } }

  const filtered = jobs
    .filter(j => !statusFilter || j.deposition_status === statusFilter)
    .filter(j => !search || Object.values(j).some(v => String(v).toLowerCase().includes(search.toLowerCase())))
    .filter(j => !filterJobReporter || (j.reporter_name || '').toLowerCase().includes(filterJobReporter.toLowerCase()))
    .filter(j => !filterJobDate || (j.deposition_datetime || '').startsWith(filterJobDate))
    .sort((a, b) => {
      if (sortKey === 'deposition_datetime' && sortDir === 'asc') {
        const today = new Date().toISOString().split('T')[0]
        const ad = (a.deposition_datetime || '').split('T')[0]
        const bd = (b.deposition_datetime || '').split('T')[0]
        const aFuture = ad >= today
        const bFuture = bd >= today
        if (aFuture && !bFuture) return -1
        if (!aFuture && bFuture) return 1
        return (a.deposition_datetime || '').localeCompare(b.deposition_datetime || '')
      }
      const av = a[sortKey] || ''; const bv = b[sortKey] || ''
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })

  const allFilteredSelected = filtered.length > 0 && filtered.every(j => selectedJobs.has(j.deposition_id))
  const toggleSelectAll = () => {
    if (allFilteredSelected) {
      setSelectedJobs(prev => { const next = new Set(prev); filtered.forEach(j => next.delete(j.deposition_id)); return next })
    } else {
      setSelectedJobs(prev => { const next = new Set(prev); filtered.forEach(j => next.add(j.deposition_id)); return next })
    }
  }

  const SortIcon = ({ k }) => sortKey === k ? <span className="ml-1 text-xs">{sortDir === 'asc' ? '▲' : '▼'}</span> : null

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm border p-4 flex flex-wrap gap-3 items-center justify-between">
        <div className="flex gap-3 flex-wrap items-center">
          <input type="text" placeholder="Search jobs..." value={search} onChange={e => setSearch(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-48" />
          <input type="text" placeholder="Reporter name..." value={filterJobReporter} onChange={e => setFilterJobReporter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm w-44" />
          <input type="date" value={filterJobDate} onChange={e => setFilterJobDate(e.target.value)} className="px-3 py-2 border rounded-lg text-sm" title="Filter by job date" />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm bg-white">
            <option value="">All Statuses</option>
            {['UPCOMING','ONGOING','PAST','CANCELLED','SPLIT','PROCESSING','DATA_ENTRY'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {(search || filterJobReporter || filterJobDate || statusFilter) && (
            <button onClick={() => { setSearch(''); setFilterJobReporter(''); setFilterJobDate(''); setStatusFilter('') }} className="text-xs text-indigo-600 hover:underline">Clear</button>
          )}
          {uploadResult && <span className="text-sm text-green-600 font-medium">&#10003; Imported {uploadResult.total} rows — {uploadResult.added} added, {uploadResult.updated} updated</span>}
        </div>
        <div className="flex gap-2">
          <label className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium cursor-pointer hover:bg-gray-200 flex items-center gap-1">
            <Upload className="w-4 h-4" /> Upload CSV
            <input type="file" accept=".csv" onChange={handleCSV} className="hidden" />
          </label>
          <button onClick={() => setShowAdd(true)} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium flex items-center gap-1"><Plus className="w-4 h-4" />Add Job</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="overflow-x-auto" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No jobs yet</p>
              <p className="text-sm mt-1">Upload a CSV or add jobs manually</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0 z-10">
                <tr>
                  <th className="px-3 py-2 border-b w-8">
                    <input type="checkbox" checked={allFilteredSelected} onChange={toggleSelectAll} className="w-4 h-4 rounded cursor-pointer" title="Select all visible" />
                  </th>
                  <th className="px-3 py-2 border-b w-10"></th>
                  {[['deposition_name','Deposition Name'],['deposition_status','Status'],['deposition_datetime','Event Time'],['event_state','State'],['organization_name','Organization'],['format','Format'],['need_reporter','Reporter Needed'],['need_steno','Steno'],['need_video','Video'],['recording_status','Recording Status'],['reporter_name','Reporter'],['certified_transcript_requested_at','Transcript Requested'],['transcript_due_date','Due Date'],['turnaround_type','Turnaround'],['bo_event_link','Event Link'],['bo_recording_link','Rec. Link']].map(([k,l]) => (
                    <th key={k} onClick={() => toggleSort(k)} className="px-3 py-2 text-left font-semibold text-gray-600 whitespace-nowrap cursor-pointer hover:text-gray-900 border-b select-none">
                      {l}<SortIcon k={k} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((j, idx) => (
                  <tr key={j.deposition_id || idx} className={`hover:bg-gray-50 group ${selectedJobs.has(j.deposition_id) ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selectedJobs.has(j.deposition_id)} onChange={() => toggleSelectJob(j.deposition_id)} className="w-4 h-4 rounded cursor-pointer" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <button onClick={() => openEditJob(j)} className="opacity-0 group-hover:opacity-100 p-1 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded transition-opacity" title="Edit job">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                    <td className="px-3 py-2 max-w-xs">
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium truncate">{j.deposition_name}</p>
                        {j._manuallyEdited && (
                          <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700 cursor-default" title={`Manually edited${j._editedAt ? ' ' + new Date(j._editedAt).toLocaleString() : ''}${j._editedFields?.length ? '\nFields: ' + j._editedFields.map(k => JOB_FIELDS.find(f => f.key === k)?.label || k).join(', ') : ''}`}>Edited</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 font-mono truncate">{j.deposition_id}</p>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[j.deposition_status] || 'bg-gray-100 text-gray-600'}`}>{j.deposition_status}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtDate(j.deposition_datetime)}</td>
                    <td className="px-3 py-2 text-center">{j.event_state}</td>
                    <td className="px-3 py-2 max-w-xs"><p className="truncate">{j.organization_name}</p></td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`px-2 py-0.5 rounded-full text-xs ${j.format === 'REMOTE' ? 'bg-blue-50 text-blue-700' : j.format === 'ON_SITE' ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'}`}>{j.format || '—'}</span></td>
                    <td className="px-3 py-2 text-center">{j.need_reporter === 'true' ? '✓' : '✗'}</td>
                    <td className="px-3 py-2 text-center">{j.need_steno === 'true' ? '✓' : '✗'}</td>
                    <td className="px-3 py-2 text-center">{j.need_video === 'true' ? '✓' : '✗'}</td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className="text-xs text-gray-600">{RECORDING_STATUS_LABELS[j.recording_status] || j.recording_status || '—'}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap"><span className={`text-xs ${j.reporter_name ? 'text-gray-800 font-medium' : 'text-gray-300'}`}>{j.reporter_name || '—'}</span></td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtShortDate(j.certified_transcript_requested_at)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{fmtShortDate(j.transcript_due_date)}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-xs">{j.turnaround_type || '—'}</td>
                    <td className="px-3 py-2">{j.bo_event_link ? <a href={j.bo_event_link} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs underline">Link</a> : '—'}</td>
                    <td className="px-3 py-2">{j.bo_recording_link ? <a href={j.bo_recording_link} target="_blank" rel="noreferrer" className="text-indigo-600 text-xs underline">Link</a> : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-2 border-t bg-gray-50 flex items-center justify-between text-xs text-gray-500">
            <span>{filtered.length} of {jobs.length} jobs</span>
            {selectedJobs.size > 0 && (
              <button onClick={() => setDeleteJobsConfirm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
                <Trash2 className="w-3.5 h-3.5" />Delete {selectedJobs.size} selected
              </button>
            )}
          </div>
        )}
      </div>

      {/* Add Job Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
              <h3 className="text-lg font-bold">Add Job</h3>
              <button onClick={() => { setShowAdd(false); setErrors({}) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4">
              {JOB_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-sm font-medium mb-1">
                    {f.label}{REQUIRED_JOB_FIELDS.includes(f.key) && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {f.type === 'select' ? (
                    <select value={newJob[f.key]} onChange={e => { setNewJob({ ...newJob, [f.key]: e.target.value }); setErrors({ ...errors, [f.key]: false }) }} className={`w-full px-3 py-2 border rounded-lg bg-white text-sm ${errors[f.key] ? 'border-red-400' : ''}`}>
                      <option value="">— Select —</option>
                      {f.options.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={f.type} value={newJob[f.key]} onChange={e => { setNewJob({ ...newJob, [f.key]: e.target.value }); setErrors({ ...errors, [f.key]: false }) }} className={`w-full px-3 py-2 border rounded-lg text-sm ${errors[f.key] ? 'border-red-400' : ''}`} />
                  )}
                  {errors[f.key] && <p className="text-xs text-red-500 mt-1">Required</p>}
                </div>
              ))}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end sticky bottom-0 bg-white border-t pt-4">
              <button onClick={() => { setShowAdd(false); setErrors({}) }} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={addJob} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Add Job</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Job Modal */}
      {editingJob && editJobData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl" style={{ maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-6 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10 rounded-t-xl">
              <div>
                <h3 className="text-lg font-bold">Edit Job</h3>
                <p className="text-xs text-gray-400 font-mono mt-0.5">{editingJob.deposition_id}</p>
              </div>
              <button onClick={() => { setEditingJob(null); setEditJobData(null); setEditErrors({}) }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            {editingJob._editedFields?.length > 0 && (
              <div className="px-6 pt-4">
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
                  <span className="font-semibold">Previously edited fields: </span>
                  {editingJob._editedFields.map(k => JOB_FIELDS.find(f => f.key === k)?.label || k).join(', ')}
                </div>
              </div>
            )}
            <div className="p-6 space-y-4">
              {JOB_FIELDS.map(f => {
                const isChanged = (editJobData[f.key] || '') !== (editingJob[f.key] || '')
                const wasPrevEdited = editingJob._editedFields?.includes(f.key)
                return (
                  <div key={f.key}>
                    <label className="block text-sm font-medium mb-1 flex items-center gap-2">
                      {f.label}
                      {REQUIRED_JOB_FIELDS.includes(f.key) && <span className="text-red-500">*</span>}
                      {isChanged && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">Changed</span>}
                      {!isChanged && wasPrevEdited && <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-500">Prev. edited</span>}
                    </label>
                    {f.type === 'select' ? (
                      <select value={editJobData[f.key] || ''} onChange={e => { setEditJobData({ ...editJobData, [f.key]: e.target.value }); setEditErrors({ ...editErrors, [f.key]: false }) }} className={`w-full px-3 py-2 border rounded-lg bg-white text-sm ${editErrors[f.key] ? 'border-red-400' : isChanged ? 'border-amber-400 bg-amber-50' : ''}`}>
                        <option value="">— Select —</option>
                        {f.options.filter(Boolean).map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type={f.type} value={editJobData[f.key] || ''} onChange={e => { setEditJobData({ ...editJobData, [f.key]: e.target.value }); setEditErrors({ ...editErrors, [f.key]: false }) }} className={`w-full px-3 py-2 border rounded-lg text-sm ${editErrors[f.key] ? 'border-red-400' : isChanged ? 'border-amber-400 bg-amber-50' : ''}`} />
                    )}
                    {editErrors[f.key] && <p className="text-xs text-red-500 mt-1">Required</p>}
                  </div>
                )
              })}
            </div>
            <div className="px-6 pb-6 flex gap-2 justify-end sticky bottom-0 bg-white border-t pt-4">
              <button onClick={() => { setEditingJob(null); setEditJobData(null); setEditErrors({}) }} className="px-4 py-2 text-gray-600">Cancel</button>
              <button onClick={saveJobEdit} className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteJobsConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold mb-2">Delete Jobs?</h3>
            <p className="text-sm text-gray-600 mb-5">Are you sure you want to permanently delete <span className="font-semibold text-red-600">{selectedJobs.size} job{selectedJobs.size !== 1 ? 's' : ''}</span>? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteJobsConfirm(false)} className="px-4 py-2 text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={deleteSelectedJobs} className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
