import React, { useRef, useState } from 'react';
import { 
  UserPlus, 
  Building2, 
  Phone, 
  Tag, 
  MessageSquare, 
  Plus, 
  Check, 
  Search, 
  ShieldCheck, 
  Copy, 
  ExternalLink, 
  Trophy,
  ArrowUpRight,
  TrendingUp,
  X,
  AlertCircle,
  Camera,
  Trash2,
  Loader2
} from 'lucide-react';
import { Personal, Sale } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';
import { resizeImageToAvatar, avatarSrc } from '../services/imageService';

/**
 * Seletor de foto: no celular abre câmera ou galeria; recorta e comprime a imagem.
 */
const PhotoPicker: React.FC<{
  name: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
  size?: 'md' | 'lg';
}> = ({ name, value, onChange, size = 'lg' }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      onChange(await resizeImageToAvatar(file));
    } catch (e: any) {
      setError(e?.message || 'Não foi possível usar esta foto.');
    } finally {
      setIsProcessing(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const box = size === 'lg' ? 'w-20 h-20' : 'w-14 h-14';

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`${box} rounded-2xl overflow-hidden border-2 border-dashed border-white/[0.18] hover:border-[#F5A623] bg-[#0D0E11] shrink-0 relative group transition`}
        aria-label={value ? 'Trocar foto' : 'Adicionar foto'}
      >
        {value ? (
          <img src={value} alt={name || 'Foto do personal'} className="w-full h-full object-cover" />
        ) : (
          <span className="w-full h-full flex flex-col items-center justify-center text-zinc-500 group-hover:text-[#F5A623]">
            <Camera className="w-5 h-5" />
            <span className="text-[9px] font-semibold mt-1 uppercase tracking-wider">Foto</span>
          </span>
        )}
        {isProcessing && (
          <span className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[#F5A623] animate-spin" />
          </span>
        )}
      </button>

      <div className="space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isProcessing}
            className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-[11px] font-semibold border border-white/[0.1] transition flex items-center gap-1.5"
          >
            <Camera className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>{value ? 'Trocar foto' : 'Adicionar foto'}</span>
          </button>
          {value && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              disabled={isProcessing}
              className="px-2.5 py-1.5 text-zinc-400 hover:text-red-400 rounded-lg text-[11px] font-semibold transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Remover</span>
            </button>
          )}
        </div>
        <p className="text-[10px] text-zinc-500">
          {error ? <span className="text-red-400">{error}</span> : 'Opcional. Aparece no ranking e no Modo TV.'}
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
};

interface PersonaisViewProps {
  personais: Personal[];
  sales: Sale[];
  onAddPersonal: (personal: Omit<Personal, 'id' | 'createdAt'>) => void;
  onToggleActive: (id: string) => void;
  onUpdatePersonal: (id: string, changes: Partial<Omit<Personal, 'id' | 'createdAt'>>) => void;
}

export const PersonaisView: React.FC<PersonaisViewProps> = ({
  personais,
  sales,
  onAddPersonal,
  onToggleActive,
  onUpdatePersonal
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPersonalDetail, setSelectedPersonalDetail] = useState<Personal | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [gym, setGym] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [photo, setPhoto] = useState<string | undefined>(undefined);
  const [phoneError, setPhoneError] = useState<string | null>(null);

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
    setPhoneError(null);
    if (!name.trim() || !gym.trim()) return;

    // Apenas dígitos
    let cleanPhone = phone.replace(/\D/g, '');

    // Validação: entre 10 e 13 dígitos
    if (cleanPhone.length < 10 || cleanPhone.length > 13) {
      setPhoneError('Telefone inválido. Digite entre 10 e 13 dígitos (com DDD).');
      return;
    }

    // Se tiver 10 ou 11 dígitos, prefixe '55'
    if (cleanPhone.length === 10 || cleanPhone.length === 11) {
      cleanPhone = '55' + cleanPhone;
    }

    const firstName = name.trim().split(' ')[0];

    onAddPersonal({
      name: name.trim(),
      firstName,
      gym: gym.trim(),
      phone: cleanPhone,
      code: (code.trim() || firstName.toUpperCase() + '10').toUpperCase(),
      active: true,
      avatarUrl: photo
    });

    setName('');
    setPhoto(undefined);
    setGym('');
    setPhone('');
    setCode('');
    setPhoneError(null);
    setIsModalOpen(false);
  };

  // Stats calculation
  const personalStats = (personalId: string) => {
    const pSales = sales.filter((s) => s.personalId === personalId);
    const volume = pSales.reduce((acc, curr) => acc + curr.value, 0);
    const points = pSales.reduce((acc, curr) => acc + curr.pointsAdded, 0);
    return { count: pSales.length, volume, points, pSales };
  };

  // Rank calculation
  const getPersonalRank = (personalId: string) => {
    const activePersonais = personais.filter(p => p.active);
    const map = new Map<string, number>();
    activePersonais.forEach(p => map.set(p.id, 0));
    sales.forEach(s => {
      if (map.has(s.personalId)) {
        map.set(s.personalId, (map.get(s.personalId) || 0) + s.pointsAdded);
      }
    });
    const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const idx = sorted.findIndex(([id]) => id === personalId);
    return idx >= 0 ? idx + 1 : activePersonais.length;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2500);
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-zinc-200/80 dark:border-white/[0.08] pb-5">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2">
            <span>Personais Trainers Parceiros</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-white/[0.08]">
              {personais.length}
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gestão da rede de personais credenciados, cupons e link exclusivo de acompanhamento
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          <button
            onClick={() => {
              const url = `${window.location.origin}${window.location.pathname}?portal=personal`;
              copyToClipboard(url, 'portal_link');
            }}
            className="bg-amber-500/10 hover:bg-amber-500/20 text-[#D97706] dark:text-[#F5A623] border border-amber-500/30 text-xs font-bold px-3 py-2 rounded-xl transition flex items-center gap-1.5 shadow-xs"
            title="Copiar link exclusivo do portal para enviar aos personais"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copiedText === 'portal_link' ? 'Link Copiado!' : 'Link dos Personais'}</span>
          </button>

          <div className="relative flex-1 sm:w-56">
            <Search className="w-4 h-4 text-zinc-400 dark:text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar personal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/[0.08] focus:border-[#F5A623] rounded-xl pl-9 pr-3 py-2 text-xs text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none shadow-xs"
            />
          </div>

          <button
            onClick={() => {
              setPhoneError(null);
              setIsModalOpen(true);
            }}
            className="bg-[#F5A623] hover:bg-[#e5971a] text-black font-bold text-xs px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 shadow-sm shadow-[#F5A623]/20 shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Novo Personal</span>
          </button>
        </div>
      </div>

      {/* Grid de Cards de Personais */}
      {personais.length === 0 ? (
        <div className="bg-white dark:bg-[#16171B] border border-zinc-200/90 dark:border-white/[0.08] rounded-2xl p-8 text-center space-y-3 shadow-xs">
          <p className="text-sm text-zinc-500 dark:text-zinc-400">Nenhum personal cadastrado ainda.</p>
          <button
            onClick={() => {
              setPhoneError(null);
              setIsModalOpen(true);
            }}
            className="bg-[#F5A623] hover:bg-[#e5971a] text-black text-xs font-bold px-4 py-2 rounded-xl transition inline-flex items-center gap-1.5 shadow-sm"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Primeiro Personal</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((personal) => {
            const stats = personalStats(personal.id);
            const rank = getPersonalRank(personal.id);

            return (
              <div
                key={personal.id}
                onClick={() => setSelectedPersonalDetail(personal)}
                className={`bg-white dark:bg-[#16171B] border rounded-2xl p-5 shadow-xs dark:shadow-lg transition flex flex-col justify-between space-y-4 cursor-pointer hover:scale-[1.01] ${
                  personal.active 
                    ? 'border-zinc-200/90 dark:border-white/[0.08] hover:border-[#F5A623] dark:hover:border-[#F5A623]/50' 
                    : 'border-red-500/20 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-zinc-200 dark:border-white/[0.1] bg-zinc-100 dark:bg-zinc-800 shrink-0 relative">
                      <img
                        src={avatarSrc(personal)}
                        alt={personal.name}
                        className="w-full h-full object-cover"
                      />
                      {personal.active && (
                        <span className="absolute bottom-0 right-0 bg-black/80 font-mono text-[9px] font-bold px-1 text-white">
                          #{rank}
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight">
                        {personal.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                        <Building2 className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500" />
                        <span>{personal.gym}</span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-white/[0.08] text-[#D97706] dark:text-[#F5A623]">
                    {personal.code}
                  </span>
                </div>

                {/* Stats Box */}
                <div className="bg-zinc-50 dark:bg-[#121316] p-3 rounded-xl border border-zinc-200 dark:border-white/[0.06] grid grid-cols-3 gap-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase">Vendas</span>
                    <span className="font-mono font-bold text-zinc-900 dark:text-white text-sm">{stats.count}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase">Volume</span>
                    <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-200 text-xs">
                      {formatCurrencyBRL(stats.volume)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500 block uppercase">Pontos</span>
                    <span className="font-mono font-bold text-[#D97706] dark:text-[#F5A623] text-sm">
                      {stats.points.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>

                {/* Actions Footer */}
                <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                  <a
                    href={`https://wa.me/${personal.phone}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1.5 transition"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedPersonalDetail(personal)}
                      className="text-xs text-zinc-400 hover:text-white flex items-center gap-1"
                    >
                      <span>Ver Perfil</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onToggleActive(personal.id)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded transition ${
                        personal.active
                          ? 'text-zinc-500 hover:text-red-400'
                          : 'text-red-400 hover:text-emerald-400'
                      }`}
                    >
                      {personal.active ? 'Desativar' : 'Ativar'}
                    </button>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DETALHE DO PERSONAL (PERFIL COMPLETO & MATERIAL DE INDICAÇÃO) */}
      {selectedPersonalDetail && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/[0.12] rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            {/* Header com avatar e posição */}
            <div className="flex items-start justify-between border-b border-zinc-100 dark:border-white/[0.08] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-[#F5A623] bg-zinc-100 dark:bg-zinc-800 shrink-0">
                  <img
                    src={avatarSrc(selectedPersonalDetail)}
                    alt={selectedPersonalDetail.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-white tracking-tight">
                      {selectedPersonalDetail.name}
                    </h3>
                    <span className="text-[10px] font-mono bg-[#F5A623] text-black font-extrabold px-1.5 py-0.2 rounded">
                      #{getPersonalRank(selectedPersonalDetail.id)} no Ranking
                    </span>
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-2 mt-0.5">
                    <span>{selectedPersonalDetail.gym}</span>
                    <span>•</span>
                    <span className="font-mono">{selectedPersonalDetail.phone}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPersonalDetail(null)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Link Exclusivo do Personal */}
            <div className="bg-amber-500/[0.05] border border-amber-500/25 rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase text-[#D97706] dark:text-[#F5A623] font-bold block">
                Link Exclusivo do Personal (Sem acesso de lojista)
              </span>
              <p className="text-xs text-zinc-600 dark:text-zinc-300">
                Envie esse link direto para o personal visualizar seus próprios pontos e o ranking geral em tempo real.
              </p>
              <button
                onClick={() => {
                  const url = `${window.location.origin}${window.location.pathname}?portal=personal&code=${selectedPersonalDetail.code}`;
                  copyToClipboard(url, 'personal_portal_link');
                }}
                className="w-full py-2.5 bg-[#F5A623] hover:bg-[#e5971a] text-black text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copiedText === 'personal_portal_link' ? 'Link Exclusivo Copiado com Sucesso!' : 'Copiar Link Exclusivo para este Personal'}</span>
              </button>
            </div>

            {/* Foto do personal */}
            <div className="bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-white/[0.08] rounded-2xl p-4 space-y-2">
              <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 block">Foto do Personal</span>
              <PhotoPicker
                name={selectedPersonalDetail.name}
                value={selectedPersonalDetail.avatarUrl}
                size="md"
                onChange={(dataUrl) => {
                  onUpdatePersonal(selectedPersonalDetail.id, { avatarUrl: dataUrl });
                  setSelectedPersonalDetail({ ...selectedPersonalDetail, avatarUrl: dataUrl });
                }}
              />
            </div>

            {/* Cupom & Compartilhamento */}
            <div className="bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-white/[0.08] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-500 dark:text-zinc-400 block">Cupom de Desconto Exclusivo</span>
                  <span className="text-lg font-mono font-extrabold text-[#D97706] dark:text-[#F5A623]">
                    {selectedPersonalDetail.code}
                  </span>
                </div>
                <button
                  onClick={() => copyToClipboard(selectedPersonalDetail.code, 'cupom')}
                  className="px-3 py-1.5 bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-xs font-semibold rounded-lg text-zinc-900 dark:text-white border border-zinc-300 dark:border-white/[0.08] flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-[#F5A623]" />
                  <span>{copiedText === 'cupom' ? 'Copiado!' : 'Copiar Cupom'}</span>
                </button>
              </div>

              {/* Mensagem Pronta de Indicação para o Aluno */}
              <div className="pt-2 border-t border-zinc-200 dark:border-white/[0.06] space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                  Texto de Indicação para Alunos (WhatsApp):
                </span>
                <p className="text-[11px] text-zinc-600 dark:text-zinc-400 bg-white dark:bg-[#090A0C] p-2.5 rounded-xl border border-zinc-200 dark:border-white/[0.06] font-sans leading-relaxed">
                  "Fala guerreiro! Passando pra avisar que na <strong>New Fit Suplementos</strong> você tem desconto exclusivo no meu cupom <strong>{selectedPersonalDetail.code}</strong>! Dá um pulo lá na loja ou pede pelo Whats que o Leo separa pra você! 👊"
                </p>
                <button
                  onClick={() => copyToClipboard(
                    `Fala guerreiro! Passando pra avisar que na New Fit Suplementos você tem desconto exclusivo no meu cupom ${selectedPersonalDetail.code}! Dá um pulo lá na loja ou pede pelo Whats que o Leo separa pra você! 👊`,
                    'texto'
                  )}
                  className="w-full py-2 bg-amber-500/15 hover:bg-amber-500/25 text-[#D97706] dark:text-[#F5A623] border border-amber-500/30 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedText === 'texto' ? 'Texto Copiado com Sucesso!' : 'Copiar Texto Pronto para Alunos'}</span>
                </button>
              </div>
            </div>

            {/* Histórico Recente deste Personal */}
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block">
                Histórico de Vendas Indicadas ({personalStats(selectedPersonalDetail.id).count})
              </span>
              <div className="max-h-48 overflow-y-auto space-y-1.5">
                {personalStats(selectedPersonalDetail.id).pSales.length === 0 ? (
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 py-3 text-center">Nenhuma venda lançada ainda.</p>
                ) : (
                  personalStats(selectedPersonalDetail.id).pSales.map((s) => (
                    <div
                      key={s.id}
                      className="bg-zinc-50 dark:bg-[#121316] border border-zinc-200 dark:border-white/[0.06] p-2.5 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-semibold text-zinc-900 dark:text-white block">{s.clientName}</span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate block max-w-[240px]">{s.notes}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-mono font-bold text-[#D97706] dark:text-[#F5A623] block">{formatCurrencyBRL(s.value)}</span>
                        <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400">+{s.pointsAdded} pts</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Personal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#16171B] border border-zinc-200 dark:border-white/[0.12] rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.08] pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#F5A623]" />
                <span>Cadastrar Personal Parceiro</span>
              </h3>
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setPhoto(undefined);
                }}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white text-sm font-mono"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <PhotoPicker name={name} value={photo} onChange={setPhoto} />

              <div className="space-y-1">
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                  Nome Completo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Rodrigo Silva"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#0D0E11] border border-zinc-200 dark:border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-zinc-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                  Academia / Studio Principal
                </label>
                <input
                  type="text"
                  placeholder="Ex: Coliseu Gym"
                  value={gym}
                  onChange={(e) => setGym(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-[#0D0E11] border border-zinc-200 dark:border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                    WhatsApp (com DDD)
                  </label>
                  <input
                    type="tel"
                    placeholder="Ex: (43) 99821-3344"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      if (phoneError) setPhoneError(null);
                    }}
                    className={`w-full bg-zinc-50 dark:bg-[#0D0E11] border rounded-xl px-3.5 py-2 text-zinc-900 dark:text-white focus:outline-none font-mono ${
                      phoneError ? 'border-red-500' : 'border-zinc-200 dark:border-white/[0.12] focus:border-[#F5A623]'
                    }`}
                    required
                  />
                  {phoneError && (
                    <span className="text-red-500 text-[10px] block mt-0.5">{phoneError}</span>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-zinc-700 dark:text-zinc-300 font-semibold uppercase tracking-wider text-[11px]">
                    Cupom / Código
                  </label>
                  <input
                    type="text"
                    placeholder="RODRIGO10"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full bg-zinc-50 dark:bg-[#0D0E11] border border-zinc-200 dark:border-white/[0.12] focus:border-[#F5A623] rounded-xl px-3.5 py-2 text-[#D97706] dark:text-[#F5A623] focus:outline-none font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-100 dark:border-white/[0.08] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setPhoto(undefined);
                  }}
                  className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#e5971a] text-black font-bold transition flex items-center gap-1.5 shadow-xs"
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
