import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests/browser',use:{baseURL:'http://127.0.0.1:5173',launchOptions:{executablePath:process.env.CHROMIUM_PATH||undefined,args:['--no-sandbox','--disable-dev-shm-usage']},viewport:{width:1440,height:1000}},webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},workers:1});
