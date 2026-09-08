import 'leaflet/dist/leaflet.css';
import './style.css';
import L from 'leaflet';
import {renderChambord} from './chambord.js';
import {loadGrid} from './projection.js';
import {local,pair,geodesicLine,MODEL} from './metrics.js';
const $=id=>document.getElementById(id);
const presets={chambord:[47.616514,1.516710,'Chambord',5],paris:[48.85837,2.294481,'Paris',6],nyc:[40.7128,-74.006,'New York',6],tokyo:[35.6762,139.6503,'Tokyo',6],sydney:[-33.8688,151.2093,'Sydney',6],cape:[-33.9249,18.4241,'Le Cap',6]};
let mode='local',pick='a',ready=false,report=null,markers=[],line=null,samples=L.layerGroup(),sampleTimer;
const map=L.map('map',{zoomControl:false,worldCopyJump:true,minZoom:2}).setView(presets.chambord.slice(0,2),5);
L.control.zoom({position:'bottomright'}).addTo(map);
L.control.scale({position:'bottomleft',imperial:false}).addTo(map);
const tiles=L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',maxZoom:20,subdomains:'abcd'}).addTo(map);
map.createPane('offline');map.getPane('offline').style.zIndex=150;
map.getPane('offline').style.pointerEvents='none';
map.createPane('offlineLabels');map.getPane('offlineLabels').style.zIndex=151;map.getPane('offlineLabels').style.pointerEvents='none';
Promise.all(['countries','cities'].map(async name=>{const r=await fetch(`${import.meta.env.BASE_URL}data/${name}.geojson`);if(!r.ok)throw new Error('Fond local absent');return r.json();})).then(([countries,cities])=>{
  L.geoJSON(countries,{pane:'offline',style:{color:'#59686a',weight:1,fillColor:'#2d3a3d',fillOpacity:1},interactive:false}).addTo(map);
  L.geoJSON(cities,{pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{pane:'offline',radius:2,color:'#80938d',weight:1,fillOpacity:1,interactive:false}).bindTooltip(feature.properties.name,{permanent:true,direction:'right',className:'city-label',pane:'offlineLabels'})}).addTo(map);
  map.attributionControl.addAttribution('<a href="https://www.naturalearthdata.com/about/terms-of-use/">Natural Earth</a>');
}).catch(()=>{$('map-error').hidden=false;});
let failedTiles=0;
tiles.on('tileerror',()=>{if(++failedTiles>3)$('map-error').hidden=false;});
tiles.on('tileload',()=>{$('map-error').hidden=true;failedTiles=0;});
const fmt=(n,d=2)=>new Intl.NumberFormat('fr-FR',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const pct=n=>`${n>=0?'+':'−'}${fmt(Math.abs(n))}`;
const val=id=>$(id).value.trim()===''?NaN:Number($(id).value);
function point(letter){return {lat:val('lat-'+letter),lon:val('lon-'+letter),x:val('x-'+letter),z:val('z-'+letter)};}
function writePoint(letter,lat,lon){$('lat-'+letter).value=lat.toFixed(7);$('lon-'+letter).value=lon.toFixed(7);}
function setPick(letter){pick=letter;$('map-instruction').textContent=`Cliquez sur la carte pour déplacer le point ${letter.toUpperCase()}.`;}
function setMode(next){mode=next;$('local-tab').classList.toggle('selected',mode==='local');$('distance-tab').classList.toggle('selected',mode==='distance');$('local-tab').setAttribute('aria-selected',mode==='local');$('distance-tab').setAttribute('aria-selected',mode==='distance');$('point-b').hidden=mode==='local';$('calculate').innerHTML=`Analyser ${mode==='local'?'ce lieu':'cette distance'} <span>↗</span>`;['lat-b','lon-b'].forEach(id=>$(id).required=mode==='distance');setPick(mode==='local'?'a':'b');run();setTimeout(()=>map.invalidateSize(),0);}
$('local-tab').onclick=()=>setMode('local');$('distance-tab').onclick=()=>setMode('distance');
$('pick-a').onclick=()=>setPick('a');$('pick-b').onclick=()=>setPick('b');
map.on('click',e=>{writePoint(pick,Math.max(-90,Math.min(90,e.latlng.lat)),((e.latlng.lng+180)%360+360)%360-180);$('preset').value='custom';run();});
$('preset').onchange=()=>{const p=presets[$('preset').value];if(!p)return;writePoint('a',p[0],p[1]);writePoint('b',p[0]+.002,p[1]+.001);map.setView(p.slice(0,2),p[3]);run();};
$('empirical').onchange=()=>{$('block-fields').hidden=!$('empirical').checked;run();setTimeout(()=>map.invalidateSize(),0);};
$('load-observations').onclick=()=>{writePoint('a',47.61879522306689,1.517452983768294);writePoint('b',47.61689884381119,1.5199218130311023);['x-a','z-a','x-b','z-b'].forEach((id,i)=>$(id).value=[2741846,-4933438,2741956,-4933163][i]);$('preset').value='chambord';run();fit();};
$('analysis-form').onsubmit=e=>{e.preventDefault();$('preset').value='custom';run();fit();};
// Invalidate an export immediately while fields are being edited.
$('analysis-form').addEventListener('input',e=>{if(e.target.tagName==='INPUT'&&e.target.type==='number'){report=null;$('export').disabled=true;$('share').disabled=true;$('result-title').textContent='Coordonnées modifiées · relancez l’analyse';}});
function updateMarkers(a,b){markers.forEach(m=>m.remove());markers=[];if(line){line.remove();line=null;}[a,...(mode==='distance'?[b]:[])].forEach((p,i)=>{const letter=i?'B':'A';const m=L.marker([p.lat,p.lon],{draggable:true,icon:L.divIcon({className:`marker ${i?'b':''}`,html:`<span><b>${letter}</b></span>`,iconSize:[28,28],iconAnchor:[14,28]})}).addTo(map);m.on('dragend',()=>{const p=m.getLatLng();writePoint(letter.toLowerCase(),p.lat,((p.lng+180)%360+360)%360-180);$('preset').value='custom';run();});markers.push(m);});if(mode==='distance'){
  const coords=geodesicLine(a,b);for(let i=1;i<coords.length;i++){while(coords[i][1]-coords[i-1][1]>180)coords[i][1]-=360;while(coords[i][1]-coords[i-1][1]<-180)coords[i][1]+=360;}
  line=L.polyline(coords,{color:'#d2ef8a',weight:2,dashArray:'5 6',opacity:.8}).addTo(map);
}}
function fit(){if(mode==='distance'&&markers.length===2)map.fitBounds(line.getBounds(),{padding:[70,70],maxZoom:17});else if(markers[0])map.setView(markers[0].getLatLng(),Math.max(11,map.getZoom()));}
$('fit').onclick=fit;
function stat(label,value,unit,note,highlight=false){return `<article class="stat ${highlight?'highlight':''}"><div class="stat-label">${label}<i>↗</i></div><div class="stat-value">${value}<small>${unit}</small></div><p>${note}</p></article>`;}
function run(){if(!ready)return;report=null;$('export').disabled=true;$('share').disabled=true;$('error').hidden=true;
try{const a=point('a'),b=point('b'),empirical=mode==='distance'&&$('empirical').checked;
const result=mode==='local'?local(a.lon,a.lat):pair(a,b,empirical);updateMarkers(a,b);
const place=presets[$('preset').value]?.[2]||'Position personnalisée';
$('result-title').textContent=mode==='local'?`Analyse locale · ${place}`:`Distance A → B · ${empirical?'mesure empirique':'modèle BTE'}`;
$('result-coords').textContent=`${fmt(a.lat,5)}°, ${fmt(a.lon,5)}°`;
if(mode==='local'){
const r=result,delta=(r.scale-1)*100;
$('results').innerHTML=`<div class="stats">${stat('ÉCHELLE LINÉAIRE',pct(delta),'%',`Facteur moyen × ${fmt(r.scale,5)}`,true)}${stat('VARIATION DE SURFACE',pct((r.area-1)*100),'%',`1 m² terrestre → ${fmt(r.area,3)} blocs²`)}${stat('DÉFORMATION ANGULAIRE',fmt(r.angle,3),'°','Maximum local · indicatrice de Tissot')}${stat('100 M SUR TERRE',fmt(100*r.scale,1),'blocs','Estimation selon l’échelle moyenne')}</div><div class="interpretation"><span>↳</span><p><strong>Ici, le modèle ${delta>=0?'agrandit':'réduit'} les longueurs d’environ ${fmt(Math.abs(delta),1)} % en moyenne.</strong> Selon la direction, 100 m correspondent à ${fmt(r.b*100,2)}–${fmt(r.a*100,2)} blocs. ${r.angle<.1?'Les angles sont très peu modifiés, mais cela ne garantit pas une échelle 1:1.':'La déformation angulaire est distincte du changement de taille.'}</p></div><div class="detail-row"><span>ÉCHELLES PRINCIPALES <b>a ${fmt(r.a,5)} / b ${fmt(r.b,5)}</b></span><span>ANISOTROPIE <b>${fmt(r.anisotropy,3)} %</b></span><span>X <b>${fmt(r.xy[0],2)}</b> · Z <b>${fmt(r.xy[1],2)}</b></span><span>ÉCART PAS 1 / 0,5 M <b>${r.stability.toExponential(1)}</b></span></div>`;
}else{
const r=result;
$('results').innerHTML=`<div class="stats">${stat('RAPPORT DE DISTANCE',r.cut?'—':pct((r.ratio-1)*100),'%',r.cut?'Coupure détectée · rapport non interprété':`Rapport × ${fmt(r.ratio,5)}`,true)}${stat('DISTANCE TERRESTRE',fmt(r.ground,r.ground>10000?0:2),'m','Géodésique sur l’ellipsoïde WGS84')}${stat('DISTANCE MINECRAFT',fmt(r.blocks,r.blocks>10000?0:2),'blocs',empirical?'Ligne droite X/Z mesurée':'Ligne droite entre points projetés')}${stat('ÉCART À 1 BLOC / M',pct(r.excess),'blocs','Distance en blocs − distance en mètres')}</div><div class="interpretation"><span>↳</span><p><strong>${empirical?'Une comparaison avec vos coordonnées, indépendante du modèle de projection.':'Les deux extrémités sont projetées, sans approximation au milieu.'}</strong> Ce rapport concerne cette paire de points, pas toutes les directions ou toutes les constructions. Le relief et les arrondis en blocs ne sont pas corrigés.</p></div>${r.cut?'<div class="warning">Coupure probable le long de la géodésique : ne pas interpréter le rapport comme une distorsion locale.</div>':''}${r.long?'<div class="warning">Plus de 100 km : cette mesure globale ne représente pas le facteur d’échelle local.</div>':''}${empirical?'<div class="warning">La précision dépend de vos relevés et de la configuration du serveur. Sur un petit segment, un seul bloc d’arrondi peut peser fortement sur le résultat.</div>':''}`;
}
report={schema:'distortion-lab/1',createdAt:new Date().toISOString(),mode,empirical,model:empirical?'Coordonnées fournies par l’utilisateur':MODEL,reference:'WGS84 / GeographicLib 2.2.0',sourceCommit:'b6b49d2737216b0c8dd787516f1fc82fb7cd1c20',gridLzmaSha256:'296d33faf7f49fb3b9ba097ffa9f35a335f23efa3cf2e75569bfd21766b30823',points:mode==='local'?[a]:[a,b],result,method:{localStepMetres:[1,.5],cutDetection:'64 segments, jump > 10× ground segment; heuristic',distance:'WGS84 geodesic vs planar endpoint distance',height:false},limitations:['Default BTE configuration only unless empirical','No terrain or block rounding correction','Local mean is not a global distortion estimate']};
$('export').disabled=false;$('share').disabled=false;
}catch(e){$('error').textContent=e.message;$('error').hidden=false;$('results').innerHTML='<div class="loading">Analyse indisponible. Vérifiez les coordonnées ou choisissez un lieu éloigné des coupures.</div>';$('result-title').textContent='Analyse non calculée';$('result-coords').textContent='';}}
$('export').onclick=()=>{if(!report)return;const url=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='distortion-lab-rapport.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('share').onclick=async()=>{if(!report)return;const params=new URLSearchParams({mode});for(const k of ['lat-a','lon-a','lat-b','lon-b','x-a','z-a','x-b','z-b'])params.set(k,$(k).value);params.set('empirical',String($('empirical').checked));const url=new URL(location.href);url.hash=params.toString();history.replaceState(null,'',url);try{await navigator.clipboard.writeText(url.href);$('toast').textContent='Lien copié. Les paramètres sont inclus, pas les tuiles.';}catch{$('toast').textContent='Le lien est prêt dans la barre d’adresse : copiez-le pour partager.';}setTimeout(()=>$('toast').textContent='',5500);};
function drawSamples(){samples.clearLayers();if(!$('grid-toggle').checked||!ready)return;samples.addTo(map);const bounds=map.getBounds();const south=Math.max(-85,bounds.getSouth()),north=Math.min(85,bounds.getNorth());const west=bounds.getWest(),east=bounds.getEast();for(let y=0;y<7;y++)for(let x=0;x<10;x++){const lat=south+(north-south)*(y+.5)/7,lon=west+(east-west)*(x+.5)/10,wrapped=((lon+180)%360+360)%360-180;try{const r=local(wrapped,lat),d=(r.scale-1)*100;L.circleMarker([lat,lon],{radius:5,color:'#13201d',weight:1,fillColor:d<0?'#89c9ee':d<5?'#d2ef8a':d<15?'#e5bc71':'#ea866e',fillOpacity:.8}).bindTooltip(`Échelle ${pct(d)} % · ${fmt(lat,2)}°, ${fmt(wrapped,2)}°`).addTo(samples);}catch{/* No misleading sample at a singularity. */}}}
$('grid-toggle').onchange=drawSamples;map.on('moveend',()=>{clearTimeout(sampleTimer);sampleTimer=setTimeout(drawSamples,120);});
async function init(){try{const response=await fetch(`${import.meta.env.BASE_URL}conformal.bin`);if(!response.ok)throw new Error('Grille indisponible');loadGrid(await response.arrayBuffer());ready=true;$('engine').innerHTML='<span class="status-dot"></span> Modèle conforme chargé';$('calculate').disabled=false;
renderChambord((a,b)=>{writePoint('a',a.lat,a.lon);writePoint('b',b.lat,b.lon);$('empirical').checked=false;$('block-fields').hidden=true;$('preset').value='chambord';setMode('distance');fit();$('explorer').scrollIntoView({behavior:'smooth',block:'start'});});
const params=new URLSearchParams(location.hash.slice(1));if(params.has('mode')){for(const k of ['lat-a','lon-a','lat-b','lon-b','x-a','z-a','x-b','z-b'])if(params.has(k))$(k).value=params.get(k);$('preset').value='custom';$('empirical').checked=params.get('empirical')==='true';$('block-fields').hidden=!$('empirical').checked;setMode(params.get('mode')==='distance'?'distance':'local');if(report)fit();}else run();
}catch(e){$('engine').textContent='Modèle indisponible';$('chambord-status').textContent='Vérification indisponible : grille conforme non chargée.';$('chambord-rows').textContent='Aucune valeur calculée.';$('results').textContent='Impossible de charger la grille conforme. Rechargez la page ; aucun modèle approximatif ne sera substitué.';console.error(e);}}
init();
