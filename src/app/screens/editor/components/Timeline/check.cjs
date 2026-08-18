const fs = require('fs');
const content = fs.readFileSync('D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/editor/components/Timeline/TimelineContainer.tsx', 'utf8');

let openBraces = (content.match(/\{/g) || []).length;
let closeBraces = (content.match(/\}/g) || []).length;
console.log('Open braces:', openBraces);
console.log('Close braces:', closeBraces);

let openParens = (content.match(/\(/g) || []).length;
let closeParens = (content.match(/\)/g) || []).length;
console.log('Open parens:', openParens);
console.log('Close parens:', closeParens);

let singleQuotes = (content.match(/'/g) || []).length;
let doubleQuotes = (content.match(/"/g) || []).length;
console.log('Single Quotes:', singleQuotes % 2 === 0 ? 'Balanced' : 'Unbalanced');
console.log('Double Quotes:', doubleQuotes % 2 === 0 ? 'Balanced' : 'Unbalanced');
let backticks = (content.match(/`/g) || []).length;
console.log('Backticks:', backticks % 2 === 0 ? 'Balanced' : 'Unbalanced');
