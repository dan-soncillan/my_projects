import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        'background/service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
        'content/chatgpt': resolve(__dirname, 'src/content/chatgpt.ts'),
        'content/claude': resolve(__dirname, 'src/content/claude.ts'),
        'content/gemini': resolve(__dirname, 'src/content/gemini.ts'),
        'popup/popup': resolve(__dirname, 'src/popup/popup.ts'),
        'dashboard/dashboard': resolve(__dirname, 'src/dashboard/dashboard.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        // 各エントリーポイントを完全に独立したバンドルにする
        // Chrome拡張機能では各スクリプトが独立している必要がある
      },
    },
  },
  plugins: [
    {
      name: 'copy-html-css',
      closeBundle() {
        // HTMLファイルをコピー
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
        
        // CSSファイルをコピー
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
      },
    },
  ],
});
