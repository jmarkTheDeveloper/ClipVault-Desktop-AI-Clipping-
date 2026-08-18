const fs = require('fs');
const path = 'D:/Personal Coding Projects/PYTHON PROJECT/ClipVault/frontend/src/app/screens/editor/components/Timeline/TimelineContainer.tsx';
let content = fs.readFileSync(path, 'utf8');

const marker = 'Drag media here to create tracks</span>\n                    </div>\n                  )}';
const markerIdx = content.indexOf(marker);

if (markerIdx !== -1) {
  content = content.slice(0, markerIdx + marker.length) + `
                </div>
              </div>
            </div>
          </div>
          <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-1.5 rounded-lg hover:bg-white/[0.05] transition-colors absolute top-2 right-2" style={{ color: "#5a5a5a", zIndex: 30 }}>
            {isFullScreen ? <ZoomOut className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
  );
}`;
  fs.writeFileSync(path, content);
  console.log('Fixed end of file');
} else {
  console.log('Could not find marker');
}
