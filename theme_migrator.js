const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/app/index.tsx',
  'src/app/onboarding.tsx',
  'src/app/mcq.tsx',
  'src/app/(tabs)/index.tsx',
  'src/app/(tabs)/curriculum.tsx',
  'src/app/(tabs)/profile.tsx',
];

filesToProcess.forEach(file => {
  const absolutePath = path.join(__dirname, file);
  if (!fs.existsSync(absolutePath)) return;
  
  let content = fs.readFileSync(absolutePath, 'utf8');
  
  // Skip if already has useTheme
  if (content.includes('useTheme(')) return;

  // Add import for useTheme
  const depth = file.split('/').length - 2; // e.g., src/app/index.tsx -> 1, src/app/(tabs)/index.tsx -> 2
  const prefix = '../'.repeat(depth);
  const themeImport = `import { useTheme } from '${prefix}theme/ThemeProvider';\n`;
  
  // Find last import
  const lastImportIndex = content.lastIndexOf('import ');
  const nextLineIndex = content.indexOf('\n', lastImportIndex);
  content = content.slice(0, nextLineIndex + 1) + themeImport + content.slice(nextLineIndex + 1);

  // Remove COLORS from DesignSystem import
  content = content.replace(/,\s*COLORS/g, '');
  content = content.replace(/COLORS,\s*/g, '');

  // Inject const { theme } = useTheme(); after function signature
  const funcRegex = /export default function \w+\([^)]*\)\s*\{/;
  const funcMatch = content.match(funcRegex);
  
  if (funcMatch) {
    const insertPos = funcMatch.index + funcMatch[0].length;
    content = content.slice(0, insertPos) + '\n  const { theme, themeType } = useTheme();\n' + content.slice(insertPos);
  }

  // Replace COLORS. with theme.
  content = content.replace(/COLORS\./g, 'theme.');

  fs.writeFileSync(absolutePath, content, 'utf8');
  console.log('Processed', file);
});
