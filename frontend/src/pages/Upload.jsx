import { useState } from 'react'
import * as XLSX from 'xlsx'
import { bulkCreateContacts } from '../services/api'

export default function Upload({ campaignId, onDone }) {
  const [contacts, setContacts] = useState([])
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  const handleFile = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target.result, { type: 'binary' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const data = XLSX.utils.sheet_to_json(ws)
      const parsed = data.map(row => ({
        name: row['name'] || row['Name'] || '',
        phone: String(row['phone'] || row['Phone'] || row['number'] || row['Number'] || '')
      })).filter(c => c.phone)
      setContacts(parsed)
    }
    reader.readAsBinaryString(file)
  }

  const handleUpload = async () => {
    if (!contacts.length) return
    setUploading(true)
    try {
      await bulkCreateContacts({ campaign_id: campaignId, contacts })
      setMessage(`${contacts.length} contacts uploaded successfully!`)
      if (onDone) onDone()
    } catch (err) {
      setMessage('Upload failed. Try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center">
        <p className="text-sm text-gray-500 mb-3">Upload CSV or Excel file</p>
        <p className="text-xs text-gray-400 mb-4">File must have columns: <code>name</code> and <code>phone</code></p>
        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="text-sm"
        />
      </div>

      {contacts.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">{contacts.length} contacts found:</p>
          <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-gray-600">#</th>
                  <th className="text-left px-4 py-2 text-gray-600">Name</th>
                  <th className="text-left px-4 py-2 text-gray-600">Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2">{c.name || '—'}</td>
                    <td className="px-4 py-2">{c.phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleUpload}
            disabled={uploading}
            className="mt-3 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            {uploading ? 'Uploading...' : `Upload ${contacts.length} contacts`}
          </button>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.includes('success') ? 'text-green-600' : 'text-red-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}