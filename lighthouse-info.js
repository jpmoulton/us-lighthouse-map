function element(tag,className,text) {
  const node=document.createElement(tag);
  if(className)node.className=className.split(' ').map(name=>({btn:'btn nl-button','text-small':'text-small nl-text-small','viz-row':'viz-row nl-row'}[name]||name)).join(' ');
  if(text!=null)node.textContent=text;
  return node;
}
function externalLink(url,text,label) {
  const link=element('a','',text);link.href=url;link.target='_blank';link.rel='noopener noreferrer';
  if(label)link.setAttribute('aria-label',label);
  return link;
}
function signalText(code) {
  if(!code)return 'Not verified';
  const colors={W:'white',R:'red',G:'green',Y:'yellow',Bu:'blue'};
  const cleaned=code.trim().replace(/\s+/g,' ');
  const match=cleaned.match(/^(Fl|F|Oc|Iso|Al|Q|VQ|UQ|LFl)\s*(?:\(([^)]+)\))?\s*([WRGY]+)(?:\s+(\d+(?:\.\d+)?)s)?$/i);
  if(!match)return cleaned;
  const [,kind,group,colorCode,period]=match;
  const color=[...colorCode.toUpperCase()].map(c=>colors[c]||c).join(' / ');
  const colorLabel=color[0].toUpperCase()+color.slice(1);
  if(kind==='F')return `Steady ${color}`;
  if(kind==='Al')return `Alternating ${color}${period?`; ${period} s cycle`:''}`;
  if(kind==='Iso')return `${colorLabel}; equal light and dark periods${period?`; ${period} s cycle`:''}`;
  if(kind==='Oc')return `${colorLabel}; ${group?`${group} eclipses`:'brief eclipse'}${period?` per ${period} s cycle`:''}`;
  if(['Q','VQ','UQ'].includes(kind))return `${kind==='Q'?'Quick':kind==='VQ'?'Very quick':'Ultra quick'} ${color} flashes${group?` in groups of ${group}`:''}${period?`; ${period} s cycle`:''}`;
  return `${colorLabel} ${kind==='LFl'?'long ':''}${group?`flashes in groups of ${group}`:'flash'}${period?` every ${period} s`:''}`;
}
function closeInfo() {
  infoPlacement.hidden=true;nearbyCandidates=[];nearbyPage=0;
  detail.textContent=selected>=0?`${lights[selected].name} selected. Click it again to reopen its information.`:'Click any light for its history, details, and sources.';
}
function revealInfo(announce) {
  infoPlacement.hidden=false;
  if(announce)detail.textContent=announce;
  if(getComputedStyle(infoPlacement).position==='static'||matchMedia('(max-width:640px)').matches) {
    requestAnimationFrame(()=>infoPlacement.scrollIntoView({block:'nearest',behavior:'auto'}));
  }
}
function showLighthouseInfo(index) {
  const light=lights[index], profile=profiles[light.id]||{};
  nearbyCandidates=[];nearbyPage=0;
  infoTitle.textContent=light.name;
  infoPlacement.dataset.lighthouseId=light.id;
  infoPlacement.dataset.status=light.active===true?'active':light.active===false?'historic':'unknown';
  infoContent.replaceChildren();
  const sourceEntries=[],sourceIndexes=new Map();
  function reference(url,label,context) {
    if(!url)return null;
    if(!sourceIndexes.has(url)) {
      sourceIndexes.set(url,sourceEntries.length+1);
      const genericLabel=!label||/^(Operating status source|Site notes source|Site classification source|Published location|Lighthouse inventory)$/.test(label);
      sourceEntries.push({url,label:genericLabel?new URL(url).hostname.replace(/^www\./,''):label});
    }
    const number=sourceIndexes.get(url);
    return externalLink(url,`[${number}]`,`Source ${number}${context?` for ${context}`:''}`);
  }
  const status=light.appearance?.statusLabel||(light.active===true?'Listed active':light.active===false?'Historic / inactive':'Status unconfirmed');
  const subtitle=element('div','nl-info-subtitle text-small',`${stateNames[light.state]||light.state} · ${status}`);
  const statusRef=reference(light.statusSourceUrl||light.sourceUrl,'Operating status source','listed operating status');
  if(statusRef)subtitle.append(' ',statusRef);
  infoContent.append(subtitle);
  const summary=profile.summary;
  if(summary) {
    const paragraph=element('p','nl-info-summary nl-lighthouse-summary',summary);
    for(const source of profile.summarySources||[]) {
      const url=typeof source==='string'?source:source.url||source.sourceUrl;
      const ref=reference(url,typeof source==='object'?source.label||source.sourceLabel:null,'summary');
      if(ref)paragraph.append(' ',ref);
    }
    infoContent.append(paragraph);
  }
  if(light.appearance) {
    const behavior=element('div','nl-light-behavior');
    behavior.append(element('strong','text-small',light.appearance.label));
    const explanation=element('p','text-small',light.appearance.note);
    for(const source of [{url:light.appearance.sourceUrl,label:light.appearance.sourceLabel},...(light.appearance.additionalSources||[])]) {
      const ref=reference(source.url,source.label,'light behavior');if(ref)explanation.append(' ',ref);
    }
    behavior.append(explanation);infoContent.append(behavior);
  }
  const historyFacts=Array.isArray(profile.facts)?profile.facts:[];
  function factList(facts) {
    const list=element('dl','nl-info-facts nl-history-facts');
    for(const fact of facts) {
      if(fact.value==null||fact.value==='')continue;
      const label=element('dt','text-small',fact.label);
      const value=element('dd','text-small',String(fact.value));
      const ref=reference(fact.sourceUrl,fact.sourceLabel,fact.label);
      if(ref)value.append(' ',ref);
      list.append(label,value);
    }
    return list;
  }
  if(historyFacts.length) {
    if(summary) {
      const history=element('details','nl-info-more');
      history.append(element('summary','','History & construction'),factList(historyFacts));
      infoContent.append(history);
    } else {
      infoContent.append(factList(historyFacts.slice(0,4)));
      if(historyFacts.length>4) {
      const more=element('details','nl-info-more');more.append(element('summary','',`More documented details (${historyFacts.length-4})`),factList(historyFacts.slice(4)));infoContent.append(more);
      }
    }
  }
  if(light.notes) {
    const note=element('p','nl-info-summary text-small',light.notes);
    const ref=reference(light.notesSourceUrl||light.sourceUrl,'Site notes source','site notes');if(ref)note.append(' ',ref);
    infoContent.append(note);
  }
  const operation=element('details','nl-info-more');
  operation.open=!historyFacts.length;
  operation.append(element('summary','', 'Light & map details'));
  const opFacts=element('dl','nl-info-facts');
  function opFact(label,value,url,sourceLabel) {
    const dt=element('dt','text-small',label),dd=element('dd','text-small',value);
    const ref=reference(url,sourceLabel,label);if(ref)dd.append(' ',ref);
    opFacts.append(dt,dd);
  }
  if(light.appearance?.mode==='local') {
    opFact('Map light','Small local marker; no sweeping beam or estimated range',light.appearance.sourceUrl,light.appearance.sourceLabel);
    opFact('Visibility range','No verified modern range; the 10 nm fallback is not applied');
  } else if(light.active===true) {
    opFact('Visibility range',light.rangeNm?`${fmt(light.rangeNm)} nm · ${fmt(light.rangeNm*1.852)} km${light.archivedYear?` (${light.archivedYear})`:''}`:'Not published here; map uses a 10 nm estimate',light.rangeNm?light.rangeSourceUrl:null,'U.S. Coast Guard light list');
    if(light.characteristic) {
      opFact('Light signal',signalText(light.characteristic),light.rangeSourceUrl,'U.S. Coast Guard light list');
      opFact('Chart notation',light.characteristic);
    }
    if(light.focalHeightFt>0)opFact('Light elevation',`${fmt(light.focalHeightFt)} ft · ${fmt(light.focalHeightFt*.3048)} m above datum`,light.rangeSourceUrl,'U.S. Coast Guard light list');
  } else opFact('Map beam',light.active===false?'No operating beam shown':'Not shown; status unconfirmed');
  opFact('Mapped position',`${Math.abs(light.lat).toFixed(4)}° ${light.lat>=0?'N':'S'}, ${Math.abs(light.lon).toFixed(4)}° ${light.lon>=0?'E':'W'}`,light.coordinateSourceUrl||light.sourceUrl,'Published location');
  const structures={historic:'Historic lighthouse site',modern:'Modern lighthouse or replacement',replica:'Replica / reconstruction',ornamental:'Ornamental lighthouse',ruins:'Surviving historic remains',demolished:'Historic site · tower no longer standing','historic-site-modern-beacon':'Historic site with a modern light'};
  if(structures[light.structure])opFact('Site type',structures[light.structure],light.structureSourceUrl||light.sourceUrl,'Site classification source');
  operation.append(opFacts);
  infoContent.append(operation);
  const sources=element('details','nl-info-more');
  sources.append(element('summary','',`Sources & record notes (${sourceEntries.length||1})`));
  if(!sourceEntries.length)reference(light.sourceUrl,'Lighthouse inventory');
  const sourceList=element('ol','nl-info-source-list text-small');
  for(const source of sourceEntries) {
    const item=element('li');item.append(externalLink(source.url,source.label));sourceList.append(item);
  }
  sources.append(sourceList);
  const reviewNote=profile.reviewNote||profile.coverageNote||'Only facts supported by the linked sources are shown. Unconfirmed historical details are omitted.';
  sources.append(element('p','text-small nl-info-data-notes',reviewNote));
  if(profile.missingFieldsNote&&profile.missingFieldsNote!==reviewNote)sources.append(element('p','text-small nl-info-data-notes',profile.missingFieldsNote));
  sources.append(element('p','text-small nl-info-data-notes','Operating status reflects the cited records, not a live Coast Guard notice. Coordinates are approximate.'));
  infoContent.append(sources);
  const actions=element('div','viz-row nl-info-more nl-info-actions');
  const zoomButton=element('button','btn','Zoom to this light');zoomButton.type='button';
  zoomButton.addEventListener('click',()=>focusLight(index));actions.append(zoomButton);
  infoContent.append(actions);
  revealInfo(`${light.name} selected. Its information and source links are open.`);
}
function candidatesAt(x,y) {
  const radius=matchMedia('(pointer:coarse)').matches?24:16;
  return points.filter(p=>p.view&&inside(p.view,p.x,p.y)&&inside(p.view,x,y)&&Math.hypot(p.x-x,p.y-y)<=radius)
    .sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y)).map(p=>p.index);
}
function showNearby(candidates,page=0) {
  nearbyCandidates=candidates;nearbyPage=page;
  delete infoPlacement.dataset.lighthouseId;
  infoTitle.textContent=`${candidates.length} nearby lighthouse sites`;
  infoContent.replaceChildren(element('p','nl-info-subtitle text-small','Choose the lighthouse you want to read about.'));
  const start=page*6,visibleCandidates=candidates.slice(start,start+6);
  const list=element('div','nl-nearby-list');
  for(const index of visibleCandidates) {
    const light=lights[index];
    const button=element('button','btn');button.type='button';
    button.append(element('span','nl-nearby-name',light.name));
    button.append(element('span','nl-nearby-place text-small',`${stateNames[light.state]||light.state} · ${light.appearance?.statusLabel||(light.active===true?'listed active':light.active===false?'historic':'status unconfirmed')}`));
    button.dataset.lighthouseIndex=String(index);
    button.addEventListener('click',()=>selectLight(index,false));
    list.append(button);
  }
  infoContent.append(list);
  if(candidates.length>6) {
    const controls=element('div','viz-row');
    const previous=element('button','btn','Previous'),next=element('button','btn','Next');
    previous.type=next.type='button';previous.disabled=page===0;next.disabled=start+6>=candidates.length;
    previous.addEventListener('click',()=>showNearby(candidates,page-1));next.addEventListener('click',()=>showNearby(candidates,page+1));
    controls.append(previous,element('span','text-small',`${start+1}–${Math.min(start+6,candidates.length)} of ${candidates.length}`),next);
    infoContent.append(controls);
  }
  revealInfo(`${candidates.length} nearby lighthouse sites. Choose one from the list.`);
}
root.querySelector('#nl-info-close').addEventListener('click',closeInfo);
root.addEventListener('keydown',event=>{if(event.key==='Escape')closeInfo();});
