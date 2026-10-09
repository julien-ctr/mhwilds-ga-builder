import { describe, expect, it } from 'vitest';
import { normalize } from '../src/ui/format';

describe('normalize', () => {
  it('ignores accents, case and ligatures', () => {
    expect(normalize("Œil de l'esprit")).toBe("oeil de l'esprit");
    expect(normalize("Maître d'armes")).toContain('maitre');
    expect(normalize('Épée')).toBe('epee');
  });
});
