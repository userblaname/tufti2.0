const fs = require('fs');
const code = fs.readFileSync('src/lib/tufti/constants.ts', 'utf8');

// The prompt starts with 'export const TUFTI_SYSTEM_PROMPT = `' and ends with the first line that is just '`' or something.
// But better: let's find 'export const TUFTI_SYSTEM_PROMPT = `' and then find the closing backtick.
const startIndex = code.indexOf('export const TUFTI_SYSTEM_PROMPT = `') + 'export const TUFTI_SYSTEM_PROMPT = `'.length;
// We need to find the matching closing backtick, taking into account possible escaped backticks.
// But we actually just want literally the first unescaped backtick after startIndex if there's no nested backticks.
// In TypeScript templates, there might be nested template literals ${`...`}, but the prompt is so huge, likely no ${}.
// Let's do a safer way: we can just use regular expressions or evaluate it using a TS processor, or simply split by '`;'. Wait, how does it end?
const lines = code.split('\n');
let capturing = false;
let promptOutput = '';
for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('export const TUFTI_SYSTEM_PROMPT = `')) {
    capturing = true;
    promptOutput += lines[i] + '\n';
    continue;
  }
  if (capturing) {
    promptOutput += lines[i] + '\n';
    if (lines[i].startsWith('`') || lines[i] === '`;') {
      break; 
    }
  }
}
fs.writeFileSync('backend/lib/tufti-prompt.js', `const TUFTI_SYSTEM_PROMPT = \n` + promptOutput.substring(promptOutput.indexOf('`')));
fs.writeFileSync('backend/lib/tufti-prompt-string.txt', promptOutput);
console.log("Extracted!");
