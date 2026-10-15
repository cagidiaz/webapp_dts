export const OFFER_PROBABILITIES: Record<string, number> = {
  preliminar: 5, presentada: 20, evaluación: 35, negociación: 55,
  aprobación: 75, aceptada: 90, ganada: 100, perdida: 0,
};
export function pilotPhase(value?: string | null): string | null {
  const phase = value?.toLowerCase().trim();
  const aliases: Record<string, string> = { borrador: 'preliminar', enviada: 'presentada', 'en negociación': 'negociación', ganado: 'ganada', perdido: 'perdida', evaluacion: 'evaluación', negociacion: 'negociación', aprobacion: 'aprobación' };
  return phase ? aliases[phase] || phase : null;
}
