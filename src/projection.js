// Port du pipeline Terra++ ; provenance et corrections : research/AUDIT.md
export const BTE_SCALE = 7318261.522857145;
const ARC = 2 * Math.asin(Math.sqrt(5 - Math.sqrt(5)) / Math.sqrt(10));
const ZC  = Math.sqrt(5 + 2 * Math.sqrt(5)) / Math.sqrt(15);
const EL  = Math.sqrt(8) / Math.sqrt(5 + Math.sqrt(5));
const EL6 = EL / 6;
const DVE = Math.sqrt(3 + Math.sqrt(5)) / Math.sqrt(5 + Math.sqrt(5));
const R_GNOMON = -3 * EL6 / DVE;
const ROOT3 = Math.sqrt(3);
const VSF = 1.0 / 1.1473979730192934;
const SL  = 256;
const R_EARTH = 40075017.0 / (2 * Math.PI);
const DEG = Math.PI / 180;
const THETA_BTE = -150 * DEG;
const SIN_T = Math.sin(THETA_BTE);
const COS_T = Math.cos(THETA_BTE);

const BERING_X = -0.3420420960118339;
const BERING_Y = -0.322211064085279;
const ARCTIC_Y = -0.2;
const ARCTIC_M = (ARCTIC_Y - ROOT3 * ARC / 4) / (BERING_X + 0.5 * ARC);
const ARCTIC_B = ARCTIC_Y - ARCTIC_M * BERING_X;
const ALEUTIAN_Y  = -0.5000446805492526;
const ALEUTIAN_XL = -0.5149231279757507;
const ALEUTIAN_XR = -0.45;
const ALEUTIAN_M  = (BERING_Y - ALEUTIAN_Y) / (BERING_X - ALEUTIAN_XR);
const ALEUTIAN_B  = BERING_Y - ALEUTIAN_M * BERING_X;

const VERTS_GEO = [
  [10.536199,64.7],[-5.24539,2.300882],[58.157706,10.447378],
  [122.3,39.1],[-143.47849,50.103201],[-67.13233,23.717925],
  [36.52151,-50.1032],[112.867673,-23.71793],[174.75461,-2.300882],
  [-121.84229,-10.44735],[-57.7,-39.1],[-169.4638,-64.7],
];

const ISO = [
  [2,1,6],[1,0,2],[0,1,5],[1,5,10],[1,6,10],
  [7,2,6],[2,3,7],[3,0,2],[0,3,4],[4,0,5],
  [5,4,9],[9,5,10],[10,9,11],[11,6,10],[6,7,11],
  [8,3,7],[8,3,4],[8,4,9],[9,8,11],[7,8,11],
  [11,6,7],[3,7,8]
];

const CM_RAW = [
  [-3,7],[-2,5],[-1,7],[2,5],[4,5],[-4,1],[-3,-1],[-2,1],[-1,-1],[0,1],
  [1,-1],[2,1],[3,-1],[4,1],[5,-1],[-3,-5],[-1,-5],[1,-5],[2,-7],[-4,-7],
  [-5,-5],[-2,-7]
];

const FLIP = [true,false,true,false,false,true,false,true,false,true,false,true,false,true,false,true,true,true,false,false,true,false];

function geo2sph(lo,la) { return [lo*DEG, Math.PI/2 - la*DEG]; }
function sph2cart([lo,co]) { return [Math.sin(co)*Math.cos(lo), Math.sin(co)*Math.sin(lo), Math.cos(co)]; }
function cart2sph([x,y,z]) { return [Math.atan2(y,x), Math.atan2(Math.sqrt(x*x+y*y),z)]; }
function geo2cart(lo,la) { return sph2cart(geo2sph(lo,la)); }
function dot(a,b) { return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]; }
function norm3(v) { return Math.sqrt(dot(v,v)); }
function normalize(v) { const n=norm3(v); return v.map(x=>x/n); }
function mv(m,v) { return [m[0][0]*v[0]+m[0][1]*v[1]+m[0][2]*v[2], m[1][0]*v[0]+m[1][1]*v[1]+m[1][2]*v[2], m[2][0]*v[0]+m[2][1]*v[1]+m[2][2]*v[2]]; }
function mm(a,b) {
  return [0,1,2].map(i=>[0,1,2].map(j=>[0,1,2].reduce((s,k)=>s+a[i][k]*b[k][j],0)));
}
function Rz(a) { return [[Math.cos(a),-Math.sin(a),0],[Math.sin(a),Math.cos(a),0],[0,0,1]]; }
function Ry(a) { return [[Math.cos(a),0,Math.sin(a)],[0,1,0],[-Math.sin(a),0,Math.cos(a)]]; }
export function zyz(z1,y,z2) { return mm(mm(Rz(z2),Ry(y)),Rz(z1)); }
function yRot([lo,co], r) {
  let c = sph2cart([lo,co]);
  const x = c[0];
  c[0] = c[2]*Math.sin(r)+x*Math.cos(r);
  c[2] = c[2]*Math.cos(r)-x*Math.sin(r);
  c = normalize(c);
  return [Math.atan2(c[1],c[0]), Math.atan2(Math.sqrt(c[0]**2+c[1]**2),c[2])];
}

const CM = CM_RAW.map(([x,y])=>[x*0.5*ARC, y*ARC*ROOT3/12]);
const vertsCart = VERTS_GEO.map(v=>geo2cart(...v));
const vertsSph  = VERTS_GEO.map(v=>geo2sph(...v));
const CENTROIDS = [], ROTS = [];

for (let i=0; i<22; i++) {
  const vs = [vertsCart[ISO[i][0]], vertsCart[ISO[i][1]], vertsCart[ISO[i][2]]];
  const s = normalize([vs[0][0]+vs[1][0]+vs[2][0], vs[0][1]+vs[1][1]+vs[2][1], vs[0][2]+vs[1][2]+vs[2][2]]);
  CENTROIDS.push(s);
  const cs = cart2sph(s);
  const [lam,phi] = cs;
  const vsph = vertsSph[ISO[i][0]];
  const v2r = yRot([vsph[0]-lam, vsph[1]], -phi);
  ROTS.push(zyz(-lam, -phi, Math.PI/2 - v2r[0]));
}

function findTri(vec) {
  let mn=Infinity, face=0;
  for (let i=0; i<20; i++) {
    const d = [CENTROIDS[i][0]-vec[0], CENTROIDS[i][1]-vec[1], CENTROIDS[i][2]-vec[2]];
    const dsq = d[0]*d[0]+d[1]*d[1]+d[2]*d[2];
    if (dsq < mn) { if (dsq < 0.1) return i; face=i; mn=dsq; }
  }
  return face;
}

function gnomonique(vec) {
  const S = ZC/vec[2], xp=S*vec[0], yp=S*vec[1];
  const a = Math.atan((2*yp/ROOT3 - EL6)/DVE);
  const b = Math.atan((xp - yp/ROOT3 - EL6)/DVE);
  const c = Math.atan((-xp - yp/ROOT3 - EL6)/DVE);
  return [0.5*(b-c), (2*a-b-c)/(2*ROOT3)];
}

let grid = null;

function interp(vx, vy, xin, yin) {
  const oy = yin;
  let x = xin*SL, y = yin*SL;
  const v = 2*y/ROOT3, u = x - v*0.5;
  let u1 = Math.max(0, Math.min(Math.floor(u), SL-1));
  let v1 = Math.max(0, Math.min(Math.floor(v), SL-u1-1));
  let flip=1, vx1,vy1,vx2,vy2,vx3,vy3,y3,x3;
  if (oy < -ROOT3*(xin - (u1+v1+1)/SL) || v1===SL-u1-1) {
    vx1=vx[u1][v1]; vy1=vy[u1][v1];
    vx2=vx[u1][v1+1]; vy2=vy[u1][v1+1];
    vx3=vx[u1+1][v1]; vy3=vy[u1+1][v1];
    y3=0.5*ROOT3*v1; x3=(u1+1)+0.5*v1;
  } else {
    vx1=vx[u1][v1+1]; vy1=vy[u1][v1+1];
    vx2=vx[u1+1][v1]; vy2=vy[u1+1][v1];
    vx3=vx[u1+1][v1+1]; vy3=vy[u1+1][v1+1];
    flip=-1; y=-y;
    y3=-(0.5*ROOT3*(v1+1)); x3=(u1+1)+0.5*(v1+1);
  }
  const w1=-(y-y3)/ROOT3-(x-x3), w2=2*(y-y3)/ROOT3, w3=1-w1-w2;
  return [
    vx1*w1+vx2*w2+vx3*w3, vy1*w1+vy2*w2+vy3*w3,
    (vx3-vx1)*SL, SL*flip*(2*vx2-vx1-vx3)/ROOT3,
    (vy3-vy1)*SL, SL*flip*(2*vy2-vy1-vy3)/ROOT3
  ];
}

function newton(vx, vy, ef, eg, xe, ye) {
  for (let i=0; i<5; i++) {
    const c = interp(vx, vy, xe, ye);
    const f=c[0]-ef, g=c[1]-eg;
    const det = 1/(c[2]*c[5]-c[3]*c[4]);
    xe -= det*(c[5]*f-c[3]*g);
    ye -= det*(-c[4]*f+c[2]*g);
  }
  return [xe, ye];
}

function triTransform(vec) {
  const [xg, yg] = gnomonique(vec);
  if (!grid) throw new Error('Grille conforme non chargée.');
  const cx = xg/ARC+0.5, cy = yg/ARC+ROOT3/6;
  let [xe, ye] = newton(grid.vx, grid.vy, xg, yg, cx, cy);
  return [(xe-0.5)*ARC, (ye-ROOT3/6)*ARC];
}

function isEurasia(x, y) {
  if (x > 0) return false;
  if (x < -0.5*ARC) return true;
  if (y > ROOT3*ARC/4) return x < 0;
  if (y < ALEUTIAN_Y) return y < (ALEUTIAN_Y+ALEUTIAN_XL)-x;
  if (y > BERING_Y) {
    if (y < ARCTIC_Y) return x < BERING_X;
    return y < ARCTIC_M*x + ARCTIC_B;
  }
  return y > ALEUTIAN_M*x + ALEUTIAN_B;
}

export function project(lon, lat) {
  validate(lon, lat);
  const vec = geo2cart(lon, lat);
  const face = findTri(vec);
  const pvec = normalize(mv(ROTS[face], vec));
  let [px, py] = triTransform(pvec);
  if (FLIP[face]) { px=-px; py=-py; }
  let f = face;
  const x0 = px;
  if (((f===15 && x0 > py*ROOT3) || f===14) && x0 > 0) {
    const nx = 0.5*x0 - 0.5*ROOT3*py;
    const ny = 0.5*ROOT3*x0 + 0.5*py;
    px=nx; py=ny; f+=6;
  }
  let cx = px + CM[f][0];
  let cy = py + CM[f][1];
  const easia = isEurasia(cx, cy);
  let x=cx, y=cy;
  y -= 0.75*ARC*ROOT3;
  if (easia) {
    x += ARC;
    const t = x;
    x = COS_T*x - SIN_T*y;
    y = SIN_T*t + COS_T*y;
  } else {
    x -= ARC;
  }
  return [y * BTE_SCALE, x * BTE_SCALE];
}


export function validate(lon, lat) {
  if (!Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lon)>180 || Math.abs(lat)>90) throw new Error('Latitude : −90 à 90° ; longitude : −180 à 180°.');
}
export function loadGrid(buffer) {
  if (buffer.byteLength !== 530448) throw new Error('Grille conforme invalide : taille incorrecte.');
  const view = new DataView(buffer), n = SL+1;
  const vx = Array.from({length:n},()=>new Float64Array(n));
  const vy = Array.from({length:n},()=>new Float64Array(n));
  let idx=0;
  for(let v=0;v<n;v++) for(let u=0;u<n-v;u++) {
    vx[u][v]=view.getFloat64(idx,false)*VSF; idx+=8;
    vy[u][v]=view.getFloat64(idx,false)*VSF; idx+=8;
    if(!Number.isFinite(vx[u][v]) || !Number.isFinite(vy[u][v])) throw new Error('Grille non finie.');
  }
  grid={vx,vy};
}
