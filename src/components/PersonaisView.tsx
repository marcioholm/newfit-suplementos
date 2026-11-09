import React, { useState } from 'react';
import { UserPlus, Building2, Phone, Tag, MessageSquare, Plus, Check, Search, ShieldCheck } from 'lucide-react';
import { Personal, Sale } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';

interface PersonaisViewProps {
  personais: Personal[];
  sales: Sale[];
  onAddPersonal: (personal: Omit<Personal, 'id' | 'createdAt'>) => void;
  onToggleActive: (id: string) => void;
}

export const PersonaisView: React.FC<PersonaisViewProps> = ({
  personais,
  sales,
  onAddPersonal,
  onToggleActive
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [gym, setGym] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');

  // Auto-generate cupom when typing name
  const handleNameChange = (val: string) => {
    setName(val);
    if (!code) {
      const first = val.trim().split(' ')[0] || '';
      setCode(first.toUpperCase().replace(/[^A-Z]/g, '') + '10');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !gym.trim()) return;

    const firstName = name.trim().split(' ')[0];
    const cleanPhone = phone.replace(/\D/g, '');

    onAddPersonal({
      name: name.trim(),
      firstName,
      gym: gym.trim(),
      phone: cleanPhone || '5543999999999',
      code: (code.trim() || firstName.toUpperCase() + '10').toUpperCase(),
      active: true,
      avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + Math.floor(Math.random() * 500)}?w=200&auto=format&fit=crop&q=80`
    });

    setName('');
    setGym('');
    setPhone('');
    setCode('');
    setIsModalOpen(false);
  };

  // Stats calculation
  const personalStats = (personalId: string) => {
    const pSales = sales.filter((s) => s.personalId === personalId);
    const volume = pSales.reduce((acc, curr) => acc + curr.value, 0);
    const points = pSales.reduce((acc, curr) => acc + curr.pointsAdded, 0);
    return { count: pSales.length, volume, points };
  };

  const filtered = personais.filter(
    (p) =>
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.gym.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6 animate-in fade-in duration-200">
      
      {/* Header com busca e botão de cadastro */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <span>Personais Trainers Parceiros</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-white/[0.08]">
              {personais.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Gestão da rede de personais credenciados, cupons e academias parceiras
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#16171B] border border-white/[0.08] focus:border-[#F5A623] rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-[#F5A623] hover:bg-[#e5971a] text-black font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-md shadow-[#F5A623]/20 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Personal</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards de Personais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((personal) => {
          const stats = personalStats(personal.id);

          return (
            <div
              key={personal.id}
              className={`bg-[#16171B] border rounded-2xl p-5 shadow-lg transition flex flex-col justify-between space-y-4 ${
                personal.active ? 'border-white/[0.08] hover:border-white/[0.18]' : 'border-red-500/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border border-white/[0.1] bg-zinc-800 shrink-0">
                    <img
                      src={
                        personal.avatarUrl ||
                        `https://api.dicebear.com/7.x/initials/svg?seed=${personal.name}`
                      }
                      alt={personal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight">
                      {personal.name}
                    </h3>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400 mt-0.5">
                      <Building2 className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{personal.gym}</span>
                    </div>
                  </div>
                </div>

                <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-800 border border-white/[0.08] text-[#F5A623]">
                  {personal.code}
                </span>
              </div>

              {/* Stats Box */}
              <div className="bg-[#121316] p-3 rounded-xl border border-white/[0.06] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">Vendas</span>
                  <span className="font-mono font-bold text-white text-sm">{stats.count}</span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">Volume</span>
                  <span className="font-mono font-semibold text-zinc-200 text-xs">
                    {formatCurrencyBRL(stats.volume)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-mono text-zinc-500 block uppercase">Pontos</span>
                  <span className="font-mono font-bold text-[#F5A623] text-sm">
                    {stats.points.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <a
                  href={`https://wa.me/${personal.phone}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chamar no WhatsApp</span>
                </a>

                <button
                  onClick={() => onToggleActive(personal.id)}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
                    personal.active
                      ? 'text-zinc-400 hover:text-red-400'
                      : 'text-red-400 hover:text-emerald-400'
                  }`}
                >
                  {personal.active ? 'Desativar' : 'Ativar'}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Modal de Cadastro de Novo Personal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#16171B] border border-white/[0.12] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95">
            
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#F5A623]" />
                <span>Cadastrar Personal Parceiro</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rodrigo Silva"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                  Academia / Studio Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: Coliseu Gym"
                  value={gym}
                  onChange={(e) => setGym(e.target.value)}
                  className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                    WhatsApp (com DDD)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: 43998213344"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-white focus:outline-none font-mono"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                    Cupom / Código
                  </label>
                  <input
                    type="text"
                    placeholder="RODRIGO10"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-[#0D0E11] border border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-white focus:outline-none font-mono font-bold uppercase text-[#F5A623]"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 rounded-xl border border-white/[0.08] text-zinc-300 hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#e5971a] text-black font-bold transition flex items-center gap-1.5 shadow"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Personal</span>
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
};

