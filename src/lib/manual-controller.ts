import { panel } from './stores';

let unsub: (() => void) | null = null;

export function mountManual(dialog: HTMLDialogElement | null): void {
  unsub?.();
  unsub = null;
  if (!dialog) return;
  unsub = panel.subscribe((p) => {
    const open = p === 'manual';
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  });
  dialog.addEventListener('close', () => {
    if (panel.get() === 'manual') panel.set('none');
  });
}
