import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

const manualChunks = (id: string) => {
  if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
    return 'react-vendor';
  }

  if (id.includes('@supabase/supabase-js') || id.includes('socket.io-client')) {
    return 'supabase-vendor';
  }

  if (id.includes('framer-motion') || id.includes('lucide-react')) {
    return 'motion-vendor';
  }

  if (id.includes('recharts')) {
    return 'charts-vendor';
  }

  return undefined;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000';

  return {
    plugins: [react()],
    build: {
      rollupOptions: {
        output: {
          manualChunks
        }
      }
    },
    server: {
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true
        },
        '/socket.io': {
          target: apiTarget,
          ws: true,
          changeOrigin: true
        }
      }
    },
    preview: {
      host: '0.0.0.0',
      port: Number(process.env.PORT || 4173)
    }
  };
});
