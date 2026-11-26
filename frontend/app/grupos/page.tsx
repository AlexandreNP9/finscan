"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from '../../lib/cliente';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import Botao, { Spinner } from '../../components/Botao';
import { ChevronIcon } from '../../components/icons';
import type { DetalheGrupo, ResumoGrupo } from '../../lib/db/grupos';
import { alternarContexto } from '../../components/SeletorContexto';

const campo = 'w-full min-h-11 rounded-lg border border-linha-forte bg-superficie px-3 text-[15px] outline-none focus:border-acao';

/** "K7M2QX9P" → "K7M2-QX9P" (mais fácil de ler e ditar). */
const formatarCodigo = (codigo: string) => `${codigo.slice(0, 4)}-${codigo.slice(4)}`;

type Mensagem = { tipo: 'sucesso' | 'erro'; texto: string } | null;

export default function Grupos() {
  const [grupos, setGrupos] = useState<ResumoGrupo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregar, setErroCarregar] = useState('');
  const [abertoId, setAbertoId] = useState<number | null>(null);
  const [mensagem, setMensagem] = useState<Mensagem>(null);

  const carregar = async (abrir?: number) => {
    try {
      const res = await buscarApi('/api/grupos');
      const d = await res.json();
      if (d.sucesso) {
        setGrupos(d.grupos);
        if (abrir !== undefined) setAbertoId(abrir);
      } else {
        setErroCarregar(d.erro || 'Não foi possível carregar seus grupos.');
      }
    } catch {
      setErroCarregar('Erro de conexão.');
    }
    setCarregando(false);
  };

  useEffect(() => {
    buscarApi('/api/grupos')
      .then((res) => res.json())
      .then((d) => (d.sucesso ? setGrupos(d.grupos) : setErroCarregar(d.erro || 'Não foi possível carregar seus grupos.')))
      .catch(() => setErroCarregar('Erro de conexão.'))
      .finally(() => setCarregando(false));
  }, []);

  const aoEntrarOuCriar = (id: number, texto: string) => {
    setMensagem({ tipo: 'sucesso', texto });
    carregar(id);
  };

  return (
    <Estrutura>
      <div className="max-w-2xl">
        <h1 className="text-[24px] font-semibold tracking-tight">Grupos</h1>
        <p className="mt-1 text-texto-2">
          Divida as finanças com a família ou com quem mora com você. Cada grupo tem suas próprias compras,
          categorias e fontes pagadoras, e sua conta pessoal continua separada.
        </p>

        {mensagem && <Aviso tipo={mensagem.tipo} className="mt-6">{mensagem.texto}</Aviso>}

        <section aria-labelledby="titulo-meus-grupos" className="mt-8">
          <h2 id="titulo-meus-grupos" className="text-[15px] font-semibold">Seus grupos</h2>
          {carregando ? (
            <p className="mt-3 text-texto-3">Carregando…</p>
          ) : erroCarregar ? (
            <Aviso tipo="erro" className="mt-3">{erroCarregar}</Aviso>
          ) : grupos.length === 0 ? (
            <p className="mt-3 text-[14px] text-texto-3">Você ainda não participa de nenhum grupo. Crie um ou entre com um código.</p>
          ) : (
            <ul className="mt-2 divide-y divide-linha border-y border-linha">
              {grupos.map((g) => (
                <li key={g.id}>
                  <button
                    type="button"
                    onClick={() => setAbertoId(abertoId === g.id ? null : g.id)}
                    aria-expanded={abertoId === g.id}
                    className="w-full py-3.5 flex items-center justify-between gap-4 text-left group"
                  >
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-medium group-hover:underline underline-offset-2">{g.nome}</span>
                        {g.souHost && <Etiqueta>Host</Etiqueta>}
                        {g.finalizado && <Etiqueta>Finalizado</Etiqueta>}
                        {g.saiu && !g.finalizado && <Etiqueta>Você saiu</Etiqueta>}
                      </span>
                      <span className="block text-[13px] text-texto-3">
                        {g.membros} {g.membros === 1 ? 'membro' : 'membros'}{!g.souHost && g.host && ` · host: ${g.host}`}
                      </span>
                    </span>
                    <ChevronIcon className={`shrink-0 text-texto-3 transition-transform ${abertoId === g.id ? 'rotate-180' : ''}`} />
                  </button>
                  {abertoId === g.id && <DetalhesGrupo id={g.id} />}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <CriarGrupo aoCriar={(id, nome) => aoEntrarOuCriar(id, `Grupo "${nome}" criado. Compartilhe o código de convite com quem vai participar.`)} />
          <EntrarComCodigo aoEntrar={(id, nome) => aoEntrarOuCriar(id, `Você entrou no grupo "${nome}".`)} />
        </div>
      </div>
    </Estrutura>
  );
}

function Etiqueta({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-black/5 px-2 py-0.5 text-[12px] font-medium text-texto-2">{children}</span>;
}

function DetalhesGrupo({ id }: { id: number }) {
  const [grupo, setGrupo] = useState<DetalheGrupo | null>(null);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);

  const abrirGrupo = async () => {
    setAbrindo(true);
    const falha = await alternarContexto(id, '/');
    if (falha) { setErro(falha); setAbrindo(false); return; }
  };

  useEffect(() => {
    buscarApi(`/api/grupos/${id}`)
      .then((res) => res.json())
      .then((d) => (d.sucesso ? setGrupo(d.grupo) : setErro(d.erro || 'Não foi possível carregar o grupo.')))
      .catch(() => setErro('Erro de conexão.'));
  }, [id]);

  const copiar = async () => {
    if (!grupo?.codigoConvite) return;
    try {
      await navigator.clipboard.writeText(formatarCodigo(grupo.codigoConvite));
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setErro('Não foi possível copiar. Selecione o código e copie manualmente.');
    }
  };

  const gerarNovo = async () => {
    setGerando(true);
    setErro('');
    try {
      const res = await buscarApi(`/api/grupos/${id}/codigo`, { method: 'POST' });
      const d = await res.json();
      if (d.sucesso && grupo) setGrupo({ ...grupo, codigoConvite: d.codigo });
      else setErro(d.erro || 'Não foi possível gerar outro código.');
    } catch {
      setErro('Erro de conexão.');
    }
    setGerando(false);
  };

  if (erro && !grupo) return <Aviso tipo="erro" className="mb-4">{erro}</Aviso>;
  if (!grupo) return <p className="pb-4 text-[14px] text-texto-3">Carregando…</p>;

  return (
    <div className="pb-5 space-y-5">
      {!grupo.saiu && !grupo.finalizado && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Botao onClick={abrirGrupo} disabled={abrindo}>
            {abrindo ? <><Spinner /> Abrindo…</> : 'Abrir este grupo'}
          </Botao>
          <span className="text-[13px] text-texto-3">As telas passam a mostrar as compras do grupo.</span>
        </div>
      )}
      {grupo.codigoConvite && (
        <div className="rounded-lg bg-black/[0.03] p-4">
          <p className="text-[13px] text-texto-3">Código de convite</p>
          <p className="mt-1 font-mono text-[22px] font-semibold tracking-wider select-all">{formatarCodigo(grupo.codigoConvite)}</p>
          <p className="mt-1 text-[13px] text-texto-3">Quem receber o código entra em Grupos → Entrar com código.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Botao variante="secundario" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar código'}</Botao>
            {grupo.souHost && (
              <Botao variante="discreto" onClick={gerarNovo} disabled={gerando}>
                {gerando ? <><Spinner /> Gerando…</> : 'Gerar novo código'}
              </Botao>
            )}
          </div>
          {grupo.souHost && <p className="mt-2 text-[13px] text-texto-3">Gerar um novo código invalida o anterior.</p>}
        </div>
      )}

      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      <div>
        <h3 className="text-[14px] font-semibold">Membros</h3>
        <ul className="mt-1 divide-y divide-linha">
          {grupo.membrosLista.map((m) => (
            <li key={m.usuarioId} className="py-2 flex flex-wrap items-center gap-2 text-[15px]">
              <span className={m.saiu ? 'text-texto-3' : ''}>{m.nome}</span>
              {m.host && <Etiqueta>Host</Etiqueta>}
              {m.saiu && <span className="text-[13px] text-texto-3">saiu</span>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function CriarGrupo({ aoCriar }: { aoCriar: (id: number, nome: string) => void }) {
  const [nome, setNome] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await buscarApi('/api/grupos', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nome }) });
      const d = await res.json();
      if (d.sucesso) {
        aoCriar(d.id, nome.trim());
        setNome('');
      } else {
        setErro(d.erro || 'Não foi possível criar o grupo.');
      }
    } catch {
      setErro('Erro de conexão.');
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={criar} aria-labelledby="titulo-criar">
      <h2 id="titulo-criar" className="text-[15px] font-semibold">Criar grupo</h2>
      <p className="mt-1 text-[14px] text-texto-3">Você será o host e decide o que cada pessoa pode fazer.</p>
      <label htmlFor="nome-grupo" className="sr-only">Nome do grupo</label>
      <input
        id="nome-grupo"
        value={nome}
        onChange={(e) => { setNome(e.target.value); setErro(''); }}
        maxLength={60}
        placeholder="Ex.: Casa, Família Silva"
        className={`${campo} mt-3`}
      />
      {erro && <p role="alert" className="mt-1.5 text-[13px] text-erro">{erro}</p>}
      <Botao type="submit" disabled={enviando || !nome.trim()} className="mt-3">
        {enviando ? <><Spinner /> Criando…</> : 'Criar grupo'}
      </Botao>
    </form>
  );
}

function EntrarComCodigo({ aoEntrar }: { aoEntrar: (id: number, nome: string) => void }) {
  const [codigo, setCodigo] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');

  const entrar = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnviando(true);
    setErro('');
    try {
      const res = await buscarApi('/api/grupos/entrar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
      const d = await res.json();
      if (d.sucesso) {
        aoEntrar(d.grupo.id, d.grupo.nome);
        setCodigo('');
      } else {
        setErro(d.erro || 'Não foi possível entrar no grupo.');
      }
    } catch {
      setErro('Erro de conexão.');
    }
    setEnviando(false);
  };

  return (
    <form onSubmit={entrar} aria-labelledby="titulo-entrar">
      <h2 id="titulo-entrar" className="text-[15px] font-semibold">Entrar com código</h2>
      <p className="mt-1 text-[14px] text-texto-3">Peça o código para o host ou para quem pode convidar.</p>
      <label htmlFor="codigo-grupo" className="sr-only">Código de convite</label>
      <input
        id="codigo-grupo"
        value={codigo}
        onChange={(e) => { setCodigo(e.target.value.toUpperCase()); setErro(''); }}
        maxLength={12}
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        placeholder="XXXX-XXXX"
        className={`${campo} mt-3 font-mono tracking-wider`}
      />
      {erro && <p role="alert" className="mt-1.5 text-[13px] text-erro">{erro}</p>}
      <Botao type="submit" variante="secundario" disabled={enviando || codigo.replace(/[^A-Za-z0-9]/g, '').length < 8} className="mt-3">
        {enviando ? <><Spinner /> Entrando…</> : 'Entrar no grupo'}
      </Botao>
    </form>
  );
}
