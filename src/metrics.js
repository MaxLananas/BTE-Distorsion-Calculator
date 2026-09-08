import GeographicLib from 'geographiclib-geodesic';
import {project, validate} from './projection.js';
const geod = GeographicLib.Geodesic.WGS84;
export const MODEL = 'BTE Modified Airocean · scale 7318261.522857145 · flip_vertical';
export function principal(e, n) {
  const ee=e[0]**2+e[1]**2, nn=n[0]**2+n[1]**2, en=e[0]*n[0]+e[1]*n[1];
  const disc=Math.hypot(ee-nn,2*en);
  const a=Math.sqrt(Math.max(0,(ee+nn+disc)/2)), b=Math.sqrt(Math.max(0,(ee+nn-disc)/2));
  return {a,b,scale:(a+b)/2,area:Math.abs(e[0]*n[1]-e[1]*n[0]),angle:2*Math.asin(Math.min(1,(a-b)/(a+b)))*180/Math.PI,anisotropy:(a/b-1)*100};
}
function derivative(lon,lat,step,fn) {
  const at = azi => {const p=geod.Direct(lat,lon,azi,step);return fn(p.lon2,p.lat2);};
  const east=at(90),west=at(270),north=at(0),south=at(180);
  return principal(east.map((v,i)=>(v-west[i])/(2*step)),north.map((v,i)=>(v-south[i])/(2*step)));
}
export function local(lon,lat,fn=project) {
  validate(lon,lat);
  if(Math.abs(lat)>89.99) throw new Error('Trop près du pôle : analyse locale non prise en charge.');
  const result=derivative(lon,lat,1,fn), check=derivative(lon,lat,0.5,fn);
  const stability=Math.max(Math.abs(result.a-check.a),Math.abs(result.b-check.b));
  if(!Number.isFinite(result.scale)||result.a>10||result.b<0.01||stability>0.01) throw new Error('Coupure ou instabilité numérique : mesure locale non interprétable.');
  return {...result,stability,xy:fn(lon,lat)};
}
export function distance(a,b) {
  validate(a.lon,a.lat);validate(b.lon,b.lat);
  return geod.Inverse(a.lat,a.lon,b.lat,b.lon).s12;
}
export function pair(a,b,empirical=false) {
  const ground=distance(a,b);
  if(ground<0.01) throw new Error('Points confondus : choisissez deux positions distinctes (≥ 1 cm).');
  const p=empirical?[a.x,a.z]:project(a.lon,a.lat),q=empirical?[b.x,b.z]:project(b.lon,b.lat);
  if(![...p,...q].every(Number.isFinite)) throw new Error('Renseignez X et Z pour chaque point.');
  const blocks=Math.hypot(q[0]-p[0],q[1]-p[1]);
  // Sample the geodesic to flag jumps. Heuristic, not a proof of continuity.
  let cut=false;
  if(!empirical){
    const inv=geod.Inverse(a.lat,a.lon,b.lat,b.lon);let prev=p;
    for(let i=1;i<=64;i++) {
      const pos=geod.Direct(a.lat,a.lon,inv.azi1,ground*i/64),xy=project(pos.lon2,pos.lat2);
      if(Math.hypot(xy[0]-prev[0],xy[1]-prev[1])>ground/64*10) cut=true;
      prev=xy;
    }
  }
  return {ground,blocks,ratio:blocks/ground,excess:blocks-ground,cut,long:ground>100000};
}
export function geodesicLine(a,b) {
  const inv=geod.Inverse(a.lat,a.lon,b.lat,b.lon);
  return Array.from({length:65},(_,i)=>{const p=geod.Direct(a.lat,a.lon,inv.azi1,inv.s12*i/64);return [p.lat2,p.lon2];});
}
