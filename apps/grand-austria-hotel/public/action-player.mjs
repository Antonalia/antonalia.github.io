// Playback is presentation only: it never advances the authoritative game.
export function createActionPlayer({onFrame,onIdle,setTimer=setTimeout,clearTimer=clearTimeout,duration=1000}){
  let key=null,cursor=0,queue=[],timer=null,events=[],frame=null;
  function stop(notify=true){if(timer!==null)clearTimer(timer);timer=null;queue=[];frame=null;if(notify)onIdle?.();}
  function next(){timer=null;frame=queue.shift()||null;if(!frame){onIdle?.();return;}onFrame(frame);timer=setTimer(next,duration);}
  return {
    accept(activity,viewerId,nextKey){
      const serial=activity?.serial||0;events=activity?.events||[];
      if(key!==nextKey||serial<cursor){stop(false);key=nextKey;cursor=serial;return;}
      const fresh=events.filter(e=>e.id>cursor&&e.playerId!==viewerId);cursor=Math.max(cursor,serial);
      queue.push(...fresh);if(queue.length>48)queue=queue.slice(-48);
      if(timer===null&&queue.length)next();
    },
    replay(viewerId){const last=events.filter(e=>e.playerId!==viewerId).at(-1);if(!last)return false;stop(false);queue=events.filter(e=>e.group===last.group&&e.playerId===last.playerId);next();return true;},
    stop,
    reset(){stop(false);key=null;cursor=0;events=[];},
    get frame(){return frame;},
    get latest(){return events.at(-1)||null;}
  };
}
export const ACTIVITY_TEXT={guest:'正在挑选客人',dice:'正在选择骰子动作',food:'正在分配食物',staff:'正在挑选员工',rooms:'正在选择房间',turn:'正在查看饭店',idle:'等待操作'};
