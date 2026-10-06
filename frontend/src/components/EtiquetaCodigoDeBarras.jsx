import JsBarcode from 'jsbarcode'
import { useEffect, useRef } from 'react'

// Etiqueta para colar na ferramenta: código de barras Code 128 lido no balcão.
function EtiquetaCodigoDeBarras({ codigo, nome }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!svgRef.current) return
    JsBarcode(svgRef.current, codigo, {
      format: 'CODE128',
      width: 2,
      height: 64,
      margin: 0,
      displayValue: true,
      font: 'Inter, sans-serif',
      fontSize: 16,
      textMargin: 6,
      background: '#ffffff',
      lineColor: '#000000',
    })
  }, [codigo])

  return (
    <div className="etiqueta-impressao">
      <p className="etiqueta-marca">Ferrum</p>
      <p className="etiqueta-nome">{nome}</p>
      <svg ref={svgRef} role="img" aria-label={`Código de barras ${codigo}`} />
    </div>
  )
}

export default EtiquetaCodigoDeBarras
