// src/components/Kpi.jsx
// Card de indicador (rótulo, valor e dica), igual ao componente "KPI Card" do Figma.
export function Kpi({ rotulo, valor, dica, destaque = false, corValor }) {
  return (
    <div className={`card kpi ${destaque ? 'kpi-destaque' : ''}`}>
      <span className="kpi-rotulo">{rotulo}</span>
      <span className={`kpi-valor ${corValor ?? ''}`}>{valor}</span>
      {dica && <span className="kpi-dica">{dica}</span>}
    </div>
  );
}
