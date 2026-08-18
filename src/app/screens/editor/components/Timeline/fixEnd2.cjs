const fs = require('fs');
const path = 'D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/editor/components/Timeline/TimelineContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

const endPattern = /<\/button>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}/s;
content = content.replace(endPattern, `</button>\n            </div>\n          </div>\n        </div>\n  );\n}`);

fs.writeFileSync(path, content);
console.log('Fixed end of file');
