export default function RowActions({ isEditing, onEdit, onSave, onCancel, onDelete }) {
  return (
    <div className="row-actions">
      {isEditing ? (
        <>
          <button type="button" className="btn-icon btn-save" onClick={onSave} title="Save changes">
            Save
          </button>
          <button type="button" className="btn-icon btn-cancel" onClick={onCancel} title="Cancel editing">
            Cancel
          </button>
        </>
      ) : (
        <>
          <button type="button" className="btn-icon btn-edit" onClick={onEdit} title="Edit row">
            Edit
          </button>
          <button type="button" className="btn-danger" onClick={onDelete} title="Delete row">
            ×
          </button>
        </>
      )}
    </div>
  )
}
