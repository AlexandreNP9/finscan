"use client";

import { useEffect, useState } from 'react';
import { buscarApi } from './cliente';

export type Privilegios = { podeRegistrar: boolean; podeEditarTodas: boolean; podeGerenciarListas: boolean; podeConvidar: boolean };

export type Contexto =
  | { tipo: 'pessoal' }
  | {
      tipo: 'grupo';
      grupoId: number;
      nome: string;
      souHost: boolean;
      privilegios: Privilegios;
      somenteLeitura: boolean;
      motivo: 'finalizado' | 'saiu' | null;
      ate: string | null;
    };

export type OpcaoGrupo = { grupoId: number; nome: string; historico: boolean };
export type DadosContexto = { contexto: Contexto; grupos: OpcaoGrupo[] };

// Uma busca por carregamento de página, compartilhada pelo cabeçalho e pelo seletor. Trocar de
// contexto recarrega a página inteira, então não há como o valor em cache ficar desatualizado.
let pendente: Promise<DadosContexto | null> | null = null;

function carregar(): Promise<DadosContexto | null> {
  pendente ??= buscarApi('/api/contexto')
    .then((res) => res.json())
    .then((d) => (d.sucesso ? { contexto: d.contexto, grupos: d.grupos } : null))
    .catch(() => null);
  return pendente;
}

/** Contexto atual (conta pessoal ou grupo, com privilégios) e os grupos para alternar; null enquanto carrega. */
export function useContexto(): DadosContexto | null {
  const [dados, setDados] = useState<DadosContexto | null>(null);
  useEffect(() => {
    let vivo = true;
    carregar().then((d) => vivo && setDados(d));
    return () => { vivo = false; };
  }, []);
  return dados;
}

/** Pode registrar compras no contexto atual? (enquanto carrega, assume que sim para não piscar.) */
export function podeRegistrarNo(dados: DadosContexto | null): boolean {
  const c = dados?.contexto;
  return !c || c.tipo === 'pessoal' || (!c.somenteLeitura && c.privilegios.podeRegistrar);
}
