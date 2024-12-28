import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, '../public');
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');
const NODE_MODULES = path.join(__dirname, '../node_modules');

async function ensureDir(dir) {
    try {
        await fs.access(dir);
    } catch {
        await fs.mkdir(dir, { recursive: true });
    }
}

async function copyFile(src, dest) {
    try {
        await fs.copyFile(src, dest);
        console.log(`Copied ${src} to ${dest}`);
    } catch (error) {
        console.error(`Error copying ${src}:`, error);
    }
}

async function setup() {
    // 确保资源目录存在
    await ensureDir(ASSETS_DIR);

    // 复制 Vue
    await copyFile(
        path.join(NODE_MODULES, 'vue/dist/vue.global.js'),
        path.join(ASSETS_DIR, 'vue.js')
    );

    // 复制 Axios
    await copyFile(
        path.join(NODE_MODULES, 'axios/dist/axios.min.js'),
        path.join(ASSETS_DIR, 'axios.js')
    );

    console.log('Assets setup completed!');
}

setup().catch(console.error);
