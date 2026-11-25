"use client";

import { useEffect, useState } from 'react';
import Estrutura from './Estrutura';
import EditorLista, { useListaServidor, type ChaveLista } from './EditorLista';
import Botao, { Spinner } from './Botao';
import Aviso from './Aviso';

type Props = {
  chave: ChaveLista;
  titulo: string;
  descricao: string;
  rotulo: string;
  placeholder: string;
  sugestoes?: string[];
  vazio: string;
};

/** Página de edição de uma lista do usuário (categorias ou fontes pagadoras). */
export default function PaginaLista({ chave, titulo, descricao, rotulo, placeholder, sugestoes, vazio }: Props) {
  const lista = useListaServidor(chave);
  const [salvando, setSalvando] = useState(false);
  const [resultado, setResultado] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null);

  // Avisa antes de sair da página com alterações não salvas.
  useEffect(() => {
    if (!lista.sujo) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', aviso);
    return () => window.removeEventListener('beforeunload', aviso);
  }, [lista.sujo]);

  const salvar = async () => {
    setSalvando(true);
    const erro = await lista.salvar();
    setSalvando(false);
    setResultado(erro ? { tipo: 'erro', texto: erro } : { tipo: 'sucesso', texto: 'Alterações salvas.' });
  };

  return (
    <Estrutura>
      <div className="max-w-xl">
        <h1 className="text-[24px] font-semibold tracking-tight">{titulo}</h1>
        <p className="mt-1 text-texto-2">{descricao}</p>

        <div className="mt-6">
          {lista.carregando ? (
            <p className="text-texto-3">Carregando…</p>
          ) : lista.erroCarregar ? (
            <Aviso tipo="erro">{lista.erroCarregar}</Aviso>
          ) : (
            <EditorLista
              itens={lista.itens}
              onChange={(novos) => { lista.setItens(novos); setResultado(null); }}
              rotulo={rotulo}
              placeholder={placeholder}
              sugestoes={sugestoes}
              vazio={vazio}
            />
          )}
        </div>

        {(lista.sujo || resultado) && (
          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2">
            {lista.sujo && (
              <Botao onClick={salvar} disabled={salvando}>
                {salvando ? <><Spinner /> Salvando…</> : 'Salvar alterações'}
              </Botao>
            )}
            {resultado && (
              <p role={resultado.tipo === 'erro' ? 'alert' : 'status'} className={`text-[14px] ${resultado.tipo === 'erro' ? 'text-erro' : 'text-sucesso'}`}>
                {resultado.texto}
              </p>
            )}
            {lista.sujo && !resultado && <p className="text-[14px] text-texto-3">Há alterações não salvas.</p>}
          </div>
        )}
      </div>
    </Estrutura>
  );
}
