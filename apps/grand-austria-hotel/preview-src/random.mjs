// Browser-only replacement. Live games keep Node's crypto on the server.
export function randomInt(max){
  if(!Number.isInteger(max)||max<=0||max>0x100000000)throw new Error('Invalid random bound');
  const limit=0x100000000-(0x100000000%max),buffer=new Uint32Array(1);
  do{crypto.getRandomValues(buffer);}while(buffer[0]>=limit);
  return buffer[0]%max;
}
