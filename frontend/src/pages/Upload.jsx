import { useState } from 'react'
import * as XLSX from 'xlsx'
import { bulkCreateContacts } from '../services/api'

export default function Upload({ campaignId, defaultGroup = 'General', onDone }) {
  const [contacts, setContacts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [selectedGroup, setSelectedGroup] = useState(defaultGroup)

  const GROUPS = ['General', 'VIP', 'New Customer', 'Follow-up', 'Inactive']

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setMessage('')

    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)

      console.log('Raw CSV data:', data)

      const parsed = data.map(row => ({
        name: String(row['name'] || row['Name'] || row['NAME'] || ''),
        phone: String(
          row['phone'] || row['Phone'] || row['PHONE'] ||
          row['number'] || row['Number'] || row['mobile'] ||
          row['Mobile'] || ''
        ).trim()
      })).filter(c => c.phone && c.phone.length > 0)

      console.log('Parsed contacts:', parsed)
      setContacts(parsed)

      if (parsed.length === 0) {
        setMessage('No contacts found. Make sure your CSV has "name" and "phone" columns.')
      }
    }
    reader.readAsBinaryString(file)
  }

  const handleUpload = async () => {
    if (!contacts.length) return
    setUploading(true)
    setMessage('')
    try {
      const res = await bulkCreateContacts({
        campaign_id: campaignId,
        contacts,
        group_name: selectedGroup
      })
      console.log('Upload response:', res.data)
      setMessage(`✅ ${contacts.length} contacts uploaded successfully!`)
      setContacts([])
      if (onDone) onDone()
    } catch (err) {
      console.error('Upload error:', err)
      setMessage('❌ Upload failed. Check console for details.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Group selector */}
      <div>
        <label className="block text-sm text-gray-600 mb-2">Assign to group</label>
        <div className="flex flex-wrap gap-2">
          {GROUPS.map(g => (
            <button
              key={g}
              type="button"
              onClick={() => setSelectedGroup(g)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                selectedGroup === g
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>

      {/* File upload */}
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-300 transition-colors">
        <p className="text-sm text-gray-500 mb-2">Upload CSV or Excel file</p>
        <p className="text-xs text-gray-400 mb-4">
          Required columns: <code className="bg-gray-100 px-1 rounded">name</code> and <code className="bg-gray-100 px-1 rounded">phone</code>
        </p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="text-sm text-gray-500"
        />
      </div>

      {/* Preview */}
      {contacts.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            {contacts.length} contacts found — Group: <strong>{selectedGroup}</strong>
          </p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-500 text-xs">#</th>
                  <th className="text-left px-4 py-2 text-gray-500 text-xs">Name</th>
                  <th className="text-left px-4 py-2 text-gray-500 text-xs">Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i} className="border-t border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2 text-gray-700">{c.name || '—'}</td>
                    <td className="px-4 py-2 text-gray-700">{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-3 w-full bg-indigo-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${contacts.length} contacts as "${selectedGroup}"`}
          </button>
        </div>
      )}

      {message && (
        <p className={`text-sm font-medium ${message.includes('✅') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}