export interface Item {
  id: number
  codigo: string
  descricao: string
  qtd: string
  un: string
  vlUnit: string
  vlTotal: string
  categoria: string
}

export interface Transacao {
  id: number
  chaveAcesso: string
  valorTotal: string
  desconto: string
  estabelecimento: string
  dataEmissao: string
  horaEmissao: string
  agenteOrigem: string
  /** Nome de quem registrou a transação ('' se ainda não atribuída). */
  usuario: string
  items: Item[]
}

/** Resposta de /api/categorizar para um item. */
export interface SugestaoItem {
  id: number
  descricaoLimpa: string
  /** Sempre uma categoria já cadastrada ('' se a IA devolveu algo fora da lista). */
  categoria: string
  /** Categoria que ainda não existe e se encaixaria melhor (opcional). */
  novaCategoria?: string
  motivo?: string
}

/** Item já categorizado que a IA propõe mover para uma categoria nova. */
export interface CandidatoRemapeamento {
  id: number
  descricao: string
  categoria: string
}
