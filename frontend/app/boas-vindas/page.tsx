"use client";

import { useState } from 'react';
import EditorLista, { useListaServidor } from '../../components/EditorLista';
import Botao, { Spinner } from '../../components/Botao';
import Aviso from '../../components/Aviso';
import { SUGESTOES_AGENTES } from '../../lib/sugestoes';

/**
 * Onboarding mostrado logo depois do cadastro (FormularioAuth redireciona para cá).
 * Não guarda estado no banco: as categorias padrão já foram criadas no cadastro e, se o usuário
 * pular as fontes pagadoras, a tela de nova compra continua avisando com link para /agentes.
 */
export default function BoasVindas() {
  const [etapa, setEtapa] = useState<1 | 2>(1);

  return (
    <main className="flex-1 px-4 py-8 md:py-14">
      <div className="mx-auto w-full max-w-xl">
        <p className="text-[17px] font-semibold tracking-tight">FinScan</p>

        <div className="mt-8" aria-label={`Etapa ${etapa} de 2`}>
          <p className="text-[13px] text-texto-3">Etapa {etapa} de 2</p>
          <div className="mt-2 grid grid-cols-2 gap-1.5" aria-hidden>
            <span className="h-1 rounded-full bg-acao" />
            <span className={`h-1 rounded-full transition-colors ${etapa === 2 ? 'bg-acao' : 'bg-linha'}`} />
          </div>
        </div>

        {etapa === 1 ? <EtapaCategorias onContinuar={() => setEtapa(2)} /> : <EtapaAgentes />}
      </div>
    </main>
  );
}

function EtapaCategorias({ onContinuar }: { onContinuar: () => void }) {
  const lista = useListaServidor('categorias');
  const [personalizando, setPersonalizando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const salvarEContinuar = async () => {
    if (!lista.sujo) return onContinuar();
    setSalvando(true);
    const mensagem = await lista.salvar();
    setSalvando(false);
    if (mensagem) setErro(mensagem);
    else onContinuar();
  };

  return (
    <section className="mt-6">
      <h1 className="text-[24px] font-semibold tracking-tight">Confira suas categorias</h1>
      <p className="mt-2 text-texto-2">
        {lista.carregando
          ? 'Carregando…'
          : `Já deixamos ${lista.itens.length} categorias prontas. A IA usa esta lista para organizar os itens das suas notas.`}
      </p>

      {lista.erroCarregar && <Aviso tipo="erro" className="mt-4">{lista.erroCarregar}</Aviso>}

      {!lista.carregando && !lista.erroCarregar && (
        personalizando ? (
          <div className="mt-6">
            <EditorLista
              itens={lista.itens}
              onChange={(novos) => { lista.setItens(novos); setErro(''); }}
              rotulo="Nova categoria"
              placeholder="Ex.: Pet Shop"
              vazio="Nenhuma categoria. Adicione pelo menos uma."
            />
          </div>
        ) : (
          <ul className="mt-6 flex flex-wrap gap-2">
            {lista.itens.map((c) => (
              <li key={c} className="rounded-full bg-black/5 px-3 py-1.5 text-[14px] text-texto-2">{c}</li>
            ))}
          </ul>
        )
      )}

      {erro && <Aviso tipo="erro" className="mt-4">{erro}</Aviso>}

      <div className="mt-8 flex flex-col-reverse sm:flex-row sm:items-center gap-3">
        {personalizando ? (
          <Botao onClick={salvarEContinuar} disabled={salvando || lista.itens.length === 0} className="min-h-12 sm:px-6">
            {salvando ? <><Spinner /> Salvando…</> : 'Salvar e continuar'}
          </Botao>
        ) : (
          <>
            <Botao onClick={onContinuar} disabled={lista.carregando || !!lista.erroCarregar} className="min-h-12 sm:px-6">
              Aceitar e continuar
            </Botao>
            <Botao variante="secundario" onClick={() => setPersonalizando(true)} disabled={lista.carregando || !!lista.erroCarregar} className="min-h-12">
              Personalizar agora
            </Botao>
          </>
        )}
      </div>
    </section>
  );
}

function EtapaAgentes() {
  const lista = useListaServidor('agentes');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  // Navegação completa para o dashboard começar do zero com os dados novos.
  const irParaInicio = () => window.location.replace('/');

  const concluir = async () => {
    setSalvando(true);
    const mensagem = await lista.salvar();
    setSalvando(false);
    if (mensagem) setErro(mensagem);
    else irParaInicio();
  };

  return (
    <section className="mt-6">
      <h1 className="text-[24px] font-semibold tracking-tight">De onde sai o dinheiro?</h1>
      <p className="mt-2 text-texto-2">
        Cadastre pelo menos uma fonte pagadora: uma conta, um cartão ou dinheiro. Você escolhe uma delas ao registrar cada compra.
      </p>

      {lista.erroCarregar && <Aviso tipo="erro" className="mt-4">{lista.erroCarregar}</Aviso>}

      {!lista.carregando && !lista.erroCarregar && (
        <div className="mt-6">
          <EditorLista
            itens={lista.itens}
            onChange={(novos) => { lista.setItens(novos); setErro(''); }}
            rotulo="Nome da fonte pagadora"
            placeholder="Ex.: Cartão Inter"
            sugestoes={SUGESTOES_AGENTES}
            vazio="Toque numa sugestão ou digite um nome."
          />
        </div>
      )}

      {erro && <Aviso tipo="erro" className="mt-4">{erro}</Aviso>}

      <div className="mt-8 flex flex-col sm:flex-row sm:items-center gap-3">
        <Botao onClick={concluir} disabled={salvando || lista.itens.length === 0} className="min-h-12 sm:px-6">
          {salvando ? <><Spinner /> Salvando…</> : 'Concluir'}
        </Botao>
        <button
          type="button"
          onClick={irParaInicio}
          className="min-h-11 px-2 text-[15px] text-texto-3 underline underline-offset-2 hover:text-texto-2 self-center sm:self-auto"
        >
          Fazer isso depois
        </button>
      </div>
    </section>
  );
}
