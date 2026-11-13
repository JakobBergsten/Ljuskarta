'use client';
import {asset} from './assets';
import {useEffect,useRef,useState} from 'react';
import type {Candle,Point} from './types';
import {hasLoadedTileAt} from '../lib/visible-map-tile.mjs';

declare global {interface Window {L:any}}
const candleHtml=`<span class="map-candle"><picture><source media="(prefers-reduced-motion: reduce)" srcset="${asset("candle-still.png")}"><img src="${asset("candle-burning.gif")}" alt="" width="144" height="220" draggable="false"></picture></span>`;
let leafletPromise:Promise<any>|null=null;

function loadLeaflet(){
  if(window.L)return Promise.resolve(window.L);
  if(leafletPromise)return leafletPromise;
  leafletPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=asset('vendor/leaflet.js');
    script.onload=()=>window.L?resolve(window.L):reject(Error('Kartan kunde inte startas.'));
    script.onerror=()=>{script.remove();leafletPromise=null;reject(Error('Kartans program kunde inte laddas.'))};
    document.head.appendChild(script);
  });
  return leafletPromise;
}

const normalize=(p:{lat:number;lng:number}):Point=>({latitude:Math.max(-85,Math.min(85,p.lat)),longitude:((p.lng+180)%360+360)%360-180});

export default function MapCanvas({candles,selected,picking,point,onPick,onSelect,mapAction,onReady,onError}:{candles:Candle[];selected:string|null;picking:boolean;point:Point|null;onPick:(p:Point)=>void;onSelect:(id:string)=>void;mapAction:{type:'all'|'center'|'locate';seq:number;point?:Point};onReady:()=>void;onError:(message:string)=>void}) {
  const host=useRef<HTMLDivElement>(null),map=useRef<any>(null),draft=useRef<any>(null),markers=useRef(new Map<string,any>());
  const callbacks=useRef({onPick,onSelect,onReady,onError,picking});callbacks.current={onPick,onSelect,onReady,onError,picking};
  const data=useRef(candles);data.current=candles;
  const pointRef=useRef(point);pointRef.current=point;
  const pickAt=useRef<(p:{lat:number;lng:number})=>boolean>(()=>false);
  const initialFit=useRef(false);
  const [generation,setGeneration]=useState(0);
  // Leaflet owns additional classes on this node. Updating React's className
  // when the editor opens would erase leaflet-container and break tile sizing.
  useEffect(()=>{host.current?.classList.toggle('is-picking',picking)},[picking,generation]);

  useEffect(()=>{
    let disposed=false,observer:ResizeObserver|undefined,raf=0,loadingTimer:ReturnType<typeof setTimeout>|undefined;
    const abort=new AbortController();
    let release=()=>{},refresh=()=>{};
    const visibility=()=>document.hidden?release():refresh();
    const leave=(event:MouseEvent)=>{if(event.relatedTarget===null)release()};
    loadLeaflet().then(L=>{
      if(disposed||!host.current)return;
      const m=L.map(host.current,{zoomControl:false,minZoom:2,maxZoom:18,worldCopyJump:true,inertia:false,zoomAnimation:false,fadeAnimation:false,maxBounds:[[-85,-180],[85,180]],maxBoundsViscosity:.85}).setView([35,15],3);
      map.current=m;
      L.control.zoom({position:'bottomright'}).addTo(m);
      // A local outline remains available when a browser cannot reach OSM tiles.
      m.createPane('worldBackdrop');m.getPane('worldBackdrop').style.zIndex='190';m.getPane('worldBackdrop').style.pointerEvents='none';
      const showOverview=()=>{m.getPane('worldBackdrop').style.display=m.getZoom()<=5?'':'none'};
      m.on('zoomend',showOverview);showOverview();
      fetch(asset('world-land.geojson'),{signal:abort.signal}).then(r=>{if(!r.ok)throw Error();return r.json()}).then(land=>{if(!disposed)L.geoJSON(land,{pane:'worldBackdrop',interactive:false,style:{fillColor:'#f7f5ef',fillOpacity:1,color:'#b7c4b2',weight:.7},attribution:'Land: <a href="https://www.naturalearthdata.com/">Natural Earth</a>'}).addTo(m)}).catch(()=>{});
      const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,keepBuffer:2,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'});
      let errors=0;
      const missingDetails='Detaljerade kartbilder saknas här. Reservöversikten visar inte vikar eller exakta kustlinjer. Prova Återställ karta. Du kan inte välja en plats på en kartdel som inte har laddats.';
      tiles.on('loading',()=>{errors=0;clearTimeout(loadingTimer);loadingTimer=setTimeout(()=>{if(!disposed)callbacks.current.onError('Detaljkartan laddas fortfarande. Vänta tills kartbilderna visas innan du väljer plats.')},10000)});
      tiles.on('tileerror',()=>{errors++;callbacks.current.onError(missingDetails)});
      tiles.on('load',()=>{clearTimeout(loadingTimer);callbacks.current.onError(errors?missingDetails:'')});
      tiles.addTo(m);
      pickAt.current=(p)=>{
        if(!host.current)return false;
        if(tiles.isLoading()){callbacks.current.onError('Vänta tills detaljkartan har laddats innan du väljer plats.');return false;}
        const local=m.latLngToContainerPoint(p),box=host.current.getBoundingClientRect();
        if(!hasLoadedTileAt(host.current.querySelectorAll('.leaflet-tile'),m.getZoom(),box.left+local.x,box.top+local.y)){callbacks.current.onError(missingDetails);return false;}
        callbacks.current.onPick(normalize(p));return true;
      };
      m.on('click',(event:any)=>{if(callbacks.current.picking)pickAt.current(event.latlng)});
      release=()=>{
        if(disposed)return;
        m.stop();
        // Public Leaflet handlers finish abandoned mouse/touch drags and remove
        // the document listeners and cursor classes they installed.
        if(m.dragging.enabled()){m.dragging.disable();m.dragging.enable();}
        if(draft.current?.dragging?.enabled()){draft.current.dragging.disable();draft.current.dragging.enable();}
      };
      refresh=()=>{
        cancelAnimationFrame(raf);
        raf=requestAnimationFrame(()=>{if(!disposed&&host.current&&host.current.clientWidth&&host.current.clientHeight){m.invalidateSize({animate:false,pan:false});}});
      };
      observer=new ResizeObserver(refresh);observer.observe(host.current);
      window.addEventListener('blur',release);
      window.addEventListener('pointercancel',release);
      window.addEventListener('mouseout',leave);
      window.addEventListener('resize',refresh);
      document.addEventListener('visibilitychange',visibility);
      setGeneration(n=>n+1);refresh();callbacks.current.onReady();
    }).catch(()=>{if(!disposed)callbacks.current.onError('Kartan kunde inte öppnas. Tryck på Återställ karta för att försöka igen. Dina ljus finns kvar i listan.');});
    return()=>{
      disposed=true;abort.abort();observer?.disconnect();cancelAnimationFrame(raf);clearTimeout(loadingTimer);pickAt.current=()=>false;
      window.removeEventListener('blur',release);window.removeEventListener('pointercancel',release);window.removeEventListener('mouseout',leave);window.removeEventListener('resize',refresh);document.removeEventListener('visibilitychange',visibility);
      markers.current.clear();draft.current=null;map.current?.remove();map.current=null;
    };
  },[]);

  useEffect(()=>{
    if(!generation||!map.current)return;
    const L=window.L;
    const present=new Set(candles.map(c=>c.id));
    for(const [id,marker]of markers.current)if(!present.has(id)){marker.remove();markers.current.delete(id)}
    candles.forEach(c=>{
      let marker=markers.current.get(c.id);
      if(!marker){
        const icon=L.divIcon({className:'candle-marker',html:candleHtml,iconSize:[44,64],iconAnchor:[22,58]});
        marker=L.marker([c.latitude,c.longitude],{icon,title:`Ljus för ${c.person}, ${c.place}`,alt:`Ljus för ${c.person}`,keyboard:true}).on('click',()=>callbacks.current.onSelect(c.id)).addTo(map.current);
        markers.current.set(c.id,marker);
      }
      marker.setLatLng([c.latitude,c.longitude]);
      const element=marker.getElement();
      if(element){element.classList.toggle('is-selected',selected===c.id);element.setAttribute('title',`Ljus för ${c.person}, ${c.place}`);element.setAttribute('aria-label',`Ljus för ${c.person}, ${c.place}`)}
    });
    if(!initialFit.current&&candles.length){map.current.fitBounds(candles.map(c=>[c.latitude,c.longitude]),{padding:[55,55],maxZoom:7});initialFit.current=true;}
  },[generation,candles,selected]);

  useEffect(()=>{
    if(!generation||!map.current)return;
    if(!picking||!point){draft.current?.remove();draft.current=null;return;}
    if(!draft.current){
      const L=window.L;
      draft.current=L.marker([point.latitude,point.longitude],{icon:L.divIcon({className:'candle-marker draft-marker',html:candleHtml,iconSize:[44,64],iconAnchor:[22,58]}),draggable:true,title:'Vald plats. Dra för att flytta.'}).on('dragend',(event:any)=>{if(!pickAt.current(event.target.getLatLng())&&pointRef.current)event.target.setLatLng([pointRef.current.latitude,pointRef.current.longitude])}).addTo(map.current);
    }else draft.current.setLatLng([point.latitude,point.longitude]);
  },[generation,point,picking]);

  useEffect(()=>{
    if(!generation||!selected||!map.current)return;
    const c=data.current.find(c=>c.id===selected);
    if(c)map.current.setView([c.latitude,c.longitude],Math.max(map.current.getZoom(),7),{animate:false});
  },[generation,selected]);

  useEffect(()=>{
    if(!generation||!mapAction.seq||!map.current)return;
    const m=map.current;
    if(mapAction.type==='all'){if(data.current.length)m.fitBounds(data.current.map(c=>[c.latitude,c.longitude]),{padding:[55,55],maxZoom:12,animate:false});else m.setView([35,15],3);}
    if(mapAction.type==='center')pickAt.current(m.getCenter());
    if(mapAction.type==='locate'&&mapAction.point)m.setView([mapAction.point.latitude,mapAction.point.longitude],14);
  },[generation,mapAction]);
  return <div className="map-canvas" ref={host} role="region" aria-label="Världskarta med familjens ljus. Ljusen finns också i listan." />;
}
