import {defineConfig} from '@playwright/test';

const external=process.env.PLAYWRIGHT_BASE_URL;
export default defineConfig({
 testDir:'tests/e2e',
 timeout:60000,
 use:{baseURL:external||'http://127.0.0.1:3000',headless:true},
 webServer:external?undefined:{command:'npm run build && npm run start -- --hostname 127.0.0.1',url:'http://127.0.0.1:3000',reuseExistingServer:!process.env.CI,timeout:120000}
});
