const canvas = root.querySelector('#nl-canvas');
const map = root.querySelector('.nl-map');
const ctx = canvas.getContext('2d',{alpha:false});
const select = root.querySelector('#nl-select');
const detail = root.querySelector('#nl-detail');
const play = root.querySelector('#nl-play');
const zoomText = root.querySelector('#nl-zoom');
const infoPlacement=root.querySelector('#nl-info-placement');
const infoTitle=root.querySelector('#nl-info-title');
const infoContent=root.querySelector('#nl-info-content');
let nearbyCandidates=[],nearbyPage=0;
const offscreen = () => document.createElement('canvas');
const base = offscreen(), mask = offscreen(), beams = offscreen(), overlay = offscreen();
const bctx = base.getContext('2d'), mctx = mask.getContext('2d');
const beamctx = beams.getContext('2d'), octx = overlay.getContext('2d');
const surfaceStates = densifyMapGeometry(states), surfaceLakes = densifyMapGeometry(lakes);
const regionSelect = root.querySelector('#nl-region');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let paused = reducedMotion.matches, selected = -1, hovered = -1;
let width = 0, height = 0, dpr = 1, effectDpr = 1, zoom = 1, offset = [0, 0];
let time = 0, lastTime = null, frameId = 0, frameTimer = 0, inView = true, dirty = true, pointer = null;
let baseDirty = true, overlayDirty = true, baseDirtyViews = null;
let points = [];
let views=[], region='overview', detailBounds=null;
const overviewNavigation = Object.fromEntries(['mainland','alaska','hawaii'].map(key=>[key,{zoom:1,offset:[0,0]}]));
let activeOverviewPane='mainland';
let mapTopSpace=35, mapBottomSpace=0;
const stateNames={AL:'Alabama',AK:'Alaska',AZ:'Arizona',AR:'Arkansas',CA:'California',CO:'Colorado',CT:'Connecticut',DE:'Delaware',DC:'District of Columbia',FL:'Florida',GA:'Georgia',HI:'Hawaii',ID:'Idaho',IL:'Illinois',IN:'Indiana',IA:'Iowa',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',ME:'Maine',MD:'Maryland',MA:'Massachusetts',MI:'Michigan',MN:'Minnesota',MS:'Mississippi',MO:'Missouri',MT:'Montana',NE:'Nebraska',NV:'Nevada',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NY:'New York',NC:'North Carolina',ND:'North Dakota',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VT:'Vermont',VA:'Virginia',WA:'Washington',WV:'West Virginia',WI:'Wisconsin',WY:'Wyoming',PR:'Puerto Rico',VI:'U.S. Virgin Islands',GU:'Guam',MP:'Northern Mariana Islands',AS:'American Samoa',UM:'U.S. Outlying Islands'};
const regions={
  overview:{name:'United States · overview'},
  mainland:{name:'Contiguous United States',bounds:[-126,24,-66,50]},
  northeast:{name:'New England',bounds:[-73.8,40.7,-66.6,45.35]},
  midatlantic:{name:'Mid-Atlantic & Chesapeake',bounds:[-78,35,-70.9,43.5]},
  southeast:{name:'Southeast & Florida',bounds:[-85,24,-74.7,36.6]},
  gulf:{name:'Gulf Coast',bounds:[-98,24,-80,31.5]},
  lakes:{name:'Great Lakes',bounds:[-93.4,40.8,-75.6,49]},
  west:{name:'Pacific Coast',bounds:[-125.5,32,-116,49.2]},
  alaska:{name:'Alaska',bounds:[-188,50,-129,71.5]},
  hawaii:{name:'Hawaii',bounds:[-160.7,18.7,-154.5,22.5]},
  caribbean:{name:'Puerto Rico & U.S. Virgin Islands',bounds:[-68.2,17.4,-64.25,18.65]},
  guam:{name:'Guam & Northern Mariana Islands',bounds:[143.8,12.8,146.6,20.8]},
  samoa:{name:'American Samoa',bounds:[-171.5,-15,-168,-10.8]},
  detail:{name:'Selected lighthouse'}
};
lights.forEach((light,index)=>{
  if(light.state!=='UM')return;
  const span=.65, lonSpan=span/Math.cos(light.lat*Math.PI/180);
  regions['island-'+index]={name:light.name.replace(/\s+(Aviation\s+)?Light.*$/,'')+' · outlying island',bounds:[light.lon-lonSpan,light.lat-span,light.lon+lonSpan,light.lat+span]};
});
for(const [key,value] of Object.entries(regions)) {
  const option=document.createElement('option');option.value=key;option.textContent=value.name;
  if(key==='detail')option.disabled=true;
  regionSelect.append(option);
}
const territoryStates=new Set(['PR','VI','GU','MP','AS','UM']);
const usStateNames=new Set(Object.values(stateNames));
const graticules={overview:d3.geoGraticule().step([10,10])(),detail:d3.geoGraticule().step([2,2])()};
function overviewRegion(l) {return l.state==='AK'?'alaska':l.state==='HI'?'hawaii':territoryStates.has(l.state)?null:'mainland';}
const placeLabels=[
  ['PACIFIC OCEAN',-122.9,34.3,'water'],['ATLANTIC OCEAN',-71.5,32.8,'water'],['GULF COAST',-91,27,'water'],
  ['Lake Superior',-88.4,47.45,'water'],['Lake Michigan',-87.04,43.85,'water'],['Lake Huron',-82.6,44.7,'water'],
  ['Lake Erie',-81.35,42.1,'water'],['Lake Ontario',-77.65,43.65,'water'],['Lake Champlain',-73.22,44.65,'water'],
  ['Boston',-71.0589,42.3601,'city'],['Portland',-70.2553,43.6591,'city'],['New York',-74.006,40.7128,'city'],
  ['San Francisco',-122.4194,37.7749,'city'],['Seattle',-122.3321,47.6062,'city'],['San Diego',-117.1611,32.7157,'city'],
  ['Miami',-80.1918,25.7617,'city'],['New Orleans',-90.0715,29.9511,'city'],['Chicago',-87.6298,41.8781,'city'],
  ['Duluth',-92.1005,46.7867,'city'],['Detroit',-83.0458,42.3314,'city'],['Honolulu',-157.8583,21.3069,'city'],
  ['Juneau',-134.4197,58.3019,'city'],['San Juan',-66.1057,18.4655,'city']
];
for(const feature of states.features) {
  const p=feature.properties;
  if(p.isUS || Object.values(stateNames).includes(p.name)) {
    const [lon,lat]=d3.geoCentroid(feature);
    placeLabels.push([p.name.toUpperCase(),lon,lat,'state',p.postal]);
  }
}
const fmt = value => Number.isInteger(value) ? String(value) : value.toFixed(1);
const nmToRadians = nm => nm * 1.852 / 6371.0088;
const litCount = lights.filter(l => l.active === true).length;
root.querySelector('#nl-count').textContent = `${lights.length} lighthouse sites · ${litCount} listed active`;
Object.entries(stateNames).sort((a,b)=>a[1].localeCompare(b[1])).forEach(([abbr,name]) => {
  const group = document.createElement('optgroup');
  group.label = name;
  lights.forEach((light,index) => {
    if (light.state !== abbr) return;
    const option = document.createElement('option');
    option.value = index;
    option.textContent = light.name + (light.appearance?.mode==='local'?' · local light':light.active === false ? ' · historic' : '');
    group.append(option);
  });
  if(group.children.length)select.append(group);
});

function makeBeam() {
  // Bake the light shaft and faint mist once. Animation still draws one small
  // image; there are no live filters, particles, or additional lighting passes.
  const sprite = offscreen(); sprite.width = 256; sprite.height = 128;
  const s = sprite.getContext('2d');
  const pixels = s.createImageData(sprite.width,sprite.height);
  const smooth = value => {const t=Math.max(0,Math.min(1,value));return t*t*(3-2*t);};
  for(let y=0;y<sprite.height;y++)for(let x=0;x<sprite.width;x++) {
    const along=x+.5,side=y+.5-64,distance=Math.hypot(along,side),reach=distance/250;
    if(reach>=1)continue;
    const edge=1-smooth((Math.abs(side)/(.8+along*.23)-.7)/.3);
    if(edge<=0)continue;
    const core=Math.exp(-.5*(side/(.6+along*.02))**2);
    const shaft=Math.exp(-.5*(side/(.9+along*.055))**2);
    const haze=Math.exp(-.5*(side/(1.4+along*.11))**2);
    // Low-contrast, fixed wisps stay quiet when hundreds of lights overlap.
    const mist=1+.055*Math.sin(along*.083+side*.19)+.035*Math.sin(along*.037-side*.27);
    const fade=Math.pow(1-reach,1.16)*(1-smooth((reach-.84)/.16));
    const alpha=Math.min(1,fade*edge*(.85*core+(.3*shaft+.11*haze)*mist)*.9);
    const i=(y*sprite.width+x)*4;
    pixels.data[i]=255;
    pixels.data[i+1]=Math.round(224+30*core);
    pixels.data[i+2]=Math.round(159+86*core);
    pixels.data[i+3]=Math.round(alpha*255);
  }
  s.putImageData(pixels,0,0);
  return sprite;
}
const beamSprite = makeBeam();
function makeSteadyGlow() {
  // One small cached sprite; fixed lights do not need new gradients each frame.
  const sprite=offscreen();sprite.width=sprite.height=256;
  const s=sprite.getContext('2d'),gradient=s.createRadialGradient(128,128,0,128,128,128);
  gradient.addColorStop(0,'rgba(255,242,190,.25)');
  gradient.addColorStop(.16,'rgba(255,231,158,.10)');
  gradient.addColorStop(.65,'rgba(254,220,128,.04)');
  gradient.addColorStop(1,'rgba(255,236,178,0)');
  s.fillStyle=gradient;s.fillRect(0,0,256,256);return sprite;
}
const steadySprite=makeSteadyGlow();
function geoFill(context,geometry,projection,color,stroke) {
  context.beginPath(); d3.geoPath(projection,context)(geometry);
  if (color) { context.fillStyle = color; context.fill(); }
  if (stroke) { context.strokeStyle = stroke; context.lineWidth = .75; context.stroke(); }
}
function resizeCanvas(c,context,scale=dpr) {
  c.width = Math.max(1,Math.round(width*scale)); c.height = Math.max(1,Math.round(height*scale));
  context.setTransform(c.width/width,0,0,c.height/height,0,0);
}
function size() {
  const oldWidth = width, oldHeight = height;
  const oldViews = views;
  width = map.clientWidth; height = map.clientHeight;
  if (!width || !height) return;
  const mapStyle=getComputedStyle(map), rootStyle=getComputedStyle(root);
  const reserved=(name,fallback)=>Math.max(0,parseFloat(mapStyle.getPropertyValue(name)||rootStyle.getPropertyValue(name))||fallback);
  const topSpace=reserved('--nl-map-top-space',35), bottomSpace=reserved('--nl-map-bottom-space',0);
  // Keep labels sharp while bounding raster memory on large, high-DPI monitors.
  const nextDpr=Math.min(devicePixelRatio||1,2,Math.sqrt(3000000/(width*height)));
  if(oldWidth===width&&oldHeight===height&&dpr===nextDpr&&mapTopSpace===topSpace&&mapBottomSpace===bottomSpace)return;
  mapTopSpace=topSpace;mapBottomSpace=bottomSpace;dpr=nextDpr;
  // Soft light and its water mask do not need retina-resolution buffers.
  effectDpr=Math.min(dpr,1,Math.sqrt(1200000/(width*height)));
  if (oldWidth && oldHeight) offset = [offset[0]*width/oldWidth,offset[1]*height/oldHeight];
  if(region==='overview') {
    const nextRects=overviewRects();
    for(const view of oldViews) {
      const next=nextRects[view.key], nav=overviewNavigation[view.key];
      if(next&&nav&&view.rect[2]&&view.rect[3])nav.offset=[nav.offset[0]*next[2]/view.rect[2],nav.offset[1]*next[3]/view.rect[3]];
    }
  }
  [[canvas,ctx],[base,bctx],[overlay,octx]].forEach(([c,context]) => resizeCanvas(c,context));
  [[mask,mctx],[beams,beamctx]].forEach(([c,context]) => resizeCanvas(c,context,effectDpr));
  updateProjection();
}
function overviewRects() {
  const available=Math.max(180,height-mapTopSpace-mapBottomSpace);
  const insetHeight=Math.min(195,Math.max(110,available*.3));
  const mainHeight=available-insetHeight, insetTop=mapTopSpace+mainHeight;
  return {mainland:[0,mapTopSpace,width,mainHeight],alaska:[0,insetTop,width*.61,insetHeight],hawaii:[width*.61,insetTop,width*.39,insetHeight]};
}
function navigation(viewKey) {return region==='overview'?overviewNavigation[viewKey]:{zoom,offset};}
function clampOffset(value,scale,rect) {
  // Keep the configured geographic area reachable; no unbounded panning into empty space.
  return value.map((v,i)=>{
    const limit=rect[i+2]*((scale-1)/2+.18);
    return Math.max(-limit,Math.min(limit,v));
  });
}
function activeView() {return views.find(view=>view.key===activeOverviewPane)||views[0];}
function syncNavigationControls() {
  const view=activeView();
  if(!view)return;
  const current=navigation(view.key).zoom;
  zoomText.textContent=`${fmt(current)}×`;
  root.querySelector('#nl-out').disabled=current<=1;
  root.querySelector('#nl-in').disabled=current>=40;
  const name=regions[view.key].name;
  const viewLabel=root.querySelector('#nl-view-label');
  if(viewLabel)viewLabel.textContent=name;
  root.querySelector('#nl-in').setAttribute('aria-label',`Zoom in on ${name}`);
  root.querySelector('#nl-out').setAttribute('aria-label',`Zoom out of ${name}`);
  map.dataset.region=region;
  map.dataset.activePane=view.key;
  map.dataset.zoom=String(current);
  map.dataset.panes=JSON.stringify(views.map(v=>({key:v.key,zoom:navigation(v.key).zoom,offset:[...navigation(v.key).offset],rect:v.rect})));
}
function createView(key,rect) {
  const [x,y,w,h]=rect;
  const bounds=key==='detail'?detailBounds:regions[key].bounds;
  const projection=d3.geoMercator().rotate([-(bounds[0]+bounds[2])/2,0]);
  const pad=Math.min(22,w*.06), top=region==='overview'?28:44;
  projection.fitExtent([[x+pad,y+top],[x+w-pad,y+h-32]],{type:'MultiPoint',coordinates:[[bounds[0],bounds[1]],[bounds[2],bounds[3]]]});
  const base=projection.scale(), tr=projection.translate();
  const nav=navigation(key), center=[x+w/2,y+h/2];
  nav.offset=clampOffset(nav.offset,nav.zoom,rect);
  if(region!=='overview')offset=nav.offset;
  projection.scale(base*nav.zoom).translate([center[0]+(tr[0]-center[0])*nav.zoom+nav.offset[0],center[1]+(tr[1]-center[1])*nav.zoom+nav.offset[1]]);
  projection.clipExtent([[x,y],[x+w,y+h]]);
  return {key,rect,projection,baseScale:base,zoom:nav.zoom};
}
function updateProjection(changedView=null) {
  if(region==='overview') {
    views=Object.entries(overviewRects()).map(([key,rect])=>createView(key,rect));
  } else views=[createView(region,[0,mapTopSpace,width,Math.max(120,height-mapTopSpace-mapBottomSpace)])];
  points = lights.map((light,index) => {
    const view=region==='overview'?views.find(v=>v.key===overviewRegion(light)):views[0];
    if(!view)return {light,index,x:-9999,y:-9999,r:0,view:null};
    const [x,y] = view.projection([light.lon,light.lat]);
    const mode=light.appearance?.mode||'generic';
    const range = mode==='local'?0:light.rangeNm||10;
    const r = view.projection.scale()*nmToRadians(range)/Math.cos(light.lat*Math.PI/180);
    return {light,index,x,y,r,view,mode,estimated:mode!=='local'&&!light.rangeNm,
      beamOffsets:mode==='grouped'?light.appearance.beamOffsetsTurns.map(turn=>turn*Math.PI*2):[0],
      phase:(index*2.399963229728653)%(Math.PI*2),angularSpeed:Math.PI*2/(light.appearance?.periodSeconds||10+(index%7)*1.2)};
  });
  for(const view of views)view.beamPoints=points.filter(p=>p.view===view&&p.light.active===true&&p.mode!=='local'&&visible(p));
  syncNavigationControls();
  regionSelect.value=region;
  root.querySelector('.nl-map-hint').textContent='Scroll to zoom · drag to explore · click a light';
  canvas.setAttribute('aria-label',`${regions[region].name}: animated lighthouse visibility map. Scroll or pinch to zoom. Select a lighthouse in the menu for accessible details.`);
  if(!changedView)baseDirtyViews=null;
  else if(baseDirtyViews!==null)baseDirtyViews.add(changedView);
  baseDirty=true;queueOverlay();
}
function queueOverlay() {overlayDirty=true;dirty=true;wake();}
function projectedPath(geometry,projection) {
  const path=new Path2D();d3.geoPath(projection,path)(geometry);return path;
}
function drawBase(viewKeys=null) {
  const ocean = bctx.createLinearGradient(0,0,width,height);
  ocean.addColorStop(0,'#0b1e29'); ocean.addColorStop(1,'#03111d');
  if(viewKeys===null) {
    bctx.fillStyle=ocean;bctx.fillRect(0,0,width,height);
    mctx.clearRect(0,0,width,height);
  }
  const grid=graticules[region==='overview'?'overview':'detail'];
  for(const view of views) {
    if(viewKeys&&!viewKeys.has(view.key))continue;
    bctx.save();clipView(bctx,view);
    mctx.save();clipView(mctx,view);
    bctx.fillStyle=ocean;bctx.fillRect(...rasterRect(bctx,view));mctx.clearRect(...rasterRect(mctx,view));
    geoFill(bctx,grid,view.projection,null,'rgba(123,162,178,.08)');
    const landPath=new Path2D();
    for(const feature of surfaceStates.features) {
      const p=feature.properties;
      const isUS=p.isUS || usStateNames.has(p.name);
      const coast=region==='detail'&&territoryStates.has(p.postal)?'#628490':'#2c454d';
      // Project once, then reuse exactly the same coastlines for the water mask.
      const path=projectedPath(feature,view.projection);landPath.addPath(path);
      bctx.fillStyle=isUS?'#172d35':'#13252e';bctx.fill(path);
      bctx.strokeStyle=coast;bctx.lineWidth=.75;bctx.stroke(path);
    }
    const lakePath=projectedPath(surfaceLakes,view.projection);
    bctx.fillStyle='#081a27';bctx.fill(lakePath);bctx.strokeStyle='#29424c';bctx.stroke(lakePath);
    mctx.fillStyle='#fff';mctx.fillRect(...rasterRect(mctx,view));
    mctx.globalCompositeOperation='destination-out';mctx.fill(landPath);
    mctx.globalCompositeOperation='source-over';mctx.fill(lakePath);
    bctx.strokeStyle='rgba(236,220,162,.11)';bctx.lineWidth=.65;
    for(const p of points) {
      if(p.view!==view || p.light.active!==true || !visible(p))continue;
      bctx.setLineDash(p.estimated?[2,4]:[]);
      bctx.beginPath();bctx.arc(p.x,p.y,p.r,0,Math.PI*2);bctx.stroke();
    }
    bctx.restore();mctx.restore();
  }
  map.dataset.rendering='flat';
}
function rasterRect(context,view) {
  // Adjacent pane damage regions share exact device-pixel edges, including at
  // fractional DPR, so repeated partial paints cannot accumulate an alpha seam.
  const [x,y,w,h]=view.rect,sx=context.canvas.width/width,sy=context.canvas.height/height;
  const left=Math.round(x*sx)/sx,top=Math.round(y*sy)/sy;
  return [left,top,Math.round((x+w)*sx)/sx-left,Math.round((y+h)*sy)/sy-top];
}
function clipView(context,view){context.beginPath();context.rect(...rasterRect(context,view));context.clip();}
function visible(p) {
  if(!p || !p.view)return false;
  const [x,y,w,h]=p.view.rect;
  return p.x+p.r>x&&p.x-p.r<x+w&&p.y+p.r>y&&p.y-p.r<y+h;
}
function inside(view,x,y){const [vx,vy,w,h]=view.rect;return x>=vx&&x<=vx+w&&y>=vy&&y<=vy+h;}
function writeLabel(context,text,x,y,color,align='center',spacing=0) {
  context.save(); context.font = '12px system-ui, sans-serif';
  context.textAlign = align; context.textBaseline = 'middle'; context.fillStyle = color;
  if('letterSpacing' in context) context.letterSpacing = spacing+'px';
  context.strokeStyle = '#0b1c27'; context.lineWidth = 3;
  context.strokeText(text,x,y); context.fillText(text,x,y); context.restore();
}
function drawOverlay() {
  octx.clearRect(0,0,width,height);
  const focus = hovered >= 0 ? points[hovered] : selected >= 0 ? points[selected] : null;
  for(const view of views) {
    octx.save();clipView(octx,view);
    const [vx,vy,vw,vh]=view.rect;
    const labelBoxes=[];
    let focusLabel=null;
    if(focus && focus.view===view && visible(focus)) {
      let text=focus.light.name.replace(/ Lighthouse$/,' Light');
      octx.font='12px system-ui, sans-serif';
      while(octx.measureText(text).width>vw-24 && text.length>5)text=text.slice(0,-2)+'…';
      const w=octx.measureText(text).width;
      const x=Math.max(vx+w/2+12,Math.min(vx+vw-w/2-12,focus.x));
      const y=Math.max(vy+40,Math.min(vy+vh-34,focus.y-24));
      focusLabel={text,x,y};labelBoxes.push([x-w/2-5,y-10,x+w/2+5,y+10]);
    }
    for(const [fullText,lon,lat,kind,abbr] of placeLabels) {
      if(region==='overview' && (kind==='city'||(view.key!=='mainland'&&kind==='state')))continue;
      if(kind==='state'&&view.zoom>6)continue;
      const text=kind==='state'&&region==='overview'?(abbr||fullText):fullText;
      const [x,y]=view.projection([lon,lat]);
      octx.font='12px system-ui, sans-serif';const w=octx.measureText(text).width;
      if(x-w/2<vx+8||x+w/2>vx+vw-8||y<vy+35||y>vy+vh-38)continue;
      const box=[x-w/2-5,y-10,x+w/2+5,y+10];
      if(labelBoxes.some(b=>box[0]<b[2]&&box[2]>b[0]&&box[1]<b[3]&&box[3]>b[1]))continue;
      labelBoxes.push(box);
      writeLabel(octx,text,x,y,kind==='state'?'#91a7ad':kind==='city'?'#afc1c6':'#7695a5');
    }
    for(const p of points) {
      if(p.view!==view||!visible(p))continue;
      if(p.mode==='local') {
        octx.fillStyle='#b7a781';octx.beginPath();octx.arc(p.x,p.y,region==='overview'?1.2:1.8,0,Math.PI*2);octx.fill();
        octx.strokeStyle='#746e60';octx.lineWidth=.7;octx.beginPath();octx.arc(p.x,p.y,region==='overview'?2.5:3.8,0,Math.PI*2);octx.stroke();
      } else if(p.light.active===true) {
        const g=region==='overview'?4.5:Math.min(9,Math.max(4.5,p.r*.17));
        const glow=octx.createRadialGradient(p.x,p.y,0,p.x,p.y,g);
        glow.addColorStop(0,'rgba(255,249,226,.72)');
        glow.addColorStop(.18,'rgba(255,233,180,.32)');
        glow.addColorStop(.5,'rgba(241,202,136,.10)');
        glow.addColorStop(1,'rgba(241,202,136,0)');
        octx.fillStyle=glow;octx.beginPath();octx.arc(p.x,p.y,g,0,Math.PI*2);octx.fill();
        octx.fillStyle='#fffff4';octx.beginPath();octx.arc(p.x,p.y,region==='overview'?1.05:1.8,0,Math.PI*2);octx.fill();
      } else {
        octx.strokeStyle='#8ba0aa';octx.lineWidth=.9;octx.beginPath();octx.arc(p.x,p.y,region==='overview'?1.5:2.3,0,Math.PI*2);octx.stroke();
      }
    }
    if(focusLabel) {
      octx.lineWidth=1;octx.strokeStyle=focus.light.active===true?'#ead9a7':'#9baeb8';
      if(focus.light.active===true&&focus.mode!=='local'){octx.setLineDash(focus.estimated?[3,4]:[]);octx.beginPath();octx.arc(focus.x,focus.y,focus.r,0,Math.PI*2);octx.stroke();}
      octx.setLineDash([]);octx.beginPath();octx.arc(focus.x,focus.y,6,0,Math.PI*2);octx.stroke();
      writeLabel(octx,focusLabel.text,focusLabel.x,focusLabel.y,'#fff0c8');
    }
    const centerLat=view.projection.invert([vx+vw/2,vy+vh/2])[1];
    const pxPerNm=view.projection.scale()*nmToRadians(1)/Math.cos(centerLat*Math.PI/180);
    const choices=[.5,1,2,5,10,25,50,100,200,500];
    const nm=choices.filter(v=>v*pxPerNm<Math.min(70,vw*.3)).at(-1)||.5;
    const length=pxPerNm*nm;
    octx.strokeStyle='#a3b8c1';octx.lineWidth=1;
    octx.beginPath();octx.moveTo(vx+14,vy+vh-15);octx.lineTo(vx+14+length,vy+vh-15);octx.stroke();
    writeLabel(octx,`${nm} nm`,vx+14,vy+vh-27,'#a7bdc6','left');
    if(region==='overview')writeLabel(octx,view.key==='mainland'?'CONTIGUOUS U.S.':regions[view.key].name.toUpperCase(),vx+14,vy+15,'#a7bdc6','left');
    octx.restore();
  }
  if(region==='overview') {
    const y=views[1].rect[1];octx.strokeStyle='#29414c';octx.lineWidth=1;
    octx.beginPath();octx.moveTo(0,y);octx.lineTo(width,y);octx.moveTo(width*.61,y);octx.lineTo(width*.61,height-mapBottomSpace);octx.stroke();
  }
}
function render() {
  // Wheel and pointer events update navigation immediately; costly static paints
  // are coalesced into the next displayed frame and only rebuild changed panes.
  if(baseDirty){drawBase(baseDirtyViews);baseDirty=false;baseDirtyViews=new Set();}
  if(overlayDirty){drawOverlay();overlayDirty=false;}
  ctx.drawImage(base,0,0,width,height);
  beamctx.clearRect(0,0,width,height);
  beamctx.globalCompositeOperation='lighter';
  for(const view of views) {
    beamctx.save();clipView(beamctx,view);
    for(const p of view.beamPoints) {
      // Reviewed patterns use their documented cadence; beam geometry is schematic.
      beamctx.save();beamctx.translate(p.x,p.y);
      beamctx.globalAlpha=selected<0||p.index===selected?1:.6;
      if(p.mode==='steady'||p.mode==='flash') {
        if(p.mode==='flash') {
          const cycle=(time+p.phase/(Math.PI*2)*p.light.appearance.periodSeconds)%p.light.appearance.periodSeconds;
          const progress=cycle/p.light.appearance.displayPulseSeconds;
          beamctx.globalAlpha*=progress<1?Math.sin(Math.PI*progress):0;
        }
        beamctx.drawImage(steadySprite,-p.r,-p.r,p.r*2,p.r*2);
      } else {
        const scale=p.r/250;
        beamctx.rotate(time*p.angularSpeed+p.phase);
        let previous=0;
        for(const angle of p.beamOffsets) {
          beamctx.rotate(angle-previous);previous=angle;
          beamctx.drawImage(beamSprite,0,-64*scale,256*scale,128*scale);
        }
      }
      beamctx.restore();
    }
    beamctx.restore();
  }
  beamctx.globalCompositeOperation='destination-in';
  beamctx.drawImage(mask,0,0,width,height);
  beamctx.globalCompositeOperation='source-over';
  ctx.drawImage(beams,0,0,width,height);ctx.drawImage(overlay,0,0,width,height);
  dirty=false;
}
function tick(now) {
  frameId=0;
  if(!root.isConnected) return;
  if(!paused && !document.hidden && inView) {
    const paintStarted=performance.now();
    // Use elapsed time so a struggling device does not slow documented flash cycles.
    // Pause, background-tab and offscreen transitions reset lastTime separately.
    if(lastTime!==null) time+=Math.max(0,(now-lastTime)/1000);
    lastTime=now;render();
    // Sleep between paints; high-refresh displays do not need hundreds of
    // callbacks each second for a slow sweep. Input wakes the next frame.
    frameTimer=setTimeout(()=>{
      frameTimer=0;
      if(root.isConnected&&!paused&&!document.hidden&&inView)frameId=requestAnimationFrame(tick);
    },Math.max(16,1000/30-(performance.now()-paintStarted)));
  } else { lastTime=null;if(dirty)render(); }
}
function wake() {
  if(frameTimer){clearTimeout(frameTimer);frameTimer=0;}
  if(!root.isConnected||document.hidden||!inView){if(frameId)cancelAnimationFrame(frameId);frameId=0;lastTime=null;return;}
  if(!frameId&&width)frameId=requestAnimationFrame(tick);
}
function updatePlay() {play.textContent=paused?'Play beams':'Pause beams';play.setAttribute('aria-pressed',String(paused));}
play.addEventListener('click',()=>{paused=!paused;lastTime=null;updatePlay();wake();});
reducedMotion.addEventListener('change',event=>{paused=event.matches;lastTime=null;updatePlay();wake();});
document.addEventListener('visibilitychange',()=>{lastTime=null;wake();});
const observer=new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;lastTime=null;wake();});
observer.observe(map);
function setZoom(value,anchor=null,targetView=null) {
  const view=targetView||(anchor&&views.find(v=>inside(v,...anchor)))||activeView();
  if(!view)return;
  if(region==='overview')activeOverviewPane=view.key;
  const nav=navigation(view.key), [x,y,w,h]=view.rect, center=[x+w/2,y+h/2];
  anchor=anchor||center;
  const next=Math.max(1,Math.min(40,value));
  const factor=next/nav.zoom;
  const nextOffset=next===1?[0,0]:clampOffset(anchor.map((v,i)=>v-center[i]-(v-center[i]-nav.offset[i])*factor),next,view.rect);
  if(next===nav.zoom&&nextOffset.every((v,i)=>v===nav.offset[i])){syncNavigationControls();return;}
  nav.offset=nextOffset;
  nav.zoom=next;
  if(region!=='overview'){zoom=nav.zoom;offset=nav.offset;}
  hovered=-1;
  updateProjection(view.key);
}
function zoomBy(factor,anchor=null) {
  const view=(anchor&&views.find(v=>inside(v,...anchor)))||activeView();
  if(view)setZoom(navigation(view.key).zoom*factor,anchor,view);
}
root.querySelector('#nl-in').addEventListener('click',()=>zoomBy(1.6));
root.querySelector('#nl-out').addEventListener('click',()=>zoomBy(1/1.6));
function resetView() {
  for(const nav of Object.values(overviewNavigation)){nav.zoom=1;nav.offset=[0,0];}
  activeOverviewPane='mainland';region='overview';zoom=1;offset=[0,0];hovered=-1;
  updateProjection();
}
root.querySelector('#nl-home')?.addEventListener('click',resetView);
function local(event) {const rect=canvas.getBoundingClientRect();return[event.clientX-rect.left,event.clientY-rect.top];}
function nearest(x,y) {
  let result=-1,min=matchMedia('(pointer:coarse)').matches?24:15;
  for(const p of points){if(!visible(p)||!inside(p.view,x,y))continue;const distance=Math.hypot(p.x-x,p.y-y);if(distance<min){min=distance;result=p.index;}}
  return result;
}
function changeRegion(key) {
  if(!regions[key]||(key==='detail'&&!detailBounds))return;
  region=key;zoom=1;offset=[0,0];hovered=-1;
  if(key==='overview')activeOverviewPane='mainland';
  updateProjection();
}
regionSelect.addEventListener('change',()=>changeRegion(regionSelect.value));
function selectLight(index,focus=false) {
  selected=index;select.value=index>=0?String(index):'';
  if(index<0) {
    closeInfo();
    detail.textContent='Click a light for its history, details, and sources.';
    if(focus)resetView();
    else queueOverlay();
    return;
  }
  showLighthouseInfo(index);
  if(focus)focusLight(index);
  else queueOverlay();
}
function focusLight(index) {
  const l=lights[index];
  const latSpan=Math.max(.45,(l.rangeNm||10)/60*2.8);
  const lonSpan=latSpan/Math.cos(l.lat*Math.PI/180)*Math.max(1,width/height);
  detailBounds=[l.lon-lonSpan,l.lat-latSpan,l.lon+lonSpan,l.lat+latSpan];
  const overlayPanel=getComputedStyle(infoPlacement).position==='absolute';
  region='detail';zoom=1;offset=[overlayPanel&&!infoPlacement.hidden?-infoPlacement.clientWidth/2:0,0];
  regionSelect.querySelector('option[value="detail"]').disabled=false;
  updateProjection();
}
select.addEventListener('change',()=>selectLight(select.value===''?-1:Number(select.value),true));
const gesturePointers=new Map();
let pinch=null;
canvas.style.touchAction='none';
function pinchGeometry() {
  const [a,b]=gesturePointers.values();
  return b?{midpoint:a.last.map((v,i)=>(v+b.last[i])/2),distance:Math.hypot(a.last[0]-b.last[0],a.last[1]-b.last[1])}:null;
}
function rebaseGesture() {
  pointer=gesturePointers.values().next().value||null;
  pinch=pinchGeometry();
  if(pointer)pointer.start=[...pointer.last];
  if(pinch)for(const p of gesturePointers.values())p.moved=true;
  if(!pointer)canvas.classList.remove('nl-dragging');
}
function moveGesture(view,nextZoom,nextOffset) {
  const nav=navigation(view.key);
  nextOffset=clampOffset(nextOffset,nextZoom,view.rect);
  if(nextZoom===nav.zoom&&nextOffset.every((v,i)=>v===nav.offset[i]))return;
  nav.zoom=nextZoom;nav.offset=nextOffset;
  if(region!=='overview'){zoom=nav.zoom;offset=nav.offset;}
  hovered=-1;canvas.classList.add('nl-dragging');updateProjection(view.key);
}
function finishPointer(event,cancelled=false) {
  const ended=gesturePointers.get(event.pointerId);
  if(!ended)return;
  const tap=!cancelled&&gesturePointers.size===1&&!ended.moved&&ended.region===region;
  gesturePointers.delete(event.pointerId);
  if(cancelled)for(const p of gesturePointers.values())p.moved=true;
  // Rebase before releasing capture: the later lost-capture event cannot clear
  // a surviving finger or let the end of a pinch become a lighthouse tap.
  rebaseGesture();
  if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);
  if(tap) {
    const pos=local(event),candidates=candidatesAt(...pos);
    if(candidates.length>1)showNearby(candidates);
    else if(candidates.length===1)selectLight(candidates[0],false);
    else selectLight(-1);
  }
}
canvas.addEventListener('pointerdown',event=>{
  if(event.button!==0||gesturePointers.has(event.pointerId))return;
  if(pointer&&(event.pointerType!=='touch'||pointer.type!=='touch'))return;
  const p=local(event), view=views.find(v=>inside(v,...p));
  if(!view)return;
  if(pointer&&view.key!==pointer.viewKey) {
    // A second finger in another inset must not transform either inset.
    pointer.moved=true;
    return;
  }
  if(region==='overview')activeOverviewPane=view.key;
  syncNavigationControls();
  gesturePointers.set(event.pointerId,{id:event.pointerId,type:event.pointerType,start:p,last:p,moved:!!pointer,viewKey:view.key,region});
  rebaseGesture();
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove',event=>{
  const p=local(event);
  const tracked=gesturePointers.get(event.pointerId);
  if(tracked) {
    if(tracked.region!==region){finishPointer(event,true);return;}
    const previous=tracked.last;
    tracked.last=p;
    const view=views.find(v=>v.key===tracked.viewKey);
    if(!view){finishPointer(event,true);return;}
    if(pinch) {
      const next=pinchGeometry(),nav=navigation(view.key);
      if(pinch.distance>=2&&next.distance>=2) {
        const nextZoom=Math.max(1,Math.min(40,nav.zoom*next.distance/pinch.distance));
        const factor=nextZoom/nav.zoom,[x,y,w,h]=view.rect,center=[x+w/2,y+h/2];
        // Equivalent to zooming about the old midpoint then panning to the new
        // one, with one bounds clamp and one synchronous projection update.
        const nextOffset=next.midpoint.map((v,i)=>v-center[i]-(pinch.midpoint[i]-center[i]-nav.offset[i])*factor);
        moveGesture(view,nextZoom,nextOffset);
      }
      pinch=next;
    } else {
      if(Math.hypot(p[0]-tracked.start[0],p[1]-tracked.start[1])>4)tracked.moved=true;
      if(tracked.moved) {
        const nav=navigation(view.key);
        moveGesture(view,nav.zoom,nav.offset.map((v,i)=>v+p[i]-previous[i]));
      }
    }
  } else if(!pointer&&event.pointerType!=='touch') {
    const index=nearest(...p);
    if(index!==hovered){hovered=index;canvas.style.cursor=index>=0?'pointer':'grab';queueOverlay();}
  }
});
canvas.addEventListener('pointerup',event=>finishPointer(event));
function cancelPointer(event) {finishPointer(event,true);}
canvas.addEventListener('pointercancel',cancelPointer);
canvas.addEventListener('lostpointercapture',cancelPointer);
canvas.addEventListener('pointerleave',()=>{if(hovered>=0){hovered=-1;queueOverlay();}});
canvas.addEventListener('dblclick',event=>{event.preventDefault();zoomBy(1.6,local(event));});
canvas.addEventListener('wheel',event=>{
  if(!event.deltaY)return;
  event.preventDefault();
  const pos=local(event), view=views.find(v=>inside(v,...pos))||activeView();
  const units=event.deltaMode===1?16:event.deltaMode===2?view.rect[3]:1;
  const delta=Math.max(-600,Math.min(600,event.deltaY*units));
  zoomBy(Math.exp(-delta*.002),pos);
},{passive:false});
updatePlay();new ResizeObserver(size).observe(map);size();
