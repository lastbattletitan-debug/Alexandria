const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/App.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/className="grid gap-6 origin-top-left/g, 'className="grid gap-3 lg:gap-6 origin-top-left');
content = content.replace(/className={`grid gap-6 origin-top-left/g, 'className={`grid gap-3 lg:gap-6 origin-top-left');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Done replacing grid gap');
