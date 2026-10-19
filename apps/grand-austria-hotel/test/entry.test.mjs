import test from 'node:test';
import assert from 'node:assert/strict';
import {renderArrival} from '../public/arrival-view.mjs';
import {hashPassword,verifyPassword} from '../lib/auth.mjs';

test('统一管理员入口接受九字符密码，房间码入口不要求密码并正确转义昵称',async()=>{
  const password='135792468',hash=await hashPassword(password);
  assert.equal(await verifyPassword(password,hash),true);
  await assert.rejects(hashPassword('12345678'),/9–200/);
  const admin=renderArrival({configured:true},()=>'',{mode:'admin'});
  assert.match(admin,/data-form="login"/);assert.match(admin,/管理员密码/);assert.match(admin,/minlength="9"/);
  const guest=renderArrival({configured:true},()=>'',{mode:'room',code:'4321',name:'<script>test</script>'});
  assert.match(guest,/data-form="room-login"/);assert.match(guest,/pattern="\[0-9\]\{4\}"/);assert.match(guest,/value="4321"/);
  assert.doesNotMatch(guest,/name="password"|<script>/);assert.match(guest,/&lt;script&gt;/);
});
