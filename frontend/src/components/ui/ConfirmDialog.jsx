import { Modal } from './Modal'

export const ConfirmDialog = ({ open, onClose, onConfirm, message = '¿Estás seguro de eliminar este registro?' }) => (
  <Modal open={open} onClose={onClose} title="Confirmar eliminación" width={400}>
    <p style={{ color: 'var(--ink-2)', marginBottom: 24, lineHeight: 1.6 }}>{message}</p>
    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
      <button className="btn-table btn-table-secondary" onClick={onClose}>Cancelar</button>
      <button className="btn-table btn-table-danger" onClick={onConfirm}>Eliminar</button>
    </div>
  </Modal>
)
