// Ícones de traço, 24x24, herdam a cor do texto (currentColor).
const caminhos = {
  painel: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  ferramenta: (
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  ),
  balcao: (
    <>
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <path d="M8 8v8M12 8v8M16 8v8" />
    </>
  ),
  ranking: (
    <>
      <path d="M8 21h8M12 17v4" />
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
      <path d="M17 6h3v1a4 4 0 0 1-3.5 4M7 6H4v1a4 4 0 0 0 3.5 4" />
    </>
  ),
  colaboradores: (
    <>
      <circle cx="9" cy="8" r="4" />
      <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
      <path d="M16 3.5a4 4 0 0 1 0 9M22 21v-1a5 5 0 0 0-3.5-4.8" />
    </>
  ),
  cadastros: (
    <>
      <path d="M3 3h8l10 10-8 8L3 11V3z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </>
  ),
  usuarios: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  configuracoes: (
    <>
      <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0" />
      <circle cx="16" cy="6" r="2" />
      <circle cx="10" cy="12" r="2" />
      <circle cx="18" cy="18" r="2" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  fechar: <path d="M18 6 6 18M6 6l12 12" />,
}

function Icone({ nome, tamanho = 20 }) {
  return (
    <svg
      className="icone"
      width={tamanho}
      height={tamanho}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {caminhos[nome]}
    </svg>
  )
}

export default Icone
