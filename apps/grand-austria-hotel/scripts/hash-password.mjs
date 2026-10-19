import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { hashPassword } from '../lib/auth.mjs';
const rl=createInterface({input:stdin,output:stdout});
try{const password=await rl.question('输入统一管理员密码（至少9字符；输入会显示）：');console.log(await hashPassword(password));}finally{rl.close();}
