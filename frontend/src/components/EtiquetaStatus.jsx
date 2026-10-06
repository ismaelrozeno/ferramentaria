import { STATUS } from '../utils/rotulos.js'

function EtiquetaStatus({ status }) {
  if (!status) return null
  return (
    <span className="etiqueta-status" data-status={status}>
      {STATUS[status] ?? status}
    </span>
  )
}

export default EtiquetaStatus
