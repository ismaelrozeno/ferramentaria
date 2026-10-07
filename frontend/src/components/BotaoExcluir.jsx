import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../contexto/auth.js'
import { useConfiguracoes } from '../contexto/configuracoes.js'
import { api } from '../services/api.js'
import Confirmacao from './Confirmacao.jsx'

// Botão Excluir (só para administrador). Com a lixeira ligada o registro vai para ela;
// desligada, é apagado de vez. Sempre pergunta antes.
function BotaoExcluir({ tipo, id, nome, rotulo = 'Excluir', pequeno = true, aoConcluir }) {
  const { ehAdmin } = useAuth()
  const { lixeiraAtiva } = useConfiguracoes()
  const queryClient = useQueryClient()
  const [aberta, setAberta] = useState(false)

  const excluir = useMutation({
    mutationFn: () => api.post(`/lixeira/${tipo}/${encodeURIComponent(id)}/excluir`),
    onSuccess: () => {
      queryClient.invalidateQueries()
      aoConcluir?.()
    },
    onSettled: () => setAberta(false),
  })

  if (!ehAdmin) return null

  return (
    <>
      <button
        type="button"
        className={`botao botao-perigo${pequeno ? ' botao-pequeno' : ''}`}
        disabled={excluir.isPending}
        onClick={() => {
          excluir.reset()
          setAberta(true)
        }}
      >
        {rotulo}
      </button>
      {excluir.isError && (
        <span className="mensagem-erro erro-excluir" role="alert">
          {excluir.error.message}
        </span>
      )}
      <Confirmacao
        aberta={aberta}
        titulo={lixeiraAtiva ? 'Enviar para a lixeira?' : `Apagar ${nome} de vez?`}
        mensagem={
          lixeiraAtiva
            ? `${nome} sai das listas, mas você pode restaurar depois na página Lixeira, no menu.`
            : `${nome} será apagado e não dá para desfazer. O histórico de movimentações continua guardado.`
        }
        textoConfirmar={lixeiraAtiva ? 'Enviar para a lixeira' : 'Apagar de vez'}
        perigo
        carregando={excluir.isPending}
        aoCancelar={() => setAberta(false)}
        aoConfirmar={() => excluir.mutate()}
      />
    </>
  )
}

export default BotaoExcluir
