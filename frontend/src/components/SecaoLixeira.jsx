import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useConfiguracoes } from '../contexto/configuracoes.js'
import { api } from '../services/api.js'
import Confirmacao from './Confirmacao.jsx'

// Só liga e desliga. A lista do que foi excluído fica na página Lixeira, no menu.
function SecaoLixeira() {
  const queryClient = useQueryClient()
  const { lixeiraAtiva } = useConfiguracoes()
  const [desligando, setDesligando] = useState(false)

  const mudar = useMutation({
    mutationFn: (ligada) => api.patch('/configuracoes', { lixeiraAtiva: ligada }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['configuracoes'] }),
    onSettled: () => setDesligando(false),
  })

  return (
    <section className="card secao-cadastro secao-config" aria-labelledby="titulo-lixeira">
      <h2 id="titulo-lixeira">Lixeira</h2>

      <label className="opcao">
        <input
          type="checkbox"
          checked={lixeiraAtiva}
          disabled={mudar.isPending}
          onChange={(e) => (e.target.checked ? mudar.mutate(true) : setDesligando(true))}
        />
        <span>
          <strong>Usar a lixeira</strong>
          {lixeiraAtiva
            ? 'Ligada: o botão Excluir envia para a lixeira, e dá para restaurar.'
            : 'Desligada: o botão Excluir apaga de vez, depois de perguntar, e a página Lixeira fica escondida.'}
        </span>
      </label>

      {mudar.isError && (
        <p className="mensagem-erro" role="alert">
          {mudar.error.message}
        </p>
      )}

      <Confirmacao
        aberta={desligando}
        titulo="Desligar a lixeira?"
        mensagem="Com a lixeira desligada, o botão Excluir apaga de vez e não dá para desfazer. A página Lixeira some do menu; o que já está nela volta a aparecer quando você ligar de novo."
        textoConfirmar="Desligar a lixeira"
        perigo
        carregando={mudar.isPending}
        aoCancelar={() => setDesligando(false)}
        aoConfirmar={() => mudar.mutate(false)}
      />
    </section>
  )
}

export default SecaoLixeira
