import React, { useMemo, useRef, useState, useEffect } from 'react';
import { CloudUpload, Copy, Eye, Loader2, Lock, MessageCircle, Pencil, Plus, Share, Trash2, Users } from 'lucide-react';
import { Personal, Sale } from '../types';
import { formatCurrencyBRL } from '../services/webhookService';
import { resizeImageToAvatar, avatarSrc } from '../services/imageService';
import {
  Avatar,
  BareInput,
  Button,
  EmptyState,
  FieldRow,
  Group,
  IconButton,
  Row,
  ScreenHeader,
  SearchField,
  Section,
  cx
} from '../ui/components';
import { Sheet, SheetAction } from '../ui/Sheet';
import { ConfirmSheet } from '../ui/ConfirmSheet';
import { useToast } from '../ui/Toast';
import { referralText, portalUrl, shareOrCopy } from '../services/referral';

interface PersonaisViewProps {
  personais: Personal[];
  sales: Sale[];
  onAddPersonal: (personal: Omit<Personal, 'id' | 'createdAt'>) => void;
  onToggleActive: (id: string) => void;
  onUpdatePersonal: (id: string, changes: Partial<Omit<Personal, 'id' | 'createdAt'>>) => void;
  onDeletePersonal?: (id: string) => void;
  onLock?: () => void;
  onOpenPortal?: (code?: string) => void;
  /** IDs dos personais que já estão na planilha (null = ainda não carregou) */
  syncedIds?: Set<string> | null;
  /** Envia todos os personais deste aparelho para a planilha */
  onSyncAll?: () => Promise<{ success: boolean; statusText: string }>;
}

/** 5543998213344 → (43) 99821-3344 */
export function formatPhone(phone: string) {
  const d = phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return phone;
}

/** Valida e normaliza: só dígitos, 10–13; com 10/11 dígitos acrescenta 55. */
function normalizePhone(raw: string): { phone?: string; error?: string } {
  let d = raw.replace(/\D/g, '');
  if (d.length < 10 || d.length > 13) return { error: 'Digite o WhatsApp com DDD, ex.: (43) 99821-3344' };
  if (d.length === 10 || d.length === 11) d = '55' + d;
  return { phone: d };
}


/* ─────────────── Foto (câmera ou galeria, recorte e compressão) ─────────────── */

const PhotoPicker: React.FC<{
  name: string;
  value?: string;
  onChange: (dataUrl: string | undefined) => void;
}> = ({ name, value, onChange }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file?: File) => {
    if (!file) return;
    setError(null);
    setBusy(true);
    try {
      onChange(await resizeImageToAvatar(file));
    } catch (e: any) {
      setError(e?.message || 'Não foi possível usar esta foto.');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        aria-label={value ? 'Trocar foto' : 'Adicionar foto'}
        className="pressable relative w-24 h-24 rounded-full overflow-hidden bg-fill/20"
      >
        <img src={value || avatarSrc({ name: name || '?' })} alt="" className="w-full h-full object-cover" />
        {busy && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-white animate-spin" />
          </span>
        )}
      </button>
      <div className="flex items-center gap-4 mt-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="type-subhead font-semibold text-tint-text h-9 pressable"
        >
          {value ? 'Trocar foto' : 'Adicionar foto'}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(undefined)}
            disabled={busy}
            className="type-subhead text-red h-9 pressable"
          >
            Remover
          </button>
        )}
      </div>
      {error && (
        <p className="type-footnote text-red text-center" role="alert">
          {error}
        </p>
      )}
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

/* ───────────────────────────── Tela ───────────────────────────── */

export const PersonaisView: React.FC<PersonaisViewProps> = ({
  personais,
  sales,
  onAddPersonal,
  onToggleActive,
  onUpdatePersonal,
  onDeletePersonal,
  onLock,
  onOpenPortal,
  syncedIds,
  onSyncAll
}) => {
  const toast = useToast();
  const [syncing, setSyncing] = useState(false);
  const pendingSync = syncedIds ? personais.filter((p) => !syncedIds.has(p.id)).length : null;
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null);
  const [confirmDeletePersonal, setConfirmDeletePersonal] = useState<Personal | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = personais.find((p) => p.id === detailId) || null;

  const statsFor = (personalId: string) => {
    const pSales = sales.filter((s) => s.personalId === personalId);
    return {
      count: pSales.length,
      volume: pSales.reduce((acc, s) => acc + s.value, 0),
      points: pSales.reduce((acc, s) => acc + s.pointsAdded, 0),
      pSales
    };
  };

  const rankOf = (personalId: string) => {
    const active = personais.filter((p) => p.active);
    const map = new Map<string, number>();
    active.forEach((p) => map.set(p.id, 0));
    sales.forEach((s) => map.has(s.personalId) && map.set(s.personalId, (map.get(s.personalId) || 0) + s.pointsAdded));
    const idx = Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .findIndex(([id]) => id === personalId);
    return idx >= 0 ? idx + 1 : null;
  };

  const { active, inactive } = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    const list = personais
      .filter(
        (p) =>
          !term ||
          p.name.toLowerCase().includes(term) ||
          p.gym.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term)
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
    return { active: list.filter((p) => p.active), inactive: list.filter((p) => !p.active) };
  }, [personais, searchTerm]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.show({ kind: 'success', title: `${what} copiado` });
    } catch {
      toast.show({ kind: 'error', title: 'Não foi possível copiar', message: 'Selecione e copie manualmente.' });
    }
  };

  const renderRow = (p: Personal) => {
    const s = statsFor(p.id);
    return (
      <Row
        key={p.id}
        onClick={() => setDetailId(p.id)}
        leading={<Avatar personal={p} size={40} className={cx(!p.active && 'opacity-50')} />}
        title={<span className={cx(!p.active && 'text-label-2')}>{p.name}</span>}
        subtitle={`${p.gym} · ${p.code}`}
        trailing={<span className="type-subhead tabular-nums">{s.points.toLocaleString('pt-BR')} pts</span>}
        chevron
      />
    );
  };

  return (
    <div>
      <ScreenHeader
        title="Personais"
        subtitle={`${personais.filter((p) => p.active).length} ativos`}
        actions={
          <>
            <IconButton label="Novo personal" tone="tint" onClick={() => setIsAddOpen(true)}>
              <Plus className="w-5 h-5" strokeWidth={2.5} />
            </IconButton>
            {onLock && (
              <IconButton label="Bloquear" onClick={onLock} className="lg:hidden">
                <Lock className="w-[18px] h-[18px]" />
              </IconButton>
            )}
          </>
        }
      />

      {personais.length === 0 ? (
        <EmptyState
          icon={<Users className="w-7 h-7" />}
          title="Nenhum personal cadastrado"
          message="Cadastre os personais parceiros com nome, academia, WhatsApp e cupom."
          action={
            <Button variant="filled" icon={<Plus className="w-4 h-4" />} onClick={() => setIsAddOpen(true)}>
              Cadastrar primeiro personal
            </Button>
          }
        />
      ) : (
        <>
          <SearchField
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Buscar nome, academia ou cupom"
            className="mb-5"
          />
          {active.length === 0 && inactive.length === 0 && (
            <p className="type-subhead text-label-2 text-center py-10">Nenhum resultado para “{searchTerm}”.</p>
          )}
          {active.length > 0 && (
            <Section title="Ativos">
              <Group>{active.map(renderRow)}</Group>
            </Section>
          )}
          <Section
            title="Portal dos personais"
            footer={
              pendingSync === null
                ? 'O portal mostra os personais e vendas registrados na planilha.'
                : pendingSync === 0
                ? `Todos os ${personais.length} personais estão no portal.`
                : `${pendingSync} ${pendingSync === 1 ? 'personal deste aparelho ainda não está' : 'personais deste aparelho ainda não estão'} no portal. Toque em “Enviar personais ao portal”.`
            }
          >
            <Group>
              {onSyncAll && (
                <Row
                  onClick={
                    syncing
                      ? undefined
                      : async () => {
                          setSyncing(true);
                          try {
                            await onSyncAll();
                          } finally {
                            setSyncing(false);
                          }
                        }
                  }
                  leading={
                    syncing ? (
                      <Loader2 className="w-5 h-5 text-tint-text animate-spin" aria-hidden />
                    ) : (
                      <CloudUpload className="w-5 h-5 text-tint-text" aria-hidden />
                    )
                  }
                  title={<span className="text-tint-text">{syncing ? 'Enviando…' : 'Enviar personais ao portal'}</span>}
                  trailing={
                    pendingSync !== null && pendingSync > 0 ? (
                      <span className="min-w-6 h-6 px-2 rounded-full bg-red-fill text-white type-footnote font-semibold flex items-center justify-center tabular-nums">
                        {pendingSync}
                      </span>
                    ) : undefined
                  }
                />
              )}
              <Row
                onClick={async () => {
                  const r = await shareOrCopy({
                    title: 'Portal do Personal • New Fit',
                    text: 'Acompanhe seu ranking e suas vendas na New Fit:',
                    url: portalUrl()
                  });
                  if (r === 'copied') toast.show({ kind: 'success', title: 'Link copiado' });
                }}
                leading={<Share className="w-5 h-5 text-tint-text" aria-hidden />}
                title={<span className="text-tint-text">Compartilhar link do portal</span>}
              />
              {onOpenPortal && (
                <Row
                  onClick={() => onOpenPortal()}
                  leading={<Eye className="w-5 h-5 text-tint-text" aria-hidden />}
                  title={<span className="text-tint-text">Ver como personal</span>}
                  chevron
                />
              )}
            </Group>
          </Section>
          {inactive.length > 0 && (
            <Section title="Inativos" footer="Personais inativos não aparecem no ranking nem no balcão.">
              <Group>{inactive.map(renderRow)}</Group>
            </Section>
          )}
        </>
      )}

      {/* Ficha do personal */}
      <Sheet
        open={!!detail}
        onClose={() => setDetailId(null)}
        title="Personal"
        trailing={
          detail ? (
            <SheetAction onClick={() => setEditingPersonal(detail)}>
              Editar
            </SheetAction>
          ) : undefined
        }
      >
        {detail && (
          <PersonalDetail
            personal={detail}
            stats={statsFor(detail.id)}
            rank={detail.active ? rankOf(detail.id) : null}
            onPhoto={(avatarUrl) => onUpdatePersonal(detail.id, { avatarUrl })}
            onEdit={() => setEditingPersonal(detail)}
            onDelete={onDeletePersonal ? () => setConfirmDeletePersonal(detail) : undefined}
            onCopy={copy}
            onOpenPortal={onOpenPortal}
            onToggleActive={() => {
              onToggleActive(detail.id);
              toast.show({
                kind: 'info',
                title: detail.active ? `${detail.firstName} desativado` : `${detail.firstName} reativado`,
                message: detail.active ? 'Saiu do ranking e do balcão. Dá para reativar a qualquer momento.' : undefined
              });
            }}
          />
        )}
      </Sheet>

      {/* Cadastro */}
      <AddPersonalSheet
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        existingCodes={personais.map((p) => p.code.toUpperCase())}
        onSave={(p) => {
          onAddPersonal(p);
          setIsAddOpen(false);
          toast.show({ kind: 'success', title: `${p.firstName} cadastrado` });
        }}
      />

      {/* Edição */}
      <EditPersonalSheet
        personal={editingPersonal}
        onClose={() => setEditingPersonal(null)}
        existingCodes={personais.map((p) => p.code.toUpperCase())}
        onDelete={onDeletePersonal && editingPersonal ? () => setConfirmDeletePersonal(editingPersonal) : undefined}
        onSave={(id, changes) => {
          onUpdatePersonal(id, changes);
          setEditingPersonal(null);
          toast.show({ kind: 'success', title: 'Personal atualizado' });
        }}
      />

      {/* Confirmação de exclusão */}
      <ConfirmSheet
        open={!!confirmDeletePersonal}
        title="Apagar personal?"
        message={`O cadastro de "${confirmDeletePersonal?.name}" será removido deste aparelho. Se as vendas dele já foram registradas na planilha do Google, lembre-se de remover a linha lá também.`}
        confirmLabel="Apagar personal"
        onConfirm={() => {
          if (confirmDeletePersonal && onDeletePersonal) {
            onDeletePersonal(confirmDeletePersonal.id);
            toast.show({
              kind: 'info',
              title: `${confirmDeletePersonal.firstName} apagado`,
              message: 'Removido deste aparelho.'
            });
            setConfirmDeletePersonal(null);
            setDetailId(null);
            setEditingPersonal(null);
          }
        }}
        onClose={() => setConfirmDeletePersonal(null)}
      />
    </div>
  );
};

/* ───────────────────────────── Ficha ───────────────────────────── */

const PersonalDetail: React.FC<{
  personal: Personal;
  stats: { count: number; volume: number; points: number; pSales: Sale[] };
  rank: number | null;
  onPhoto: (url: string | undefined) => void;
  onEdit: () => void;
  onDelete?: () => void;
  onCopy: (text: string, what: string) => void;
  onOpenPortal?: (code?: string) => void;
  onToggleActive: () => void;
}> = ({ personal, stats, rank, onPhoto, onEdit, onDelete, onCopy, onOpenPortal, onToggleActive }) => (
  <div className="pt-2">
    <PhotoPicker name={personal.name} value={personal.avatarUrl} onChange={onPhoto} />
    <div className="text-center mt-2 mb-3">
      <h3 className="type-title-2 text-label">{personal.name}</h3>
      <p className="type-subhead text-label-2">
        {personal.gym}
        {rank ? ` · ${rank}º no ranking` : !personal.active ? ' · Inativo' : ''}
      </p>
    </div>

    <div className="flex items-center justify-center gap-2 mb-5">
      <Button variant="tinted" size="sm" icon={<Pencil className="w-3.5 h-3.5" />} onClick={onEdit}>
        Editar dados
      </Button>
    </div>

    <div className="grid grid-cols-3 gap-2 mb-6">
      {[
        { label: 'Vendas', value: stats.count.toLocaleString('pt-BR') },
        { label: 'Volume', value: formatCurrencyBRL(stats.volume) },
        { label: 'Pontos', value: stats.points.toLocaleString('pt-BR') }
      ].map((s) => (
        <div key={s.label} className="bg-surface rounded-card px-3 py-2.5 text-center">
          <p className="type-caption text-label-2">{s.label}</p>
          <p className="type-subhead font-semibold tabular-nums text-label truncate">{s.value}</p>
        </div>
      ))}
    </div>

    <Section title="Cupom">
      <Group>
        <Row
          title={<span className="font-semibold tracking-[0.04em] tabular-nums">{personal.code}</span>}
          trailing={
            <Button size="sm" variant="tinted" icon={<Copy className="w-3.5 h-3.5" />} onClick={() => onCopy(personal.code, 'Cupom')}>
              Copiar
            </Button>
          }
        />
        {personal.phone ? (
          <Row
            href={`https://wa.me/${personal.phone}`}
            leading={<MessageCircle className="w-5 h-5 text-green" aria-hidden />}
            title="WhatsApp"
            trailing={<span className="tabular-nums">{formatPhone(personal.phone)}</span>}
            chevron
          />
        ) : (
          <Row
            leading={<MessageCircle className="w-5 h-5 text-label-3" aria-hidden />}
            title="WhatsApp"
            trailing={<span className="type-footnote">Salvo na planilha</span>}
          />
        )}
      </Group>
    </Section>

    <Section title="Texto para os alunos" footer="O personal pode enviar este texto para divulgar o cupom.">
      <Group>
        <div className="px-4 py-3 type-subhead text-label">{referralText(personal.code)}</div>
        <Row
          onClick={() => onCopy(referralText(personal.code), 'Texto')}
          leading={<Copy className="w-5 h-5 text-tint-text" aria-hidden />}
          title={<span className="text-tint-text">Copiar texto</span>}
        />
      </Group>
    </Section>

    <Section title="Portal do personal" footer="Link que abre direto no espaço deste personal.">
      <Group>
        <Row
          // Sem telefone neste aparelho, o WhatsApp abre para escolher o contato
          href={`https://wa.me/${personal.phone || ''}?text=${encodeURIComponent(
            `Fala, ${personal.firstName}! Acompanhe seu ranking e suas vendas na New Fit: ${portalUrl(personal)}`
          )}`}
          leading={<MessageCircle className="w-5 h-5 text-green" aria-hidden />}
          title="Enviar link pelo WhatsApp"
          chevron
        />
        <Row
          onClick={() => onCopy(portalUrl(personal), 'Link')}
          leading={<Copy className="w-5 h-5 text-tint-text" aria-hidden />}
          title={<span className="text-tint-text">Copiar link</span>}
        />
        {onOpenPortal && (
          <Row
            onClick={() => onOpenPortal(personal.code)}
            leading={<Eye className="w-5 h-5 text-tint-text" aria-hidden />}
            title={<span className="text-tint-text">Ver o espaço de {personal.firstName}</span>}
            chevron
          />
        )}
      </Group>
    </Section>

    <Section title={`Vendas indicadas (${stats.count})`}>
      <Group>
        {stats.pSales.length === 0 ? (
          <Row title={<span className="text-label-2">Nenhuma venda ainda.</span>} />
        ) : (
          stats.pSales.slice(0, 20).map((s) => (
            <Row
              key={s.id}
              title={s.clientName}
              subtitle={`${new Date(s.timestamp).toLocaleDateString('pt-BR')} · ${s.notes}`}
              trailing={<span className="tabular-nums text-label">{formatCurrencyBRL(s.value)}</span>}
            />
          ))
        )}
      </Group>
    </Section>

    <div className="space-y-2 pt-2">
      <Button variant={personal.active ? 'tinted' : 'filled'} size="lg" fullWidth onClick={onToggleActive}>
        {personal.active ? 'Desativar personal' : 'Reativar personal'}
      </Button>
      {onDelete && (
        <Button
          variant="destructive"
          size="lg"
          fullWidth
          icon={<Trash2 className="w-4 h-4" />}
          onClick={onDelete}
        >
          Apagar personal
        </Button>
      )}
    </div>
  </div>
);

/* ───────────────────────────── Cadastro ───────────────────────────── */

const AddPersonalSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  existingCodes: string[];
  onSave: (p: Omit<Personal, 'id' | 'createdAt'>) => void;
}> = ({ open, onClose, existingCodes, onSave }) => {
  const [name, setName] = useState('');
  const [gym, setGym] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [codeTouched, setCodeTouched] = useState(false);
  const [photo, setPhoto] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const reset = () => {
    setName('');
    setGym('');
    setPhone('');
    setCode('');
    setCodeTouched(false);
    setPhoto(undefined);
    setPhoneError(null);
  };
  const close = () => {
    reset();
    onClose();
  };

  // Sugere o cupom a partir do primeiro nome até a pessoa editar
  const suggestedCode = (name.trim().split(' ')[0] || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
  const finalCode = (codeTouched ? code : suggestedCode ? `${suggestedCode}10` : '').trim().toUpperCase();
  const codeTaken = !!finalCode && existingCodes.includes(finalCode);

  const valid = name.trim() && gym.trim() && phone.trim() && finalCode && !codeTaken;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const { phone: normalized, error } = normalizePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }
    if (!valid || !normalized) return;
    onSave({
      name: name.trim(),
      firstName: name.trim().split(' ')[0],
      gym: gym.trim(),
      phone: normalized,
      code: finalCode,
      active: true,
      avatarUrl: photo
    });
    reset();
  };

  return (
    <Sheet
      open={open}
      onClose={close}
      title="Novo personal"
      leading={<SheetAction onClick={close}>Cancelar</SheetAction>}
      trailing={
        <SheetAction emphasized disabled={!valid} onClick={() => submit()}>
          Salvar
        </SheetAction>
      }
    >
      <form onSubmit={submit} className="pt-3" aria-label="Cadastrar personal">
        <div className="mb-6">
          <PhotoPicker name={name} value={photo} onChange={setPhoto} />
        </div>
        <Section footer="A foto é opcional e aparece no ranking e no Modo TV.">
          <Group>
            <FieldRow label="Nome" htmlFor="p-name">
              <BareInput
                id="p-name"
                data-autofocus
                placeholder="Nome completo"
                autoCapitalize="words"
                autoComplete="off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </FieldRow>
            <FieldRow label="Academia" htmlFor="p-gym">
              <BareInput
                id="p-gym"
                placeholder="Academia ou studio"
                autoCapitalize="words"
                value={gym}
                onChange={(e) => setGym(e.target.value)}
                required
              />
            </FieldRow>
            <FieldRow label="WhatsApp" htmlFor="p-phone" error={phoneError}>
              <BareInput
                id="p-phone"
                type="tel"
                inputMode="tel"
                placeholder="(43) 99821-3344"
                autoComplete="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (phoneError) setPhoneError(null);
                }}
                // Valida ao sair do campo, não só ao salvar
                onBlur={() => phone.trim() && setPhoneError(normalizePhone(phone).error ?? null)}
                aria-invalid={!!phoneError}
                className="tabular-nums"
                required
              />
            </FieldRow>
            <FieldRow
              label="Cupom"
              htmlFor="p-code"
              error={codeTaken ? 'Este cupom já é de outro personal.' : null}
            >
              <BareInput
                id="p-code"
                placeholder="ANA10"
                autoCapitalize="characters"
                value={codeTouched ? code : finalCode}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value.toUpperCase());
                }}
                className="font-semibold tracking-[0.04em] uppercase"
                required
              />
            </FieldRow>
          </Group>
        </Section>
        {/* Enter no teclado também salva */}
        <button type="submit" className="sr-only" tabIndex={-1} aria-hidden disabled={!valid}>
          Salvar
        </button>
      </form>
    </Sheet>
  );
};

/* ───────────────────────────── Edição ───────────────────────────── */

const EditPersonalSheet: React.FC<{
  personal: Personal | null;
  onClose: () => void;
  existingCodes: string[];
  onDelete?: () => void;
  onSave: (id: string, changes: Partial<Omit<Personal, 'id' | 'createdAt'>>) => void;
}> = ({ personal, onClose, existingCodes, onDelete, onSave }) => {
  const [name, setName] = useState('');
  const [gym, setGym] = useState('');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [photo, setPhoto] = useState<string | undefined>();
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (personal) {
      setName(personal.name);
      setGym(personal.gym);
      setPhone(formatPhone(personal.phone));
      setCode(personal.code);
      setPhoto(personal.avatarUrl);
      setPhoneError(null);
    }
  }, [personal]);

  const finalCode = code.trim().toUpperCase();
  const otherCodes = personal ? existingCodes.filter((c) => c !== personal.code.toUpperCase()) : existingCodes;
  const codeTaken = !!finalCode && otherCodes.includes(finalCode);
  const valid = !!personal && !!name.trim() && !!gym.trim() && !!phone.trim() && !!finalCode && !codeTaken;

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!personal) return;
    const { phone: normalized, error } = normalizePhone(phone);
    if (error) {
      setPhoneError(error);
      return;
    }
    if (!valid || !normalized) return;

    onSave(personal.id, {
      name: name.trim(),
      firstName: name.trim().split(' ')[0],
      gym: gym.trim(),
      phone: normalized,
      code: finalCode,
      avatarUrl: photo
    });
  };

  return (
    <Sheet
      open={!!personal}
      onClose={onClose}
      title="Editar personal"
      leading={<SheetAction onClick={onClose}>Cancelar</SheetAction>}
      trailing={
        <SheetAction emphasized disabled={!valid} onClick={() => submit()}>
          Salvar
        </SheetAction>
      }
    >
      {personal && (
        <form onSubmit={submit} className="pt-3" aria-label="Editar personal">
          <div className="mb-6">
            <PhotoPicker name={name} value={photo} onChange={setPhoto} />
          </div>
          <Section footer="Corrija o nome, academia, telefone ou cupom do personal.">
            <Group>
              <FieldRow label="Nome" htmlFor="edit-p-name">
                <BareInput
                  id="edit-p-name"
                  data-autofocus
                  placeholder="Nome completo"
                  autoCapitalize="words"
                  autoComplete="off"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </FieldRow>
              <FieldRow label="Academia" htmlFor="edit-p-gym">
                <BareInput
                  id="edit-p-gym"
                  placeholder="Academia ou studio"
                  autoCapitalize="words"
                  value={gym}
                  onChange={(e) => setGym(e.target.value)}
                  required
                />
              </FieldRow>
              <FieldRow label="WhatsApp" htmlFor="edit-p-phone" error={phoneError}>
                <BareInput
                  id="edit-p-phone"
                  type="tel"
                  inputMode="tel"
                  placeholder="(43) 99821-3344"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (phoneError) setPhoneError(null);
                  }}
                  onBlur={() => phone.trim() && setPhoneError(normalizePhone(phone).error ?? null)}
                  aria-invalid={!!phoneError}
                  className="tabular-nums"
                  required
                />
              </FieldRow>
              <FieldRow
                label="Cupom"
                htmlFor="edit-p-code"
                error={codeTaken ? 'Este cupom já é de outro personal.' : null}
              >
                <BareInput
                  id="edit-p-code"
                  placeholder="ANA10"
                  autoCapitalize="characters"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-semibold tracking-[0.04em] uppercase"
                  required
                />
              </FieldRow>
            </Group>
          </Section>
          {onDelete && (
            <div className="pt-6 pb-2">
              <Button
                type="button"
                variant="destructive"
                size="lg"
                fullWidth
                icon={<Trash2 className="w-4 h-4" />}
                onClick={onDelete}
              >
                Apagar personal
              </Button>
            </div>
          )}
          <button type="submit" className="sr-only" tabIndex={-1} aria-hidden disabled={!valid}>
            Salvar
          </button>
        </form>
      )}
    </Sheet>
  );
};
