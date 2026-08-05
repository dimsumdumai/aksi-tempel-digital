import { defineConfig } from 'vite';
export default defineConfig({server:{host:true,proxy:{'/api':{target:process.env.VITE_API_PROXY||'http://localhost:3000',changeOrigin:true,secure:false}}}});
