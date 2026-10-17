// Ephemeral UI-test server. This does not read/write the real local save or Neon.
import { createApi } from '../lib/api.mjs';
import { createHttpServer } from '../lib/http.mjs';
import { LocalStore } from '../lib/store.mjs';
import { hashPassword,RateLimiter } from '../lib/auth.mjs';
if(process.env.UI_TEST_ONLY!=='1')throw new Error('Set UI_TEST_ONLY=1 for the isolated UI test fixture.');
const api=createApi({store:new LocalStore(),passwordHash:await hashPassword('local-ui-test-only'),allowedOrigins:['http://localhost:4174','http://127.0.0.1:4174'],rateLimiter:new RateLimiter({disabled:true})});
const server=createHttpServer(api);server.listen(4174,'127.0.0.1',()=>console.log('Isolated UI test fixture · http://localhost:4174/'));
