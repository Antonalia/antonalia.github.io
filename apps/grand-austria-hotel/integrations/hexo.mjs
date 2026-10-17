// Mounted by the blog's local Hexo server. Nothing here runs in GitHub Pages.
import { fileURLToPath } from 'node:url';
import { createApi } from '../lib/api.mjs';
import { LocalStore } from '../lib/store.mjs';
import { createHttpHandler } from '../lib/http.mjs';

export function createBlogGame({basePath='/friends-hotel',store,passwordHash,allowLocalSetup=true}={}){
  if(!/^\/[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(basePath))throw new Error('Invalid blog game path');
  // Separate local save keeps an independently running standalone preview from racing this process.
  store ||= new LocalStore(fileURLToPath(new URL('../.private/blog-state.json',import.meta.url)));
  const api=createApi({store,passwordHash,allowLocalSetup});
  return createHttpHandler(api,{configScript:`window.HOTEL_API_BASE = ${JSON.stringify(basePath)};\n`});
}
