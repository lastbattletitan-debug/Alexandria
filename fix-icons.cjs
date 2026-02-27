const fs = require('fs');
const path = require('path');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Regex to match <Icon ... size={X} lg:size={Y} ... /> or <Icon ... lg:size={Y} size={X} ... />
  // We'll just replace lg:size={Y} with className="lg:w-[Ypx] lg:h-[Ypx]"
  // But wait, if there's already a className, we need to append to it.
  
  // Let's do a simpler regex: find `lg:size={Y}` and replace it.
  // We can just remove `lg:size={Y}` and add `className="lg:w-[Ypx] lg:h-[Ypx]"`
  // If there's an existing className, it might be easier to just use a regex replacer function.

  content = content.replace(/<([A-Z][a-zA-Z0-9]*)([^>]*)>/g, (match, componentName, props) => {
    if (!props.includes('lg:size=')) return match;

    let lgSizeMatch = props.match(/lg:size={(\d+)}/);
    if (!lgSizeMatch) return match;
    
    let lgSize = lgSizeMatch[1];
    let newProps = props.replace(/lg:size={\d+}/, '').trim();
    
    let sizeMatch = newProps.match(/size={(\d+)}/);
    let size = sizeMatch ? sizeMatch[1] : null;

    let classNameToAdd = `w-[${size}px] h-[${size}px] lg:w-[${lgSize}px] lg:h-[${lgSize}px]`;
    if (!size) {
        classNameToAdd = `lg:w-[${lgSize}px] lg:h-[${lgSize}px]`;
    }

    // remove size={X} to avoid conflicts with className sizing
    newProps = newProps.replace(/size={\d+}/, '');

    if (newProps.includes('className="')) {
      newProps = newProps.replace(/className="/, `className="${classNameToAdd} `);
    } else if (newProps.includes("className={'")) {
      newProps = newProps.replace(/className=\{'/, `className={'${classNameToAdd} `);
    } else if (newProps.includes('className={')) {
      newProps = newProps.replace(/className={/, `className={\`${classNameToAdd} \` + `);
    } else {
      newProps += ` className="${classNameToAdd}"`;
    }

    return `<${componentName} ${newProps}>`;
  });

  fs.writeFileSync(filePath, content, 'utf8');
}

const dir = path.join(__dirname, 'src/components');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.tsx'));

for (const file of files) {
  processFile(path.join(dir, file));
}
console.log('Done');
