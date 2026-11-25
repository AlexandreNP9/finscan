import type { ReactNode } from 'react';

type Tipo = 'erro' | 'sucesso' | 'alerta' | 'info';

const ESTILOS: Record<Tipo, string> = {
  erro: 'bg-erro-suave text-erro',
  sucesso: 'bg-sucesso-suave text-sucesso',
  alerta: 'bg-alerta-suave text-alerta',
  info: 'bg-acao-suave text-texto-2',
};

/** Mensagem inline (substitui os `alert()` nativos). Erros e alertas são anunciados a leitores de tela. */
export default function Aviso({ tipo, children, className = '' }: { tipo: Tipo; children: ReactNode; className?: string }) {
  const papel = tipo === 'erro' || tipo === 'alerta' ? 'alert' : 'status';
  return (
    <div role={papel} className={`rounded-lg px-3 py-2.5 text-[14px] leading-snug ${ESTILOS[tipo]} ${className}`}>
      {children}
    </div>
  );
}
