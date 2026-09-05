import { describe, it, expect } from 'vitest';
import { KEYMAP, actionForKey } from './keymap';

describe('keymap', () => {
  it('maps every documented key', () => {
    expect(actionForKey({ key: '1' })).toBe('section:top');
    expect(actionForKey({ key: '2' })).toBe('section:web3');
    expect(actionForKey({ key: '3' })).toBe('section:web2');
    expect(actionForKey({ key: '4' })).toBe('section:projects');
    expect(actionForKey({ key: 'ArrowDown' })).toBe('nextItem');
    expect(actionForKey({ key: 'ArrowUp' })).toBe('prevItem');
    expect(actionForKey({ key: ' ' })).toBe('play');
    expect(actionForKey({ key: 'ArrowRight' })).toBe('nextTrack');
    expect(actionForKey({ key: 'ArrowLeft' })).toBe('prevTrack');
    expect(actionForKey({ key: 'ArrowRight', shiftKey: true })).toBeNull();
    expect(actionForKey({ key: 'n' })).toBeNull();
    expect(actionForKey({ key: 'T' })).toBe('cycleTheme');
    expect(actionForKey({ key: 'w' })).toBe('enterWorld');
    expect(actionForKey({ key: '?' })).toBe('openManual');
  });
  it('ignores modifiers, editable targets, and unknown keys', () => {
    expect(actionForKey({ key: '1', metaKey: true })).toBeNull();
    expect(actionForKey({ key: 'd', ctrlKey: true })).toBeNull();
    expect(actionForKey({ key: 'ArrowRight', isEditable: true })).toBeNull();
    expect(actionForKey({ key: '5' })).toBeNull();
    expect(actionForKey({ key: 'Enter' })).toBeNull();
    expect(actionForKey({ key: 'x' })).toBeNull();
  });
  it('has no D or Escape binding', () => {
    expect(actionForKey({ key: 'd' })).toBeNull();
    expect(actionForKey({ key: 'Escape' })).toBeNull();
  });
  it('has a label, hint, and description for every binding', () => {
    for (const b of KEYMAP) {
      expect(b.label.length).toBeGreaterThan(0);
      expect(b.hint.length).toBeGreaterThan(0);
      expect(b.description.length).toBeGreaterThan(10);
    }
  });
});
