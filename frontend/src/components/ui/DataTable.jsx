export const DataTable = ({ columns, data, loading, onEdit, onDelete, canWrite = true }) => {
  if (loading) return (
    <div className="table-loading">
      <div className="spinner" style={{ borderTopColor: 'var(--ink-3)', borderColor: 'var(--paper-3)' }} />
      <span>Cargando...</span>
    </div>
  )

  if (!data.length) return (
    <div className="table-empty">No hay registros aún.</div>
  )

  return (
    <div className="table-wrapper">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map(c => <th key={c.key}>{c.label}</th>)}
            {canWrite && <th style={{ width: 100, textAlign: 'center' }}>Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i}>
              {columns.map(c => (
                <td key={c.key}>
                  {c.render ? c.render(row[c.key], row) : (row[c.key] ?? '—')}
                </td>
              ))}
              {canWrite && (
                <td style={{ textAlign: 'center' }}>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <button className="btn-table btn-table-edit" onClick={() => onEdit(row)}>
                      Editar
                    </button>
                    <button className="btn-table btn-table-danger" onClick={() => onDelete(row)}>
                      Eliminar
                    </button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
