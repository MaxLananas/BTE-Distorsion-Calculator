import {pair,local,principal,MODEL} from './metrics.js';
export const PDF_URL='https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/f9a2a20898aa0dbaa410b811c81ede9e1a4b9193/markdown-preview.pdf';
// Coordinates from the original repository, not extracted from the PDF images.
export const CHAMBORD_POINTS=[
  {lat:47.61879522306689,lon:1.517452983768294,x:2741846,z:-4933438},
  {lat:47.61689884381119,lon:1.5199218130311023,x:2741956,z:-4933163},
  {lat:47.6170880548077,lon:1.5146077696824731,x:2741567,z:-4933324},
  {lat:47.61519581963591,lon:1.517078391199736,x:2741678,z:-4933050}
];
// Manual transcription of section 6 of the raster PDF; rounding is part of the data.
export const PDF_PAIRS=[
  {i:0,j:1,ground:280.89,blocks:295.62,ratio:1.05243},
  {i:0,j:2,ground:285.96,blocks:301.21,ratio:1.05333},
  {i:0,j:3,ground:401.18,blocks:422.85,ratio:1.05400},
  {i:1,j:2,ground:400.04,blocks:420.75,ratio:1.05177},
  {i:1,j:3,ground:285.56,blocks:300.79,ratio:1.05333},
  {i:2,j:3,ground:280.64,blocks:295.35,ratio:1.05243}
];
export function chambordReport(){
 const rows=PDF_PAIRS.map(pdf=>{const model=pair(CHAMBORD_POINTS[pdf.i],CHAMBORD_POINTS[pdf.j]),legacy=pair(CHAMBORD_POINTS[pdf.i],CHAMBORD_POINTS[pdf.j],true);
 return {pdf,model,legacy,roundedMatch:Math.abs(pdf.ground-model.ground)<=.005&&Math.abs(pdf.blocks-model.blocks)<=.005&&Math.abs(pdf.ratio-model.ratio)<=.000005};});
 return {schema:'distortion-lab/chambord/1',pdf:PDF_URL,pdfSha256:'d3dd7017500e45779c2093ba540e351c1e7cd93a28e21a50bdbf4797a8c790bd',model:MODEL,reference:'WGS84 / GeographicLib 2.2.0',projectionCommit:'b6b49d2737216b0c8dd787516f1fc82fb7cd1c20',gridLzmaSha256:'296d33faf7f49fb3b9ba097ffa9f35a335f23efa3cf2e75569bfd21766b30823',coordinateSource:'https://github.com/MaxLananas/BTE-Distorsion-Calculator/blob/794ae8572d15e7da528fd809019ec1526d7e6d32/index.html',points:CHAMBORD_POINTS,rows,local:local(1.516710,47.616514),pdfPrintedMatrix:{east:[.9920,.3498],north:[.3516,-.9936],metrics:principal([.9920,.3498],[.3516,-.9936])},limitations:['PDF table manually transcribed from images','Geographic coordinates and integer X/Z come from the old repository, not a newly authenticated survey','Matching model output is numerical reproduction, not independent field validation','Local reference point is explicit; PDF centroid is not precisely specified']};
}
export function renderChambord(onReplay){
 const body=document.getElementById('chambord-rows');
 try{
  const report=chambordReport();const f=(v,n=2)=>new Intl.NumberFormat('fr-FR',{minimumFractionDigits:n,maximumFractionDigits:n}).format(v);
  body.innerHTML=report.rows.map(({pdf,model,legacy,roundedMatch},index)=>`<tr><th scope="row">P${pdf.i+1}–P${pdf.j+1}</th><td>${f(model.ground)} m</td><td>${f(pdf.blocks)}</td><td>${f(model.blocks)}</td><td>${f(legacy.blocks)}</td><td><span class="case-match">${roundedMatch?'Reproduit':'Écart'}</span></td><td><button class="case-replay" data-index="${index}">Explorer ↗</button></td></tr>`).join('');
  body.querySelectorAll('button').forEach(button=>button.onclick=()=>{const {i,j}=report.rows[Number(button.dataset.index)].pdf;onReplay(CHAMBORD_POINTS[i],CHAMBORD_POINTS[j]);});
  document.getElementById('chambord-status').textContent=`${report.rows.filter(r=>r.roundedMatch).length}/6 paires reproduites à l’arrondi du PDF · calcul effectué ici`;
  const exportButton=document.getElementById('chambord-export');exportButton.disabled=false;
  exportButton.onclick=()=>{const blob=new Blob([JSON.stringify({...report,createdAt:new Date().toISOString()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='chambord-verification-pdf.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 }catch{document.getElementById('chambord-status').textContent='Vérification indisponible : le modèle doit être chargé.';body.textContent='Aucune valeur calculée.';}
}
