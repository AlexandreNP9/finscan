import Link from 'next/link';
import type { ButtonHTMLAttributes, ComponentProps } from 'react';

type Variante = 'primario' | 'secundario' | 'discreto';

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-[15px] min-h-11 px-4 transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANTES: Record<Variante, string> = {
  primario: 'bg-acao text-white hover:bg-acao-escura',
  secundario: 'bg-superficie text-texto border border-linha-forte hover:bg-fundo',
  discreto: 'text-texto-2 hover:text-texto hover:bg-black/5',
};

export function classeBotao(variante: Variante = 'primario', extra = '') {
  return `${BASE} ${VARIANTES[variante]} ${extra}`;
}

type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & { variante?: Variante };

export default function Botao({ variante = 'primario', className = '', type = 'button', ...props }: PropsBotao) {
  return <button type={type} className={classeBotao(variante, className)} {...props} />;
}

type PropsLink = ComponentProps<typeof Link> & { variante?: Variante };

export function LinkBotao({ variante = 'primario', className = '', ...props }: PropsLink) {
  return <Link className={classeBotao(variante, className)} {...props} />;
}

export function Spinner() {
  return <span aria-hidden className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />;
}
