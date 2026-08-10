/**
 * Does every decomposition form actually occur in the sentence it decomposes?
 *
 * A decomposition entry asserts that THIS Catalan form, in THIS énoncé, realises
 * THAT grammar point. The claim has two halves and only one of them was ever
 * checked: the ID is guaranteed to exist by constrained decoding, and nothing at
 * all guaranteed that the form was in the sentence.
 *
 * Ten live replies say it needs guaranteeing. Seven forms across four of them
 * were absent outright: `he` and `tingut` keyed on a reply whose own prose
 * rejected them, `jo` keyed on `cal que marxi demà`, and `ràpida` and `la meva`
 * decomposing a French-shaped sentence rather than the Catalan actually
 * produced. Each one increments the exposure counter of a component the learner
 * never met, which is the failure the exposure/mastery split exists to prevent.
 *
 * This is the half a machine can check. It cannot tell whether a form that IS
 * present realises the rule the ID names: `Barcelona` tagged as regular feminine
 * formation is just as false and only a reader catches it.
 */
import { foldAttempt } from './attempt';

/**
 * The words of a Catalan string, for whole-token comparison.
 *
 * Split on the hyphen as well as on whitespace, so an enclitic pronoun is its
 * own word: `dir-nos` has to realise `nos`. Without it the check is substring
 * matching, and substring matching passes a form for the wrong reason. One live
 * reply keyed the mangled form `ns`, which "occurs" in `sense`.
 *
 * The ellipsis in a discontinuous form such as `més ... que` disappears here,
 * because `foldAttempt` turns the full stops into spaces. That is the behaviour
 * wanted: both halves must be present, in any position.
 */
function words(text: string): string[] {
  return foldAttempt(text)
    .split(/[\s-]+/u)
    .filter((word) => word !== '');
}

/**
 * The forms the reply named that its own `answer_ca` does not contain.
 *
 * Empty means every entry is anchored in the sentence. Order and duplicates
 * follow the decomposition, so the caller can name them back in the order the
 * model produced them.
 */
export function unrealisedForms(forms: readonly string[], answerCa: string): string[] {
  const present = new Set(words(answerCa));
  return forms.filter((form) => {
    const wanted = words(form);
    // A form that folds away to nothing is not evidence of anything, and the
    // schema's minLength has already refused the empty string.
    if (wanted.length === 0) return true;
    return !wanted.every((word) => present.has(word));
  });
}
