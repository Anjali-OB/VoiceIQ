import { useState } from 'react'

const groupColors = {
  'General': 'bg-gray-100 text-gray-600',
  'VIP': 'bg-yellow-100 text-yellow-700',
  'New Customer': 'bg-blue-100 text-blue-700',
  'Follow-up': 'bg-purple-100 text-purple-700',
  'Inactive': 'bg-red-100 text-red-600',
}

const statusColors = {
  'pending': 'bg-gray-100 text-gray-600',
  'completed': 'bg-green-100 text-green-700',
  'in-progress': 'bg-blue-100 text-blue-700',
}

export default function ContactTable({ contacts = [], onTagChange, showActions = true }) {
  const [search, setSearch] = useState('')
  const [filterGroup, setFilterGroup] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const GROUPS = ['General', 'VIP', 'New Customer', 'Follow-up', 'Inactive']

  const filtered = contacts
    .filter(c => {
      const name = (c.name || '').toLowerCase()
      const phone = (c.phone || '').toLowerCase()
      const matchSearch = name.includes(search.toLowerCase()) || phone.includes(search.toLowerCase())
      const matchGroup = filterGroup === 'all' || c.group_name === filterGroup
      const matchStatus = filterStatus === 'all' || c.status === filterStatus
      return matchSearch && matchGroup && matchStatus
    })
    .sort((a, b) => {
      let valA = a[sortBy] || ''
      let valB = b[sortBy] || ''
      if (typeof valA === 'string') valA = valA.toLowerCase()
      if (typeof valB === 'string') valB = valB.toLowerCase()
      if (valA < valB) return sortDir === 'asc' ? -1 : 1
      if (valA > valB) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const handleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const SortIcon = ({ col }) => {
    if (sortBy !== col) return <span className="text-gray-300 ml-1">↕</span>
    return <span className="text-indigo-600 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>
  }

  const completedCount = contacts.filter(c => c.status === 'completed').length
  const pendingCount = contacts.filter(c => c.status === 'pending').length

  return (
    <div className="space-y-3">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-indigo-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-indigo-600">{contacts.length}</p>
          <p className="text-xs text-gray-500">Total</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-green-600">{completedCount}</p>
          <p className="text-xs text-gray-500">Completed</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 text-center">
          <p className="text-xl font-bold text-gray-600">{pendingCount}</p>
          <p className="text-xs text-gray-500">Pending</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search name or phone..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-32 border border-gray-300 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <select
          value={filterGroup}
          onChange={e => setFilterGroup(e.target.value)}
          className="border border-gray-300 rounded-xl px-2 py-2 text-xs focus:outline-none"
        >
          <option value="all">All groups</option>
          {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-xl px-2 py-2 text-xs focus:outline-none"
        >
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Table */}
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('name')}>
                  Name <SortIcon col="name" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 cursor-pointer hover:text-indigo-600"
                  onClick={() => handleSort('phone')}>
                  Phone <SortIcon col="phone" />
                </th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Group</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Status</th>
                {showActions && onTagChange && (
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Change group</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={showActions ? 5 : 4} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No contacts found
                  </td>
                </tr>
              ) : filtered.map((c, i) => (
                <tr key={c.id || i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold shrink-0">
                        {(c.name || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-gray-800 text-xs">{c.name || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 font-mono">{c.phone}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${groupColors[c.group_name] || groupColors['General']}`}>
                      {c.group_name || 'General'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] || statusColors['pending']}`}>
                      {c.status === 'completed' ? '✅ Done' : '⏳ Pending'}
                    </span>
                  </td>
                  {showActions && onTagChange && (
                    <td className="px-4 py-3">
                      <select
                        value={c.group_name || 'General'}
                        onChange={e => onTagChange(c.id, e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-1.5 py-1 focus:outline-none bg-white"
                      >
                        {GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400">
          Showing {filtered.length} of {contacts.length} contacts
        </div>
      </div>
    </div>
  )
}