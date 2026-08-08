import { describe, it, expect } from 'vitest';
import { fr, quote } from '../src/i18n/fr';
import { INITIAL_DIFFICULTY } from '../src/srs/fsrs';
import { buildHeaders } from '../src/api/anthropic';

const NNBSP = String.fromCodePoint(0x202f);

/** Every leaf string in the table, flattened. */
function allStrings(): string[] {
  return Object.values(fr).flatMap((group) => Object.values(group));
}

describe('scaffold', () => {
  it('exposes fake-indexeddb to the test environment', () => {
    expect(typeof indexedDB).toBe('object');
  });

  it('keeps UI copy in French', () => {
    expect(fr.app.title).toBe('Entraîneur de grammaire catalane');
  });
});

describe('French typography', () => {
  it('puts a narrow no-break space before : ; ! ?', () => {
    for (const value of allStrings()) {
      // An ordinary space before French high punctuation is the drift this
      // guards against: it is invisible in review and wrong in print.
      expect(value, `ordinary space before punctuation in: ${value}`).not.toMatch(
        / [:;!?]/,
      );
    }
    expect(fr.status.scaffold).toContain(`${NNBSP}:`);
  });

  it('uses no em-dashes anywhere', () => {
    for (const value of allStrings()) {
      expect(value, `em-dash in: ${value}`).not.toContain('—');
    }
  });

  it('quotes with guillemets and inner narrow no-break spaces', () => {
    expect(quote('vaig cantar')).toBe(`«${NNBSP}vaig cantar${NNBSP}»`);
  });

  it('uses the typographic apostrophe in French prose', () => {
    expect(fr.apiKey.missing).toContain('’');
    for (const value of allStrings()) {
      expect(value, `straight apostrophe in French copy: ${value}`).not.toContain("'");
    }
  });
});

describe('contrast status to initial difficulty', () => {
  it('starts only transfer nodes easy', () => {
    expect(INITIAL_DIFFICULTY.transfer).toBe('low');
    expect(INITIAL_DIFFICULTY['near-miss']).toBe('high');
    expect(INITIAL_DIFFICULTY['false-friend']).toBe('high');
    expect(INITIAL_DIFFICULTY.novel).toBe('high');
  });
});

describe('api client', () => {
  it('sends the direct browser access header', () => {
    const headers = buildHeaders('test-key');
    expect(headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(headers['x-api-key']).toBe('test-key');
    expect(headers['anthropic-version']).toBe('2023-06-01');
  });
});
