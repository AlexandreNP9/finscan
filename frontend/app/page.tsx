import Link from 'next/link';

// Ícones minimalistas para os botões
const ScanIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><circle cx="12" cy="12" r="3"/></svg> );
const TagIcon = () => ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg> );
const WalletIcon = () => ( <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg> );
const SparkleIcon = () => ( <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.09 6.26L20 10l-5.91 1.74L12 18l-2.09-6.26L4 10l5.91-1.74L12 2z" /></svg> );

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-[#f4f5f7] p-4 md:p-8 flex justify-center">
      <div className="w-full max-w-[430px] md:max-w-[960px] flex flex-col gap-6 pb-8">
        
        {/* Cabeçalho */}
        <header className="pt-4">
          <h1 className="text-[22px] font-bold text-[#111827]">Visão Geral</h1>
          <p className="text-[13px] text-[#6b7280]">Outubro de 2026</p>
        </header>

        {/* Card Analítico Principal */}
        <section className="bg-[#111827] rounded-2xl p-6 shadow-lg text-white">
          <p className="text-[12px] text-gray-400 font-medium uppercase tracking-wider mb-1">Gasto no Mês</p>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-lg">R$</span>
            <span className="text-4xl font-bold font-mono">1.240,50</span>
          </div>
          
          {/* Mock de gráfico de barras de categorias */}
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-300">Alimentação</span><span className="font-mono">R$ 850,00</span></div>
              <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-blue-400 h-1.5 rounded-full w-[65%]"></div></div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] mb-1"><span className="text-gray-300">Transporte</span><span className="font-mono">R$ 210,00</span></div>
              <div className="w-full bg-white/10 rounded-full h-1.5"><div className="bg-purple-400 h-1.5 rounded-full w-[25%]"></div></div>
            </div>
          </div>
        </section>

        {/* ======================================= */}
        {/* BLOCO CENTRAL DE AÇÕES (Desmembrado)      */}
        {/* ======================================= */}
        <div className="flex flex-col gap-3">
          
          {/* 1. Captura (Atrito Zero) */}
          <Link href="/nova-transacao" className="bg-[#1d4ed8] text-white rounded-2xl p-5 shadow-lg shadow-[#1d4ed8]/25 flex items-center justify-between hover:bg-[#1e40af] active:scale-[0.98] transition-all">
            <div>
              <h2 className="text-[16px] font-bold">Registrar Novo Gasto</h2>
              <p className="text-[12px] text-white/80 mt-0.5">Escanear nota ou digitar chave</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <ScanIcon />
            </div>
          </Link>

          {/* 2. Processamento (A Caixa de Entrada da IA) */}
          <Link href="/categorizar" className="bg-white border border-[#e8eaed] text-[#111827] rounded-2xl p-5 shadow-sm flex items-center justify-between hover:border-[#7c3aed] active:scale-[0.98] transition-all relative overflow-hidden group">
            {/* Aviso visual de pendências (simulado) */}
            <div className="absolute top-5 right-16 flex items-center gap-1.5 bg-orange-100 text-orange-700 text-[10px] font-bold px-2 py-0.5 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse"></span>
              3 pendentes
            </div>
            
            <div className="relative z-10">
              <h2 className="text-[16px] font-bold">Categorizar Produtos</h2>
              <p className="text-[12px] text-[#6b7280] mt-0.5">Organizar compras usando a IA</p>
            </div>
            <div className="w-12 h-12 bg-[#faf5ff] text-[#7c3aed] group-hover:bg-[#7c3aed] group-hover:text-white rounded-full flex items-center justify-center transition-colors">
              <SparkleIcon />
            </div>
          </Link>

        </div>

        {/* Ações Secundárias (Gestão) */}
        <div className="grid grid-cols-2 gap-4 mt-2">
          <Link href="/categorias" className="bg-white border border-[#e8eaed] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#111827] active:scale-[0.98] transition-all">
            <div className="w-8 h-8 bg-[#f4f5f7] rounded-lg flex items-center justify-center text-[#6b7280]">
              <TagIcon />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111827]">Categorias</h3>
              <p className="text-[10px] text-[#6b7280] mt-0.5">Gerenciar regras</p>
            </div>
          </Link>

          <Link href="/agentes" className="bg-white border border-[#e8eaed] rounded-2xl p-4 flex flex-col gap-3 hover:border-[#111827] active:scale-[0.98] transition-all">
            <div className="w-8 h-8 bg-[#f4f5f7] rounded-lg flex items-center justify-center text-[#6b7280]">
              <WalletIcon />
            </div>
            <div>
              <h3 className="text-[13px] font-bold text-[#111827]">Pagadores</h3>
              <p className="text-[10px] text-[#6b7280] mt-0.5">Contas e cartões</p>
            </div>
          </Link>
        </div>

      </div>
    </div>
  );
}