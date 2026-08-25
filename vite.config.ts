import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id: string) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  base: './',
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-rnd',
      'lucide-react'
    ]
  },
  server: {
    port: 54321,
    strictPort: true,
    watch: {
      ignored: [
        '**/node_modules/**',
        '**/dist/**',
        '**/electron/**',
        '**/.git/**',
        '**/engine/**',
        '**/clips/**',
        '**/temp/**',
        '**/backgrounds/**',
        '**/outputs/**',
        '**/*.mp4',
        '**/*.txt',
        '**/*.wav',
        '**/*.m4a'
      ]
    }
  }
})
