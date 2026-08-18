const fs = require('fs');
const path = 'D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/editor/components/Timeline/TimelineContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

const marker = 'Drag media here to create tracks';
const markerIdx = content.indexOf(marker);

if (markerIdx !== -1) {
  // Find the closing brace of that block
  const blockEnd = content.indexOf(')}', markerIdx);
  if (blockEnd !== -1) {
    content = content.slice(0, blockEnd + 2) + `
                </div>
              </div>
            </div>
          </div>
  </>);
}`;
    fs.writeFileSync(path, content);
    console.log('Fixed exactly using index');
  } else {
    console.log('Could not find block end');
  }
} else {
  console.log('Could not find marker');
}
