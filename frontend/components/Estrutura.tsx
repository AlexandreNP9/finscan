"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import MenuUsuario from './MenuUsuario';
import SeletorContexto from './SeletorContexto';
import { classeBotao } from './Botao';
import { HomeIcon, ListIcon, PlusIcon, TagIcon } from './icons';

type Props = {
  children: ReactNode;
  /** Número de notas com itens sem categoria, mostrado junto ao "Categorizar" quando a página já sabe. */
  pendentes?: number;
  /** Esconde a navegação inferior do mobile (telas com rodapé de ação próprio). */
  semNavInferior?: boolean;
};

const LINKS = [
  { href: '/', rotulo: 'Visão geral', curto: 'Início', icone: <HomeIcon /> },
  { href: '/historico', rotulo: 'Histórico', curto: 'Histórico', icone: <ListIcon /> },
  { href: '/categorizar', rotulo: 'Categorizar', curto: 'Categorizar', icone: <TagIcon /> },
];

function Contador({ n }: { n?: number }) {
  if (!n) return null;
  return (
    <span className="ml-1.5 inline-flex min-w-5 h-5 px-1.5 items-center justify-center rounded-full bg-alerta-suave text-alerta text-[12px] font-semibold tabular-nums">
      {n}
    </span>
  );
}

/** Estrutura das páginas logadas: barra superior (desktop: navegação + "Registrar compra") e barra inferior no mobile. */
export default function Estrutura({ children, pendentes, semNavInferior }: Props) {
  const rota = usePathname();
  const ativo = (href: string) => (href === '/' ? rota === '/' : rota.startsWith(href));

  return (
    <div className="flex-1 flex flex-col">
      <header className="sticky top-0 z-30 bg-fundo border-b border-linha" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto w-full max-w-5xl h-16 px-4 md:px-6 flex items-center gap-3 md:gap-6">
          <Link href="/" className="text-[17px] font-semibold tracking-tight">FinScan</Link>
          <SeletorContexto />

          <nav aria-label="Principal" className="hidden md:flex items-center gap-1">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={ativo(l.href) ? 'page' : undefined}
                className={`inline-flex items-center h-10 px-3 rounded-lg text-[15px] transition-colors ${
                  ativo(l.href) ? 'text-texto font-semibold bg-black/5' : 'text-texto-2 hover:text-texto hover:bg-black/5'
                }`}
              >
                {l.rotulo}
                {l.href === '/categorizar' && <Contador n={pendentes} />}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden md:block">
              <Link href="/nova-transacao" className={classeBotao('primario')}>
                <PlusIcon /> Registrar compra
              </Link>
            </div>
            <MenuUsuario />
          </div>
        </div>
      </header>

      <main className={`mx-auto w-full max-w-5xl flex-1 px-4 md:px-6 pt-6 md:pt-8 ${semNavInferior ? 'pb-10' : 'pb-nav'}`}>
        {children}
      </main>

      {!semNavInferior && (
        <nav
          aria-label="Principal"
          className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-superficie border-t border-linha"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4 h-16">
            {LINKS.slice(0, 2).map((l) => (
              <ItemNav key={l.href} href={l.href} rotulo={l.curto} icone={l.icone} ativo={ativo(l.href)} />
            ))}
            <Link href="/nova-transacao" className="flex flex-col items-center justify-center gap-0.5 text-acao">
              <span className="w-11 h-9 rounded-lg bg-acao text-white flex items-center justify-center"><PlusIcon /></span>
              <span className="text-[11px] font-semibold">Registrar</span>
            </Link>
            <ItemNav href={LINKS[2].href} rotulo={LINKS[2].curto} icone={LINKS[2].icone} ativo={ativo(LINKS[2].href)} contador={pendentes} />
          </div>
        </nav>
      )}
    </div>
  );
}

function ItemNav({ href, rotulo, icone, ativo, contador }: { href: string; rotulo: string; icone: ReactNode; ativo: boolean; contador?: number }) {
  return (
    <Link
      href={href}
      aria-current={ativo ? 'page' : undefined}
      className={`relative flex flex-col items-center justify-center gap-0.5 text-[11px] ${ativo ? 'text-texto font-semibold' : 'text-texto-3'}`}
    >
      {icone}
      {rotulo}
      {!!contador && (
        <span className="absolute top-2 left-1/2 ml-2 min-w-4 h-4 px-1 rounded-full bg-alerta text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
          {contador}
        </span>
      )}
    </Link>
  );
}
