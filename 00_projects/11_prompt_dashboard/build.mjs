import { build } from 'vite';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync, mkdirSync, existsSync, renameSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const entries = {
  'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
  'content/chatgpt': resolve(__dirname, 'src/content/chatgpt.ts'),
  'content/claude': resolve(__dirname, 'src/content/claude.ts'),
  'content/gemini': resolve(__dirname, 'src/content/gemini.ts'),
  'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
  'dashboard/dashboard': resolve(__dirname, 'src/dashboard/dashboard.ts'),
};

// 各エントリーポイントを個別にビルド
for (const [name, entry] of Object.entries(entries)) {
  console.log(`Building ${name}...`);
  
  // 出力ディレクトリを作成
  const outputPath = resolve(__dirname, 'dist', name + '.js');
  const outputDir = outputPath.substring(0, outputPath.lastIndexOf('/') || outputPath.lastIndexOf('\\'));
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // 一時的な出力ディレクトリでビルド
  const tempOutDir = resolve(__dirname, 'dist', `temp_${name.replace(/\//g, '_')}`);
  await build({
    build: {
      outDir: tempOutDir,
      rollupOptions: {
        input: entry,
        output: {
          entryFileNames: 'index.js',
          format: 'iife',
          inlineDynamicImports: true,
        },
      },
    },
  });
  
  // ファイルを正しい場所に移動
  const tempFile = resolve(tempOutDir, 'index.js');
  if (existsSync(tempFile)) {
    copyFileSync(tempFile, outputPath);
    // 一時ディレクトリを削除
    const { rmSync } = await import('fs');
    rmSync(tempOutDir, { recursive: true, force: true });
  }
}

// HTMLファイルとCSSファイルをコピー
const htmlFiles = [
  { src: 'src/popup/popup.html', dest: 'dist/popup/popup.html' },
  { src: 'src/dashboard/dashboard.html', dest: 'dist/dashboard/dashboard.html' },
];

htmlFiles.forEach(({ src, dest }) => {
  const srcPath = resolve(__dirname, src);
  const destPath = resolve(__dirname, dest);
  const destDir = destPath.substring(0, destPath.lastIndexOf('/') || destPath.lastIndexOf('\\'));
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
  }
});

const cssFiles = [
  { src: 'src/popup/popup.css', dest: 'dist/popup/popup.css' },
  { src: 'src/dashboard/dashboard.css', dest: 'dist/dashboard/dashboard.css' },
];

cssFiles.forEach(({ src, dest }) => {
  const srcPath = resolve(__dirname, src);
  const destPath = resolve(__dirname, dest);
  const destDir = destPath.substring(0, destPath.lastIndexOf('/') || destPath.lastIndexOf('\\'));
  if (!existsSync(destDir)) {
    mkdirSync(destDir, { recursive: true });
  }
  if (existsSync(srcPath)) {
    copyFileSync(srcPath, destPath);
  }
});

// manifest.jsonをコピー
const manifestSrc = resolve(__dirname, 'manifest.json');
const manifestDest = resolve(__dirname, 'dist/manifest.json');
if (existsSync(manifestSrc)) {
  copyFileSync(manifestSrc, manifestDest);
}

// アイコンファイルをコピー
const iconSrc = resolve(__dirname, 'src/icons/icon-128.png');
const iconDest = resolve(__dirname, 'dist/icons/icon-128.png');
const iconDestDir = resolve(__dirname, 'dist/icons');
if (!existsSync(iconDestDir)) {
  mkdirSync(iconDestDir, { recursive: true });
}
if (existsSync(iconSrc)) {
  copyFileSync(iconSrc, iconDest);
}

console.log('Build completed!');

