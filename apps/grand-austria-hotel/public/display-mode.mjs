// Keep this outside the re-rendered game so fullscreen survives seat/scene changes.
export function initDisplayMode(doc=document){
  const button=doc.getElementById('toggle-fullscreen'),label=doc.getElementById('fullscreen-label'),hint=doc.getElementById('fullscreen-hint');
  const root=doc.documentElement;
  let immersive=false,pending=false,hintTimer;
  const native=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
  function message(text){
    clearTimeout(hintTimer);hint.textContent=text;hint.hidden=!text;
    if(text)hintTimer=setTimeout(()=>{hint.hidden=true;},6500);
  }
  function sync(){
    const active=Boolean(native()||immersive);
    doc.body.classList.toggle('display-active',active);
    button.setAttribute('aria-pressed',String(active));
    button.setAttribute('aria-label',active?'退出全屏':'全屏');
    label.textContent=active?'退出全屏':'全屏';
    button.title=active?'退出全屏或沉浸模式（Esc）':'全屏游玩';
  }
  async function toggle(){
    if(pending)return;
    pending=true;button.disabled=true;
    try{
      if(native()){
        const exit=doc.exitFullscreen||doc.webkitExitFullscreen;
        if(exit)await exit.call(doc);
      }else if(immersive){immersive=false;message('');}
      else{
        const request=root.requestFullscreen||root.webkitRequestFullscreen;
        if(request){
          try{await request.call(root);}
          catch{immersive=true;message('已切换沉浸布局。此浏览器暂时不能隐藏地址栏。');}
        }else{immersive=true;message('已切换沉浸布局。此浏览器暂时不能隐藏地址栏。');}
      }
    }catch{message('暂时无法退出，请使用浏览器的全屏退出功能。');}
    finally{pending=false;button.disabled=false;sync();}
  }
  const changed=()=>{if(native())immersive=false;sync();};
  const key=e=>{if(e.key==='Escape'&&immersive){immersive=false;message('');sync();}};
  button.addEventListener('click',toggle);
  doc.addEventListener('fullscreenchange',changed);doc.addEventListener('webkitfullscreenchange',changed);doc.addEventListener('keydown',key);
  sync();
  return {toggle,dispose(){clearTimeout(hintTimer);button.removeEventListener('click',toggle);doc.removeEventListener('fullscreenchange',changed);doc.removeEventListener('webkitfullscreenchange',changed);doc.removeEventListener('keydown',key);}};
}
