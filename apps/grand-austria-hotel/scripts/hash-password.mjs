import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { hashPassword } from '../lib/auth.mjs';
const rl=createInterface({input:stdin,output:stdout});
try{const password=await rl.question('输入用于未来部署的好友访问密码（至少12字符；输入会显示）：');console.log(await hashPassword(password));}finally{rl.close();}
