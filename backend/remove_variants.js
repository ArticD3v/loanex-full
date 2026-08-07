const { Project, SyntaxKind } = require('ts-morph');

const project = new Project({
  tsConfigFilePath: 'tsconfig.json',
});

const files = project.getSourceFiles();

let changedFiles = 0;

for (const file of files) {
  const nodesToRemove = [];

  file.forEachDescendant(node => {
    try {
      if (node.getKind() === SyntaxKind.PropertyAssignment) {
        const name = node.getName();
        if (['variantId', 'variant', 'variants', 'variantName'].includes(name)) {
          nodesToRemove.push(node);
        }
      }
      
      if (node.getKind() === SyntaxKind.PropertySignature) {
        const name = node.getName();
        if (['variantId', 'variant', 'variants', 'variantName'].includes(name)) {
          nodesToRemove.push(node);
        }
      }
      
      if (node.getKind() === SyntaxKind.ShorthandPropertyAssignment) {
        const name = node.getName();
        if (['variantId', 'variant', 'variants', 'variantName'].includes(name)) {
          nodesToRemove.push(node);
        }
      }
    } catch (e) {
      // ignore
    }
  });

  if (nodesToRemove.length > 0) {
    // Sort by position descending to avoid shifting issues, though remove() handles it somewhat
    nodesToRemove.sort((a, b) => b.getStart() - a.getStart());
    
    for (const node of nodesToRemove) {
      try {
        if (!node.wasForgotten()) {
          node.remove();
        }
      } catch (e) {}
    }
    
    file.saveSync();
    changedFiles++;
    console.log(`Updated ${file.getFilePath()}`);
  }
}

console.log(`Removed variant properties from ${changedFiles} files.`);
