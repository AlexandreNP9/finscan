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
  items: Item[]
}
