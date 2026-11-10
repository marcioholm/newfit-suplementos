/**
 * Molas no padrão da Apple (Designing Fluid Interfaces, WWDC 2018).
 * Em Motion, `bounce` ≈ 1 − damping ratio e `duration` ≈ response.
 *
 * - Padrão: criticamente amortecida (sem overshoot), para quase tudo.
 * - Com momento: um leve bounce, só quando um gesto (arrastar/arremessar) veio antes.
 */
export const spring = {
  /** Mover/reposicionar, aparecer e sumir */
  default: { type: 'spring', bounce: 0, duration: 0.4 } as const,
  /** Respostas rápidas (troca de segmento, indicadores) */
  snappy: { type: 'spring', bounce: 0, duration: 0.3 } as const,
  /** Sheets e gavetas (damping 0.8, response 0.3) — usado após arrastar */
  sheet: { type: 'spring', bounce: 0.2, duration: 0.3 } as const
};

/**
 * Projeção de momento da Apple: para onde o gesto "iria" se continuasse,
 * igual à desaceleração da rolagem. Use o ponto projetado para decidir o destino.
 */
export function projectMomentum(velocityPxPerSec: number, decelerationRate = 0.998): number {
  return ((velocityPxPerSec / 1000) * decelerationRate) / (1 - decelerationRate);
}

/** Resistência progressiva ao passar do limite (rubber-band). */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
  return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/** Vibração curta onde o aparelho suporta (Android). Silencioso no iPhone. */
export function haptic(kind: 'success' | 'error' | 'tap' = 'tap') {
  try {
    if (!('vibrate' in navigator)) return;
    if (kind === 'success') navigator.vibrate(12);
    else if (kind === 'error') navigator.vibrate([18, 60, 18]);
    else navigator.vibrate(6);
  } catch {
    /* ignora */
  }
}
