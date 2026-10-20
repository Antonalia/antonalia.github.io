// Move one persistent control between page and game headers; never clone its listeners.
export function initDisplayMode(doc=document){
  const button=doc.getElementById('toggle-fullscreen'),label=doc.getElementById('fullscreen-label'),hint=doc.getElementById('fullscreen-hint');
  const root=doc.documentElement,win=doc.defaultView;
  const help=doc.getElementById('display-help'),helpClose=doc.getElementById('display-help-close');
  const controls=doc.getElementById('display-controls'),home=controls?.parentElement;
  const standaloneMedia=win?.matchMedia?.('(display-mode: standalone)');
  const standalone=()=>Boolean(win?.navigator?.standalone||standaloneMedia?.matches);
  let immersive=false,pending=false,hintTimer,mountHidden=false;
  const native=()=>doc.fullscreenElement||doc.webkitFullscreenElement;
  function helpOpen(open){
    if(help){help.hidden=!open;if(open)helpClose?.focus();else if(!mountHidden)button.focus?.();}
    sync();
  }
  function fallback(){
    immersive=true;
    message('已使用沉浸布局。若要隐藏地址栏和导航栏，请添加到主屏幕后打开。');
    helpOpen(true);
  }
  // Browser bars and the keyboard change the visual viewport on mobile.
  // Keep the table inside the available height without blocking pinch zoom.
  function resize(){
    if(!win||win.visualViewport?.scale&&Math.abs(win.visualViewport.scale-1)>.01)return;
    const height=Math.min(win.innerHeight,win.visualViewport?.height||win.innerHeight);
    if(height>0)root.style?.setProperty('--game-viewport-height',`${Math.floor(height)}px`);
  }
  function message(text){
    clearTimeout(hintTimer);hint.textContent=text;hint.hidden=!text;
    if(text)hintTimer=setTimeout(()=>{hint.hidden=true;},6500);
  }
  function sync(){
    const active=Boolean(native()||immersive||standalone());
    doc.body.classList.toggle('display-active',active);
    doc.body.classList.toggle('display-standalone',standalone());
    if(controls)controls.hidden=mountHidden||standalone()||Boolean(help&&!help.hidden);
    button.setAttribute('aria-pressed',String(active));
    const text=native()?'退出全屏':immersive?'退出沉浸':'全屏';
    button.setAttribute('aria-label',text);
    label.textContent=text;
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
          catch{fallback();}
        }else{fallback();}
      }
    }catch{message('暂时无法退出，请使用浏览器的全屏退出功能。');}
    finally{pending=false;button.disabled=false;sync();}
  }
  const changed=()=>{if(native())immersive=false;sync();};
  const key=e=>{if(e.key!=='Escape')return;if(help&&!help.hidden){helpOpen(false);return;}if(immersive){immersive=false;message('');sync();}};
  const closeHelp=()=>helpOpen(false),outside=e=>{if(e.target===help)closeHelp();};
  button.addEventListener('click',toggle);
  helpClose?.addEventListener('click',closeHelp);help?.addEventListener('click',outside);
  doc.addEventListener('fullscreenchange',changed);doc.addEventListener('webkitfullscreenchange',changed);doc.addEventListener('keydown',key);
  win?.addEventListener('resize',resize);win?.visualViewport?.addEventListener('resize',resize);standaloneMedia?.addEventListener('change',changed);
  resize();sync();
  return {toggle,mount(target=home,{hidden=false}={}){mountHidden=hidden;if(controls&&target)target.append(controls);sync();},dispose(){clearTimeout(hintTimer);button.removeEventListener('click',toggle);helpClose?.removeEventListener('click',closeHelp);help?.removeEventListener('click',outside);doc.removeEventListener('fullscreenchange',changed);doc.removeEventListener('webkitfullscreenchange',changed);doc.removeEventListener('keydown',key);win?.removeEventListener('resize',resize);win?.visualViewport?.removeEventListener('resize',resize);standaloneMedia?.removeEventListener('change',changed);}};
}
