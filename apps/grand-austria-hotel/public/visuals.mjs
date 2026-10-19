const paths={
  coffee:'<path d="M5 8h11v6a5 5 0 0 1-10 0V8Zm11 1h2a3 3 0 0 1 0 6h-2M3 21h17M8 5V2m5 3V2"/>',
  wine:'<path d="M7 3h10l1 5a6 6 0 0 1-12 0l1-5Zm5 11v7m-5 0h10M6 8h12"/>',
  cake:'<path d="M3 13h18v8H3v-8Zm0 0 12-8 6 8M3 17h18M15 5V2"/><circle cx="15" cy="4" r="1.3"/>',
  strudel:'<path d="M4 8h16l2 11H2L4 8Zm2 2 3 7m2-7 3 7m2-7 3 7M7 5l1-2m4 2 1-2m4 2 1-2"/>',
  money:'<circle cx="12" cy="12" r="9"/><path d="M15 7h-4a3 3 0 0 0 0 6h2a3 3 0 0 1 0 6m-1-15v16M8 17h5"/>',
  emperor:'<path d="m3 6 5 4 4-7 4 7 5-4-2 13H5L3 6Zm2 9h14"/>',
  vp:'<path d="m12 2 3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1 3-6Z"/>',
  key:'<circle cx="8" cy="8" r="5"/><path d="m12 12 9 9m-4-4 3-3m-7-1 3-3"/>',
  bell:'<path d="M3 18h18M5 16a7 7 0 0 1 14 0H5Zm7-7V6M2 21h20"/>',
  door:'<path d="M5 22V3h14v19M2 22h20M8 22V6h8v16m-3-7h1"/>',
  reset:'<path d="M3 4v6h6M3 10a9 9 0 1 1 2 9"/>',
  arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
  book:'<path d="M3 4h7l2 2 2-2h7v16h-7l-2 2-2-2H3V4Zm9 2v16"/>'
};
const filled={
  invite:'<circle cx="9" cy="6" r="4" fill="#2581b4" stroke="#16496a" stroke-width="1.4"/><path d="M2 21v-5a7 7 0 0 1 14 0v5H2Z" fill="#2581b4" stroke="#16496a" stroke-width="1.4"/><circle cx="17" cy="16" r="6" fill="#3f8a47" stroke="#fff7dc" stroke-width="1.5"/><path d="M17 12.8v6.4m-3.2-3.2h6.4" stroke="#fff9e6" stroke-width="2.2"/>',
  cards:'<rect x="2" y="2" width="15" height="18" rx="2" fill="#c2dce8" stroke="#244e6b" stroke-width="1.5"/><rect x="7" y="5" width="15" height="18" rx="2" fill="#fff1c5" stroke="#9b702d" stroke-width="1.5"/><circle cx="14.5" cy="11" r="2.8" fill="#315e77"/><path d="M10 19v-2a4.5 4.5 0 0 1 9 0v2h-9Z" fill="#315e77"/>',
  'room-lock':'<path d="M7 10V7a5 5 0 0 1 10 0v3" stroke="currentColor" stroke-width="3.5"/><path d="M5 9h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V11a2 2 0 0 1 2-2Zm7 4a2 2 0 0 0-1 3.73V20h2v-3.27A2 2 0 0 0 12 13Z" fill="currentColor" fill-rule="evenodd"/>',
  'room-bed':'<path d="M2 5v17m20-8v8M2 18h20" stroke="currentColor" stroke-width="2.8"/><rect x="5" y="9" width="5" height="7" rx="1" fill="currentColor"/><path d="M11 11h8a3 3 0 0 1 3 3v2H11v-5Z" fill="currentColor"/>',
  'room-resident':'<path d="M7 2h10v3H7V2Zm0 4h10a5 5 0 0 1-10 0ZM3 23v-7a7 7 0 0 1 6-7l3 5 3-5a7 7 0 0 1 6 7v7H3Z" fill="currentColor"/><path d="m10 10 2 4 2-4m-2 4v8" stroke="var(--door-fill,#358bc5)" stroke-width="1.2"/><circle cx="15" cy="17" r="1" fill="var(--door-fill,#358bc5)"/><circle cx="15" cy="20" r="1" fill="var(--door-fill,#358bc5)"/>',
  reward:'<rect x="3" y="10" width="18" height="12" rx="2" fill="#dcebc5" stroke="#467445" stroke-width="1.5"/><path d="M2 7h20v5H2Z" fill="#75a166" stroke="#467445" stroke-width="1.5"/><path d="M12 7v15M12 7C2 8 4-2 9 3l3 4Zm0 0c10 1 8-9 3-4l-3 4Z" stroke="#315c37" stroke-width="1.7"/>',
  penalty:'<path d="m12 2 11 19H1L12 2Z" fill="#d97055" stroke="#983c2b" stroke-width="1.5"/><path d="M12 8v6" stroke="#fff4df" stroke-width="2.5"/><circle cx="12" cy="18" r="1.3" fill="#fff4df"/>',
  coin:'<circle cx="12" cy="12" r="10" fill="#efb938" stroke="#9e6720" stroke-width="1.5"/><circle cx="12" cy="12" r="7.2" fill="#ffda72" stroke="#cc932e" stroke-width="1.2"/><path d="M14.5 7.8h-3a2.2 2.2 0 0 0 0 4.4h1a2.2 2.2 0 0 1 0 4.4h-3M12 6v12" stroke="#a96c21" stroke-width="1.6"/><path d="M6 6.5a8 8 0 0 1 7-2" stroke="#fff0ac" stroke-width="1.5"/>',
  coffee:'<ellipse cx="11" cy="20" rx="9" ry="2" fill="#bba27b"/><path d="M5 7h12v7a6 6 0 0 1-12 0V7Z" fill="#fff8e6" stroke="#624530" stroke-width="1.4"/><path d="M17 9h2a3 3 0 0 1 0 6h-2" stroke="#624530" stroke-width="2"/><ellipse cx="11" cy="8" rx="6" ry="2" fill="#693e28"/><path d="M8 4c-2-2 1-2 0-3m5 3c-2-2 1-2 0-3" stroke="#a17f59" stroke-width="1.4"/>',
  wine:'<path d="M7 2h10l1 7a6 6 0 0 1-12 0l1-7Z" fill="#fff5e6" stroke="#653733" stroke-width="1.4"/><path d="M6.4 8h11.2l.2 2a5.8 5.8 0 0 1-11.6 0Z" fill="#b62d43"/><path d="M12 15v6m-4 1h8" stroke="#653733" stroke-width="1.8"/><path d="M9 4v3" stroke="#fff" stroke-width="1.5"/>',
  cake:'<path d="m3 11 13-7 5 7v10H3V11Z" fill="#fff3c6" stroke="#8a5932" stroke-width="1.3"/><path d="M3 15h18v3H3Z" fill="#a8583c"/><path d="M3 11h18v3H3Z" fill="#fffdf0"/><path d="M16 4c-2-2 0-3 1-3" stroke="#527544" stroke-width="1.2"/><circle cx="16" cy="5" r="2.4" fill="#c0443e"/><path d="M4 20h17" stroke="#e1bd72" stroke-width="1.4"/>',
  strudel:'<ellipse cx="12" cy="19" rx="10" ry="3" fill="#faf0d4" stroke="#a98b56" stroke-width="1.2"/><path d="M4 11c0-5 16-5 16 0v5c0 4-16 4-16 0v-5Z" fill="#d58c28" stroke="#8e5a24" stroke-width="1.2"/><ellipse cx="12" cy="11" rx="8" ry="4" fill="#f4c56c"/><path d="m7 8 3 6m2-7 3 6m2-5 2 4" stroke="#fff1b9" stroke-width="2"/><path d="M8 4V2m5 2V1m4 3V2" stroke="#ad8c53" stroke-width="1.3"/>',
  money:'<rect x="1" y="5" width="20" height="14" rx="2" fill="#327653" stroke="#23553b" stroke-width="1.2"/><rect x="3" y="7" width="16" height="10" rx="1" fill="#e0e3a5"/><ellipse cx="11" cy="12" rx="4" ry="4.5" fill="#549163"/><path d="M5 10v4m12-4v4" stroke="#549163" stroke-width="1.3"/><circle cx="19" cy="17" r="4" fill="#efbf50" stroke="#9d772f" stroke-width="1.2"/><path d="M19 14.8v4.4" stroke="#ab7b2a" stroke-width="1.3"/>',
  emperor:'<path d="m2 7 5 4 5-8 5 8 5-4-3 14H5L2 7Z" fill="#f5bd3b" stroke="#975c20" stroke-width="1.5"/><path d="M5 17h14v4H5Z" fill="#d58b28"/><path d="m5 9 3 4 4-7 4 7 3-4" stroke="#ffe391" stroke-width="2"/><circle cx="12" cy="15" r="1.8" fill="#bf4640"/><circle cx="2" cy="6" r="1.4" fill="#e6a62e"/><circle cx="12" cy="3" r="1.4" fill="#e6a62e"/><circle cx="22" cy="6" r="1.4" fill="#e6a62e"/>',
  vp:'<path d="m12 1 3.4 6.7L23 9l-5.5 5.4 1.3 7.6-6.8-3.6L5.2 22l1.3-7.6L1 9l7.6-1.3L12 1Z" fill="#f6bf36" stroke="#ad6b21" stroke-width="1.3"/><path d="m12 4 2 5 5 .8-4 3.8-3-2-3 2 .8-4.6L12 4Z" fill="#ffdf7c"/>',
  lock:'<rect x="5" y="10" width="14" height="12" rx="2" fill="#fff7de" stroke="#593e22" stroke-width="1.5"/><path d="M8 10V6a4 4 0 0 1 8 0v4" stroke="#fff4d3" stroke-width="2.7"/><circle cx="12" cy="15" r="1.8" fill="#7d5b31"/><path d="M12 15v3" stroke="#7d5b31" stroke-width="1.6"/>',
  resident:'<circle cx="12" cy="6" r="4" fill="#fff3d7"/><path d="M5 22v-6a7 7 0 0 1 14 0v6H5Z" fill="#fff3d7"/><path d="m10 13 2 4 2-4m-2 4v5" stroke="#9a7842" stroke-width="1.2"/>',
  bed:'<path d="M3 4v17m18-10v10M3 17h18M5 9h5v7H5V9Zm5 2h10v6H10v-6Z" stroke="#fff6dc" stroke-width="2"/>'
};
export function icon(name){return `<svg class="icon${filled[name]?' icon-colored icon-'+name:''}" viewBox="0 0 24 24" fill="none" stroke="${filled[name]?'none':'currentColor'}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${filled[name]||paths[name]||paths.bell}</svg>`;}
const pips={1:[[12,12]],2:[[7,7],[17,17]],3:[[7,7],[12,12],[17,17]],4:[[7,7],[17,7],[7,17],[17,17]],5:[[7,7],[17,7],[12,12],[7,17],[17,17]],6:[[7,6],[17,6],[7,12],[17,12],[7,18],[17,18]]};
export function dieIcon(n){return `<svg class="die-face" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="4"/>${pips[n].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.7"/>`).join('')}</svg>`;}
