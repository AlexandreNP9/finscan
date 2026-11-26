"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from '../../lib/cliente';
import Estrutura from '../../components/Estrutura';
import Aviso from '../../components/Aviso';
import Botao, { Spinner } from '../../components/Botao';
import { ChevronIcon } from '../../components/icons';
import type { DetalheGrupo, MembroGrupo, Privilegios, ResumoGrupo } from '../../lib/db/grupos';
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
                  {abertoId === g.id && <DetalhesGrupo id={g.id} aoMudar={() => carregar()} />}
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

const ROTULOS_PRIVILEGIOS: { chave: keyof Privilegios; rotulo: string }[] = [
  { chave: 'podeRegistrar', rotulo: 'Registrar compras' },
  { chave: 'podeEditarTodas', rotulo: 'Editar e categorizar compras de todos' },
  { chave: 'podeGerenciarListas', rotulo: 'Gerenciar categorias, fontes pagadoras e objetivo' },
  { chave: 'podeConvidar', rotulo: 'Ver e compartilhar o código de convite' },
];

/** POST/PUT/DELETE simples; devolve a mensagem de erro ou null. */
async function enviar(url: string, method: string, corpo?: unknown): Promise<string | null> {
  try {
    const res = await buscarApi(url, {
      method,
      headers: corpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: corpo === undefined ? undefined : JSON.stringify(corpo),
    });
    const d = await res.json().catch(() => null);
    return res.ok && d?.sucesso ? null : d?.erro || 'Não foi possível concluir.';
  } catch {
    return 'Erro de conexão.';
  }
}

function DetalhesGrupo({ id, aoMudar }: { id: number; aoMudar: () => void }) {
  const [grupo, setGrupo] = useState<DetalheGrupo | null>(null);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [copiado, setCopiado] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);

  const recarregar = () =>
    buscarApi(`/api/grupos/${id}`)
      .then((res) => res.json())
      .then((d) => (d.sucesso ? setGrupo(d.grupo) : setErro(d.erro || 'Não foi possível carregar o grupo.')))
      .catch(() => setErro('Erro de conexão.'));

  useEffect(() => {
    buscarApi(`/api/grupos/${id}`)
      .then((res) => res.json())
      .then((d) => (d.sucesso ? setGrupo(d.grupo) : setErro(d.erro || 'Não foi possível carregar o grupo.')))
      .catch(() => setErro('Erro de conexão.'));
  }, [id]);

  /** Executa uma ação de gestão e atualiza o detalhe (e a lista, que mostra etiquetas e contagem). */
  const agir = async (acao: () => Promise<string | null>, sucesso: string) => {
    setOcupado(true);
    setErro('');
    setAviso('');
    const falha = await acao();
    if (falha) setErro(falha);
    else {
      setAviso(sucesso);
      await recarregar();
      aoMudar();
    }
    setOcupado(false);
  };

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
    setOcupado(true);
    setErro('');
    try {
      const res = await buscarApi(`/api/grupos/${id}/codigo`, { method: 'POST' });
      const d = await res.json();
      if (d.sucesso && grupo) setGrupo({ ...grupo, codigoConvite: d.codigo });
      else setErro(d.erro || 'Não foi possível gerar outro código.');
    } catch {
      setErro('Erro de conexão.');
    }
    setOcupado(false);
  };

  const abrir = async () => {
    setOcupado(true);
    const falha = await alternarContexto(id, '/');
    if (falha) { setErro(falha); setOcupado(false); }
  };

  if (erro && !grupo) return <Aviso tipo="erro" className="mb-4">{erro}</Aviso>;
  if (!grupo) return <p className="pb-4 text-[14px] text-texto-3">Carregando…</p>;

  const ativo = !grupo.saiu && !grupo.finalizado;
  const gerenciar = ativo && grupo.souHost;

  return (
    <div className="pb-5 space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Botao onClick={abrir} disabled={ocupado} variante={ativo ? 'primario' : 'secundario'}>
          {ativo ? 'Abrir este grupo' : 'Abrir para consulta'}
        </Botao>
        <span className="text-[13px] text-texto-3">
          {ativo
            ? 'As telas passam a mostrar as compras do grupo.'
            : grupo.finalizado
              ? 'O grupo foi finalizado: dá para consultar o histórico.'
              : 'Você saiu: dá para consultar o que foi registrado até a sua saída.'}
        </span>
      </div>

      {aviso && <Aviso tipo="sucesso">{aviso}</Aviso>}
      {erro && <Aviso tipo="erro">{erro}</Aviso>}

      {grupo.codigoConvite && (
        <div className="rounded-lg bg-black/[0.03] p-4">
          <p className="text-[13px] text-texto-3">Código de convite</p>
          <p className="mt-1 font-mono text-[22px] font-semibold tracking-wider select-all">{formatarCodigo(grupo.codigoConvite)}</p>
          <p className="mt-1 text-[13px] text-texto-3">Quem receber o código entra em Grupos → Entrar com código.</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Botao variante="secundario" onClick={copiar}>{copiado ? 'Copiado!' : 'Copiar código'}</Botao>
            {grupo.souHost && (
              <Botao variante="discreto" onClick={gerarNovo} disabled={ocupado}>Gerar novo código</Botao>
            )}
          </div>
          {grupo.souHost && <p className="mt-2 text-[13px] text-texto-3">Gerar um novo código invalida o anterior.</p>}
        </div>
      )}

      {ativo && !grupo.souHost && (
        <div>
          <h3 className="text-[14px] font-semibold">O que você pode fazer</h3>
          <ul className="mt-1 space-y-0.5 text-[14px]">
            <li className="text-texto-2">✓ Ver as compras do grupo</li>
            {ROTULOS_PRIVILEGIOS.map((p) => (
              <li key={p.chave} className={grupo.privilegios[p.chave] ? 'text-texto-2' : 'text-texto-3 line-through'}>
                {grupo.privilegios[p.chave] ? '✓' : '✗'} {p.rotulo}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[13px] text-texto-3">Quem define isso é o host{grupo.host ? ` (${grupo.host})` : ''}.</p>
        </div>
      )}

      <div>
        <h3 className="text-[14px] font-semibold">Membros</h3>
        <ul className="mt-1 divide-y divide-linha">
          {grupo.membrosLista.map((m) => (
            <li key={m.usuarioId} className="py-2">
              <div className="flex flex-wrap items-center gap-2 text-[15px]">
                <span className={m.saiu ? 'text-texto-3' : ''}>{m.nome}</span>
                {m.host && <Etiqueta>Host</Etiqueta>}
                {m.saiu && <span className="text-[13px] text-texto-3">saiu</span>}
              </div>
              {gerenciar && !m.host && !m.saiu && (
                <EditorMembro
                  membro={m}
                  ocupado={ocupado}
                  aoSalvar={(privilegios) => agir(() => enviar(`/api/grupos/${id}/membros/${m.usuarioId}`, 'PUT', { privilegios }), `Privilégios de ${m.nome} atualizados.`)}
                  aoTornarHost={() => agir(() => enviar(`/api/grupos/${id}/transferir`, 'POST', { usuarioId: m.usuarioId }), `${m.nome} agora é o host do grupo.`)}
                  aoRemover={() => agir(() => enviar(`/api/grupos/${id}/membros/${m.usuarioId}`, 'DELETE'), `${m.nome} foi removido do grupo.`)}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      {ativo && (
        <div className="border-t border-linha pt-4">
          {!confirmarSaida ? (
            <Botao variante="perigoDiscreto" onClick={() => setConfirmarSaida(true)}>Sair do grupo</Botao>
          ) : (
            <div className="rounded-lg border border-erro/30 bg-erro-suave p-3 text-[14px]">
              <p className="font-medium text-erro">
                {grupo.souHost ? 'Sair e finalizar o grupo?' : 'Sair do grupo?'}
              </p>
              <p className="mt-1 text-texto-2">
                {grupo.souHost
                  ? 'Você é o host. Se sair sem passar o papel para outra pessoa, o grupo será finalizado para todos e ficará só para consulta. Para manter o grupo, use "Tornar host" em um membro antes.'
                  : 'Você deixa de registrar e editar no grupo. Continuará vendo, só para consulta, o que foi registrado até hoje.'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Botao
                  onClick={() => agir(() => enviar(`/api/grupos/${id}/sair`, 'POST'), grupo.souHost ? 'Você saiu e o grupo foi finalizado.' : 'Você saiu do grupo.').then(() => setConfirmarSaida(false))}
                  disabled={ocupado}
                  variante="perigo"
                >
                  {ocupado ? <><Spinner /> Saindo…</> : grupo.souHost ? 'Sair e finalizar' : 'Sair do grupo'}
                </Botao>
                <Botao variante="discreto" onClick={() => setConfirmarSaida(false)} disabled={ocupado}>Cancelar</Botao>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PropsEditor = {
  membro: MembroGrupo;
  ocupado: boolean;
  aoSalvar: (p: Privilegios) => void;
  aoTornarHost: () => void;
  aoRemover: () => void;
};

/** Controles do host para um membro: privilégios, passar o papel de host e remover (com confirmação). */
function EditorMembro({ membro, ocupado, aoSalvar, aoTornarHost, aoRemover }: PropsEditor) {
  const [privilegios, setPrivilegios] = useState<Privilegios>(membro.privilegios);
  const [confirmar, setConfirmar] = useState<'host' | 'remover' | null>(null);
  const mudou = ROTULOS_PRIVILEGIOS.some((p) => privilegios[p.chave] !== membro.privilegios[p.chave]);

  return (
    <div className="mt-2 ml-0.5 space-y-3">
      <fieldset>
        <legend className="sr-only">Privilégios de {membro.nome}</legend>
        <div className="grid gap-1 sm:grid-cols-2">
          {ROTULOS_PRIVILEGIOS.map((p) => (
            <label key={p.chave} className="flex items-start gap-2 text-[14px] text-texto-2 cursor-pointer min-h-8">
              <input
                type="checkbox"
                checked={privilegios[p.chave]}
                onChange={(e) => setPrivilegios({ ...privilegios, [p.chave]: e.target.checked })}
                className="mt-0.5 h-4 w-4 accent-acao"
              />
              {p.rotulo}
            </label>
          ))}
        </div>
      </fieldset>

      {confirmar ? (
        <div className="rounded-lg bg-black/[0.03] p-3 text-[14px]">
          <p className="text-texto-2">
            {confirmar === 'host'
              ? `${membro.nome} passa a ser o host, com todos os privilégios. Você continua no grupo e poderá sair sem finalizá-lo.`
              : `${membro.nome} sai do grupo e passa a ver só o que foi registrado até agora, para consulta.`}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Botao onClick={() => { setConfirmar(null); if (confirmar === 'host') aoTornarHost(); else aoRemover(); }} disabled={ocupado}>
              {confirmar === 'host' ? `Tornar ${membro.nome} host` : `Remover ${membro.nome}`}
            </Botao>
            <Botao variante="discreto" onClick={() => setConfirmar(null)}>Cancelar</Botao>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {mudou && <Botao variante="secundario" onClick={() => aoSalvar(privilegios)} disabled={ocupado}>Salvar privilégios</Botao>}
          <Botao variante="discreto" onClick={() => setConfirmar('host')} disabled={ocupado}>Tornar host</Botao>
          <Botao variante="perigoDiscreto" onClick={() => setConfirmar('remover')} disabled={ocupado}>Remover</Botao>
        </div>
      )}
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
