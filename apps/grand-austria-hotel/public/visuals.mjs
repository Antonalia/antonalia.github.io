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
export function icon(name){return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]||paths.bell}</svg>`;}
const pips={1:[[12,12]],2:[[7,7],[17,17]],3:[[7,7],[12,12],[17,17]],4:[[7,7],[17,7],[7,17],[17,17]],5:[[7,7],[17,7],[12,12],[7,17],[17,17]],6:[[7,6],[17,6],[7,12],[17,12],[7,18],[17,18]]};
export function dieIcon(n){return `<svg class="die-face" viewBox="0 0 24 24" aria-hidden="true"><rect x="1" y="1" width="22" height="22" rx="4"/>${pips[n].map(([cx,cy])=>`<circle cx="${cx}" cy="${cy}" r="1.7"/>`).join('')}</svg>`;}
