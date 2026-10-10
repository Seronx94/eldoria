// Original icons drawn on a 32-pixel grid; decorative, with readable button labels.
const icons:Record<string,string>={
  'cycle-target':'<path fill="#dfbc70" d="M10 3h12v3h4v4h3v12h-3v4h-4v3H10v-3H6v-4H3V10h3V6h4zm1 5v3H8v10h3v3h10v-3h3V11h-3V8z"/><path fill="#f5ead0" d="M14 0h4v12h-4zm0 20h4v12h-4zM0 14h12v4H0zm20 0h12v4H20z"/>',
  attack:'<path fill="#111f26" d="M23 2h7v7L16 23l3 3-4 4-5-5-6 6-3-3 6-6-5-5 4-4 3 3z"/><path fill="#80abb6" d="M24 4h4v4L14 22l-4-4z"/><path fill="#e0f5f0" d="M24 4h4L12 20l-2-2z"/><path fill="#e7b664" d="m5 14 14 14-3 2L2 17z"/><path fill="#9c5d36" d="m8 23 3 3-5 5-3-3z"/>',
  cast:'<path fill="#672c2c" d="M15 1h4v7h5v6h4v10h-4v5H9v-4H5V14h5V8h5z"/><path fill="#ef7132" d="M16 4h2v8h5v5h3v7h-4v3H10v-4H7v-7h5v-5h4z"/><path fill="#ffd477" d="M16 12h3v7h3v5h-4v2h-5v-3h-3v-5h4v-3h2z"/><path fill="#fff4c5" d="M16 19h3v5h-4v-3h1z"/><path fill="#ffca67" d="M2 4h3v3H2zm24 4h3v3h-3z"/>',
  potion:'<path fill="#15282d" d="M11 1h10v8h-2v3h4v4h3v11h-4v3H10v-3H6V16h3v-4h4V9h-2z"/><path fill="#bf965a" d="M12 2h8v5h-8z"/><path fill="#a9d8d2" d="M13 8h6v7h4v11h-3v2h-8v-2H9V15h4z"/><path fill="#bd374b" d="M10 18h12v7h-3v2h-6v-2h-3z"/><path fill="#f4afa2" d="M11 19h3v5h-3z"/><path fill="#e9fff0" d="M13 10h2v6h-2z"/>',
  loot:'<path fill="#e2ba65" d="M11 2h10l-3 7h-4z"/><path fill="#5f362b" d="M10 10h12v4h4v13h-4v3H10v-3H6V14h4z"/><path fill="#b78745" d="M11 12h10v3h3v11h-3v2H11v-2H8V15h3z"/><path fill="#f5cd75" d="M13 17h6v2h2v5h-2v2h-6v-2h-2v-5h2z"/><path fill="#926334" d="M15 19h2v5h-2z"/>',
  interact:'<path fill="#6d7a72" d="M10 3h12v3h4v24h-5V11h-3V8h-4v3h-3v19H6V6h4z"/><path fill="#bcc8ae" d="M11 4h10v3H11zM7 8h3v6H7zm16 0h2v6h-2z"/><path fill="#e6c476" d="M13 17h8v-4l8 6-8 6v-4h-8z"/>'
};
export function renderActionIcons():void {
  for(const [id,art]of Object.entries(icons)){
    const span=document.querySelector(`#${id}>span`)!;span.classList.add('action-icon');span.setAttribute('aria-hidden','true');
    span.innerHTML=`<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" focusable="false" aria-hidden="true">${art}</svg>`;
  }
}
