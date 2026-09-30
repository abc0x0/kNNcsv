
const csvFile = document.getElementById('csvFile');
const fileStatus = document.getElementById('fileStatus');
const loadExample = document.getElementById('loadExample');
const xValue = document.getElementById('xValue');
const yValue = document.getElementById('yValue');
const kValue = document.getElementById('kValue');
const classifyBtn = document.getElementById('classifyBtn');
const result = document.getElementById('result');
const canvas = document.getElementById('plot');
const ctx = canvas.getContext('2d');
const legend = document.getElementById('legend');
const neighborsBody = document.getElementById('neighborsBody');
const resetView = document.getElementById('resetView');
const installBtn = document.getElementById('installBtn');

let data = [];
let current = null;
let neighbors = [];
let classColors = new Map();
let deferredPrompt = null;

const palette = [
  '#2563eb','#dc2626','#16a34a','#7c3aed','#ea580c',
  '#0891b2','#be123c','#4f46e5','#65a30d','#a16207'
];

function parseCSV(text){
  const lines = text.trim().split(/\r?\n/).filter(Boolean);
  if(lines.length < 2) throw new Error('El CSV debe tener encabezado y al menos una fila.');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const xi = headers.indexOf('x');
  const yi = headers.indexOf('y');
  const ci = headers.indexOf('clase');
  if(xi < 0 || yi < 0 || ci < 0){
    throw new Error('El encabezado debe contener: x,y,clase');
  }

  const rows = [];
  for(let i=1;i<lines.length;i++){
    const cols = lines[i].split(',').map(v => v.trim());
    const x = Number(cols[xi]);
    const y = Number(cols[yi]);
    const clase = cols[ci];
    if(!Number.isFinite(x) || !Number.isFinite(y) || !clase){
      throw new Error(`Fila ${i+1} inválida.`);
    }
    rows.push({x,y,clase});
  }
  return rows;
}

function refreshKOptions(){
  const max = data.length;
  const choices = [1,3,5,7,9].filter(v => v <= max);
  if(max > 0 && !choices.includes(max) && max < 9) choices.push(max);
  choices.sort((a,b)=>a-b);
  kValue.innerHTML = choices.map(v => `<option value="${v}">${v}</option>`).join('');
  if(choices.includes(3)) kValue.value = '3';
}

function assignColors(){
  classColors.clear();
  [...new Set(data.map(d=>d.clase))].forEach((c,i)=>{
    classColors.set(c, palette[i % palette.length]);
  });
}

function updateLegend(){
  legend.innerHTML = '';
  classColors.forEach((color, clase)=>{
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="swatch" style="background:${color}"></span>${escapeHtml(clase)}`;
    legend.appendChild(item);
  });
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, c => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[c]));
}

function classify(){
  if(data.length === 0){
    alert('Primero carga un archivo CSV o usa los datos de ejemplo.');
    return;
  }

  const x = Number(xValue.value);
  const y = Number(yValue.value);
  const k = Number(kValue.value);

  if(!Number.isFinite(x) || !Number.isFinite(y)){
    alert('Introduce valores numéricos válidos para X y Y.');
    return;
  }

  const ranked = data.map((d,idx)=>({
    ...d,
    idx,
    dist: Math.hypot(d.x - x, d.y - y)
  })).sort((a,b)=>a.dist-b.dist);

  neighbors = ranked.slice(0, Math.min(k, ranked.length));

  const votes = new Map();
  for(const n of neighbors){
    if(!votes.has(n.clase)) votes.set(n.clase,{count:0, distSum:0});
    const v = votes.get(n.clase);
    v.count++;
    v.distSum += n.dist;
  }

  const winner = [...votes.entries()].sort((a,b)=>{
    if(b[1].count !== a[1].count) return b[1].count - a[1].count;
    return a[1].distSum - b[1].distSum;
  })[0][0];

  current = {x,y,clase:winner};

  const voteText = [...votes.entries()]
    .sort((a,b)=>b[1].count-a[1].count)
    .map(([c,v])=>`${escapeHtml(c)}: ${v.count}`)
    .join(' · ');

  result.innerHTML = `<strong>Clase predicha: ${escapeHtml(winner)}</strong><br>
                      <span class="muted">k = ${neighbors.length} · ${voteText}</span>`;
  result.classList.remove('hidden');

  neighborsBody.innerHTML = neighbors.map((n,i)=>`
    <tr>
      <td>${i+1}</td>
      <td>${n.x}</td>
      <td>${n.y}</td>
      <td>${escapeHtml(n.clase)}</td>
      <td>${n.dist.toFixed(3)}</td>
    </tr>
  `).join('');

  draw();
}

function bounds(){
  const pts = data.map(d=>({x:d.x,y:d.y}));
  if(current) pts.push(current);
  if(pts.length === 0) return {minX:0,maxX:10,minY:0,maxY:10};

  let minX = Math.min(...pts.map(p=>p.x));
  let maxX = Math.max(...pts.map(p=>p.x));
  let minY = Math.min(...pts.map(p=>p.y));
  let maxY = Math.max(...pts.map(p=>p.y));

  if(minX === maxX){minX -= 1; maxX += 1;}
  if(minY === maxY){minY -= 1; maxY += 1;}

  const px = (maxX-minX)*0.12;
  const py = (maxY-minY)*0.12;
  return {minX:minX-px,maxX:maxX+px,minY:minY-py,maxY:maxY+py};
}

function draw(){
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  const cssSize = canvas.getBoundingClientRect().width || 320;
  const size = Math.round(cssSize * dpr);
  if(canvas.width !== size || canvas.height !== size){
    canvas.width = size;
    canvas.height = size;
  }

  ctx.clearRect(0,0,size,size);
  ctx.save();
  ctx.scale(dpr,dpr);

  const W = cssSize;
  const H = cssSize;
  const m = 42;
  const b = bounds();
  const sx = v => m + (v-b.minX)/(b.maxX-b.minX)*(W-2*m);
  const sy = v => H-m - (v-b.minY)/(b.maxY-b.minY)*(H-2*m);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0,0,W,H);

  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 1;
  for(let i=0;i<=5;i++){
    const gx = m + i*(W-2*m)/5;
    const gy = m + i*(H-2*m)/5;
    ctx.beginPath(); ctx.moveTo(gx,m); ctx.lineTo(gx,H-m); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(m,gy); ctx.lineTo(W-m,gy); ctx.stroke();
  }

  ctx.strokeStyle = '#111827';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(m,H-m); ctx.lineTo(W-m,H-m);
  ctx.moveTo(m,H-m); ctx.lineTo(m,m);
  ctx.stroke();

  ctx.fillStyle = '#374151';
  ctx.font = '12px system-ui';
  ctx.textAlign = 'center';
  ctx.fillText('X', W/2, H-10);
  ctx.save();
  ctx.translate(13,H/2);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('Y',0,0);
  ctx.restore();

  if(current && neighbors.length){
    ctx.strokeStyle = '#9ca3af';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([5,5]);
    for(const n of neighbors){
      ctx.beginPath();
      ctx.moveTo(sx(current.x), sy(current.y));
      ctx.lineTo(sx(n.x), sy(n.y));
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  for(const d of data){
    const isNeighbor = neighbors.some(n=>n.idx===data.indexOf(d));
    ctx.beginPath();
    ctx.arc(sx(d.x), sy(d.y), isNeighbor ? 7 : 5, 0, Math.PI*2);
    ctx.fillStyle = classColors.get(d.clase) || '#6b7280';
    ctx.fill();
    if(isNeighbor){
      ctx.strokeStyle = '#111827';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  if(current){
    const x = sx(current.x), y = sy(current.y);
    ctx.fillStyle = '#111827';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for(let i=0;i<5;i++){
      const a = -Math.PI/2 + i*2*Math.PI/5;
      const r1 = 11, r2 = 4.8;
      const x1=x+Math.cos(a)*r1, y1=y+Math.sin(a)*r1;
      const a2=a+Math.PI/5;
      const x2=x+Math.cos(a2)*r2, y2=y+Math.sin(a2)*r2;
      if(i===0) ctx.moveTo(x1,y1); else ctx.lineTo(x1,y1);
      ctx.lineTo(x2,y2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  ctx.restore();
}

csvFile.addEventListener('change', async e=>{
  const file = e.target.files[0];
  if(!file) return;
  try{
    const text = await file.text();
    data = parseCSV(text);
    current = null;
    neighbors = [];
    assignColors();
    updateLegend();
    refreshKOptions();
    fileStatus.textContent = `${file.name}: ${data.length} objetos cargados.`;
    result.classList.add('hidden');
    neighborsBody.innerHTML = `<tr><td colspan="5" class="muted">Datos cargados. Introduce un objeto y clasifícalo.</td></tr>`;
    draw();
  }catch(err){
    data = [];
    fileStatus.textContent = `Error: ${err.message}`;
    draw();
  }
});

loadExample.addEventListener('click', async ()=>{
  try{
    const res = await fetch('ejemplo.csv');
    const text = await res.text();
    data = parseCSV(text);
    current = null;
    neighbors = [];
    assignColors();
    updateLegend();
    refreshKOptions();
    fileStatus.textContent = `Datos de ejemplo: ${data.length} objetos cargados.`;
    xValue.value = '185';
    yValue.value = '7.2';
    draw();
  }catch{
    alert('No se pudieron cargar los datos de ejemplo.');
  }
});

classifyBtn.addEventListener('click', classify);
resetView.addEventListener('click', draw);
window.addEventListener('resize', draw);

window.addEventListener('beforeinstallprompt', e=>{
  e.preventDefault();
  deferredPrompt = e;
  installBtn.classList.remove('hidden');
});

installBtn.addEventListener('click', async ()=>{
  if(!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
  installBtn.classList.add('hidden');
});

if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(console.error);
  });
}

draw();
