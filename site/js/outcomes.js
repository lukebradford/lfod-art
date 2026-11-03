// Outcomes: what a beginning settles into, written compactly and put into words. The
// Four cells and Five cells data (four.js, five.js) record each placement's fate as a
// string; tests/four.test.mjs and tests/five.test.mjs check every one by simulation.
//
// Outcome strings: 'explodes' (grows into the light-speed diamond), or 'at:result',
// where `at` is the generation the result is reached by and the result is 'nothing'
// (every cell dies) or a list of named objects such as 'checker×4 freeship×2'.

// '28:checker×4 freeship×2' -> { at: 28, kind: 'objects', objects: { checker: 4, freeship: 2 } }
export function parseOutcome(s) {
  if (s === 'explodes') return { at: null, kind: 'explodes', objects: {} };
  const [at, rest] = s.split(':');
  if (rest === 'nothing') return { at: +at, kind: 'nothing', objects: {} };
  const objects = {};
  for (const part of rest.split(' ')) {
    const [name, n] = part.split('×');
    objects[name] = n ? +n : 1;
  }
  return { at: +at, kind: 'objects', objects };
}

const NAMES = {
  dot: ['dot', 'dots'], checker: ['checker', 'checkers'], moon: ['moon', 'moons'], freeship: ['free ship', 'free ships'],
  monster: ['monster', 'monsters'], anchor: ['anchor', 'anchors'], lever: ['lever', 'levers'], radar: ['radar', 'radars'],
  ant: ['ant', 'ants'], puffer: ['double dot puffer', 'double dot puffers'],
};
const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const order = (k) => ['puffer', 'monster', 'freeship', 'moon', 'anchor', 'lever', 'radar', 'ant', 'checker', 'dot'].indexOf(k);

// The objects in words, biggest first: "a moon and two dots"
export function phrase(objects) {
  const parts = Object.entries(objects).sort((a, b) => order(a[0]) - order(b[0]))
    .map(([k, n]) => `${n === 1 ? (/^[aeiou]/.test(NAMES[k][0]) ? 'an' : 'a') : WORDS[n]} ${NAMES[k][n > 1 ? 1 : 0]}`);
  return parts.length > 1 ? parts.slice(0, -1).join(', ') + ' and ' + parts.at(-1) : parts[0];
}
