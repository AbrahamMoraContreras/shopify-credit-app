// Example: Simple CRUD-like flow using Polaris web components on App Home
// - List records
// - Create a new record
// - Edit and delete

import {SetStateAction, useEffect, useState} from 'react';

export default function RecordsPage() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);

  async function loadRecords() {
    setLoading(true);
    const res = await fetch('/api/records'); // Your backend hits Postgres or another DB
    const data = await res.json();
    setRecords(data.records);
    setLoading(false);
  }

  useEffect(() => {
    loadRecords();
  }, []);

  async function handleCreate() {
    await fetch('/api/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    setName('');
    await loadRecords();
  }

    async function handleUpdate(id: number, newName: string) {
    await fetch(`/api/records/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName }),
    });
    setEditingId(null);
    await loadRecords();
  }

  async function handleDelete(id: number) {
    await fetch(`/api/records/${id}`, { method: 'DELETE' });
    await loadRecords();
  }

  return (
    <s-page heading="Local records">
      <s-section heading="Add record">
        <s-stack direction="inline" gap="small-200" alignItems="center">
          <s-text-field
            value={name}
            onChange={(event: { target: { value: SetStateAction<string>; }; }) => setName(event.target.value)}
            placeholder="Record name"
            label="Record name"
            labelAccessibilityVisibility="exclusive"
          />
          <s-button
            variant="primary"
            disabled={!name}
            onClick={handleCreate}
          >
            Create
          </s-button>
        </s-stack>
      </s-section>

      <s-section heading="Records list">
        {loading ? (
          <s-spinner accessibilityLabel="Loading records" />
        ) : (
          <s-table variant="list">
            <thead>
              <tr>
                <th>Name</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  <td>
                    {editingId === record.id ? (
                      <s-text-field
                        value={record.name}
                        onInput={(event) => {
                          const next = records.map((r) =>
                            r.id === record.id ? { ...r, name: event.target.value } : r,
                          );
                          setRecords(next);
                        }}
                        label="Edit name"
                        labelAccessibilityVisibility="exclusive"
                      />
                    ) : (
                      <s-text type="strong">{record.name}</s-text>
                    )}
                  </td>
                  <td>
                    <s-stack direction="inline" gap="small-100">
                      {editingId === record.id ? (
                        <>
                          <s-button
                            variant="primary"
                            onClick={() => handleUpdate(record.id, record.name)}
                          >
                            Save
                          </s-button>
                          <s-button
                            variant="secondary"
                            onClick={() => setEditingId(null)}
                          >
                            Cancel
                          </s-button>
                        </>
                      ) : (
                        <>
                          <s-button
                            variant="secondary"
                            onClick={() => setEditingId(record.id)}
                          >
                            Edit
                          </s-button>
                          <s-button
                            tone="critical"
                            variant="secondary"
                            onClick={() => handleDelete(record.id)}
                          >
                            Delete
                          </s-button>
                        </>
                      )}
                    </s-stack>
                  </td>
                </tr>
              ))}
            </tbody>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}