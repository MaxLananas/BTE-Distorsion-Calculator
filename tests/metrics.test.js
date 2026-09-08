import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {loadGrid,project,validate,zyz} from '../src/projection.js';
import {principal,local,distance,pair} from '../src/metrics.js';
const bytes=readFileSync(new URL('../public/conformal.bin',import.meta.url));
loadGrid(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const near=(a,b,tol=1e-9)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b} (tol ${tol})`);
test('source grid has its recorded SHA-256',()=>assert.equal(createHash('sha256').update(readFileSync(new URL('../conformal.lzma',import.meta.url))).digest('hex'),'296d33faf7f49fb3b9ba097ffa9f35a335f23efa3cf2e75569bfd21766b30823'));
test('rejects corrupt grid length',()=>assert.throws(()=>loadGrid(new ArrayBuffer(16))));
test('rejects non-finite and out-of-range coordinates',()=>{for(const [lo,la] of [[181,0],[0,-91],[NaN,1],[0,Infinity]])assert.throws(()=>validate(lo,la));validate(180,90);validate(0,0);});
test('identity Jacobian',()=>{const r=principal([1,0],[0,1]);near(r.a,1);near(r.b,1);near(r.area,1);near(r.angle,0);});
test('uniform 10% enlargement means 21% more area',()=>{const r=principal([1.1,0],[0,1.1]);near(r.area,1.21);near(r.angle,0);near(r.scale,1.1);});
test('singular values detect shear even with equal column lengths',()=>{const r=principal([1,0],[.5,Math.sqrt(.75)]);assert.ok(r.angle>29);near(r.area,Math.sqrt(.75));assert.ok(r.anisotropy>70);});
test('principal scales are invariant to planar rotation and reflection',()=>{const r=principal([0,-2],[-1,0]);near(r.a,2);near(r.b,1);near(r.area,2);});
test('WGS84 equatorial degree, known geodetic reference',()=>near(distance({lat:0,lon:0},{lat:0,lon:1}),111319.49079327357,1e-6));
test('antimeridian uses short geodesic',()=>near(distance({lat:0,lon:179.9},{lat:0,lon:-179.9}),22263.89815865,1e-5));
test('antipodal geodesic stays finite',()=>near(distance({lat:0,lon:0},{lat:0,lon:180}),20003931.458625447,1e-5));
test('duplicate points rejected',()=>assert.throws(()=>pair({lat:47,lon:1},{lat:47,lon:1})));
test('empirical 3-4-5 segment and missing values',()=>{const a={lat:0,lon:0,x:0,z:0},b={lat:0,lon:.00001,x:3,z:4};near(pair(a,b,true).blocks,5);assert.throws(()=>pair(a,{...b,x:NaN},true));});
test('Chambord legacy observations reproduced within 1 block per axis (not independently surveyed)',()=>{
 const observations=[[47.61879522306689,1.517452983768294,2741846,-4933438],[47.61689884381119,1.5199218130311023,2741956,-4933163],[47.6170880548077,1.5146077696824731,2741567,-4933324],[47.61519581963591,1.517078391199736,2741678,-4933050]];
 for(const [lat,lon,x,z] of observations){const p=project(lon,lat);near(p[0],x,1);near(p[1],z,1);}
});
test('local regression at Chambord with consistent metre scaling',()=>{const r=local(1.516710,47.616514);near(r.scale,1.052875875649185,1e-7);near(r.area,1.108546154553834,1e-7);assert.ok(r.stability<1e-6);});
test('representative continents produce stable finite derivatives',()=>{for(const [lo,la] of [[2.294481,48.85837],[-74.006,40.7128],[139.6503,35.6762],[151.2093,-33.8688],[18.4241,-33.9249],[0,0]]){const r=local(lo,la);assert.ok(r.b>.5&&r.a<2);assert.ok(r.stability<.001);}});
test('polar and discontinuous local derivatives are refused',()=>{assert.throws(()=>local(0,90));assert.throws(()=>local(0,0,(lo,la)=>[lo>0?1e8:0,la]));});
test('projected pair is endpoint distance, symmetric',()=>{const a={lat:47.616514,lon:1.516710},b={lat:47.618795,lon:1.517453};const r=pair(a,b),p=project(a.lon,a.lat),q=project(b.lon,b.lat);near(r.blocks,Math.hypot(p[0]-q[0],p[1]-q[1]));near(pair(b,a).ratio,r.ratio);assert.equal(r.cut,false);});

test('rotation order matches explicit Java MathUtils matrix',()=>{
 const a=.37,b=-1.21,c=.85,sa=Math.sin(a),ca=Math.cos(a),sb=Math.sin(b),cb=Math.cos(b),sc=Math.sin(c),cc=Math.cos(c);
 const expected=[[ca*cb*cc-sc*sa,-sa*cb*cc-sc*ca,cc*sb],[sc*cb*ca+cc*sa,cc*ca-sc*cb*sa,sc*sb],[-sb*ca,sb*sa,cb]];
 zyz(a,b,c).forEach((row,i)=>row.forEach((v,j)=>near(v,expected[i][j],1e-14)));
});

test('PDF matrix directional scales use both components',()=>{
 near(Math.hypot(.9920,.3498),1.0518669307474213);
 near(Math.hypot(.3516,-.9936),1.0539751040703003);
 const r=principal([.9920,.3498],[.3516,-.9936]);
 near(r.area,1.10864088);assert.ok(r.scale*r.scale>r.area);
});
test('all six PDF pairs reproduced at printed precision',async()=>{
 const {chambordReport}=await import('../src/chambord.js');
 const report=chambordReport();assert.equal(report.rows.length,6);
 for(const row of report.rows)assert.ok(row.roundedMatch,JSON.stringify(row.pdf));
});
test('PDF reproduction is not mislabeled as integer-coordinate measurement',async()=>{
 const {chambordReport}=await import('../src/chambord.js');const row=chambordReport().rows[0];
 near(row.legacy.ratio,1.0544390232912688,1e-8);
 assert.ok(Math.abs(row.legacy.blocks-row.model.blocks)>.5);
});
