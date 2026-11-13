'use client';
import {useState,useEffect,useCallback,useRef,useMemo} from 'react';
import {Flame,Plus,MapPin,Globe2,LocateFixed,ArrowLeft,ArrowRight,Search,Users,LockKeyhole,X,Check,Copy,PenLine,Trash2,RefreshCw,CalendarDays,Heart,Download,LoaderCircle,Crosshair} from 'lucide-react';
import MapCanvas from './MapCanvas';
import {listCandles,watchCandles,saveCandle,deleteCandle,logout} from './firebase';
import {asset,base} from './assets';
import type {Candle,CandleDraft,Point} from './types';

const dateLabel=(date:string)=>new Intl.DateTimeFormat('sv-SE',{day:'numeric',month:'long',year:'numeric'}).format(new Date(date+'T12:00:00'));
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10)};
const fresh=(name:string):CandleDraft=>({person:'',place:'',date:today(),message:'',authorName:name,latitude:0,longitude:0});
const icon=(Icon:any)=> <Icon size={18} strokeWidth={1.7} aria-hidden="true"/>;

export default function CandleApp({defaultName}:{defaultName:string}) {
  const [candles,setCandles]=useState<Candle[]>([]),[loading,setLoading]=useState(true),[loadError,setLoadError]=useState('');
  const [selected,setSelected]=useState<string|null>(null),[query,setQuery]=useState(''),[form,setForm]=useState<CandleDraft|null>(null),[editId,setEditId]=useState<string|null>(null);
  const [point,setPoint]=useState<Point|null>(null),[saving,setSaving]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [mapReady,setMapReady]=useState(false),[mapError,setMapError]=useState(''),[locating,setLocating]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
  const [mapAction,setMapAction]=useState<{type:'all'|'center'|'locate';seq:number;point?:Point}>({type:'all',seq:0});
  const [copied,setCopied]=useState(false),[mapVersion,setMapVersion]=useState(0);
  const dialog=useRef<HTMLDialogElement>(null),formPanel=useRef<HTMLElement>(null),mapPanel=useRef<HTMLElement>(null),nameInput=useRef<HTMLInputElement>(null);
  const requestSeq=useRef(0),dirty=useRef(false);
  const current=candles.find(c=>c.id===selected);
  const visible=useMemo(()=>candles.filter(c=>[c.person,c.place,c.message,c.authorName].join(' ').toLocaleLowerCase('sv').includes(query.toLocaleLowerCase('sv'))),[candles,query]);
  const people=new Set(candles.map(c=>c.person.trim().toLocaleLowerCase('sv'))).size;

  const load=useCallback(async()=>{
    const seq=++requestSeq.current;
    try {
      const items=await listCandles();
      if(seq===requestSeq.current){setCandles(items);setLoadError('');}
      return true;
    } catch(e) {if(seq===requestSeq.current)setLoadError(e instanceof Error&&(e.name==='TimeoutError'||e.name==='AbortError')?'Det tog för lång tid att hämta ljusen. Kontrollera uppkopplingen och försök igen.':e instanceof Error?e.message:'Ljusen kunde inte hämtas.');return false;}
    finally{if(seq===requestSeq.current)setLoading(false);}
  },[]);
  useEffect(()=>watchCandles(items=>{setCandles(items);setLoadError('');setLoading(false)},message=>{setLoadError(message);setLoading(false)}),[]);
  useEffect(()=>{if(!form)return;const warn=(e:BeforeUnloadEvent)=>{if(dirty.current){e.preventDefault();e.returnValue=''}};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[!!form]);
  useEffect(()=>{if(!selected)setConfirmDelete(false)},[selected]);

  function start(candle?:Candle){
    setSelected(null);setEditId(candle?.id||null);setForm(candle?{person:candle.person,place:candle.place,date:candle.date,message:candle.message,authorName:candle.authorName,latitude:candle.latitude,longitude:candle.longitude}:fresh(defaultName));
    setPoint(candle?{latitude:candle.latitude,longitude:candle.longitude}:null);setError('');setNotice('');dirty.current=false;
    setTimeout(()=>{formPanel.current?.scrollIntoView({behavior:'smooth',block:'nearest'});nameInput.current?.focus({preventScroll:true})},0);
  }
  function cancel(){if(dirty.current&&!window.confirm('Stäng anteckningen utan att spara?'))return;setForm(null);setPoint(null);setEditId(null);setError('');dirty.current=false;}
  function pick(p:Point){setPoint(p);setError('');dirty.current=true;setForm(old=>old?{...old,...p}:old);if(matchMedia('(max-width: 760px)').matches)setTimeout(()=>formPanel.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);}
  function change(key:keyof CandleDraft,value:string){dirty.current=true;setForm(old=>old?{...old,[key]:value}:old);}
  function select(id:string){if(form)return;setSelected(id);setConfirmDelete(false);setNotice('');if(matchMedia('(max-width: 760px)').matches)setTimeout(()=>formPanel.current?.scrollIntoView({behavior:'smooth',block:'start'}),100);}
  function action(type:'all'|'center'|'locate',p?:Point){setMapAction(old=>({type,seq:old.seq+1,point:p}));}
  function locate(){
    if(!navigator.geolocation){setMapError('Din webbläsare kan inte hitta din plats. Välj den på kartan i stället.');return;}
    setLocating(true);setMapError('');navigator.geolocation.getCurrentPosition(position=>{const p={latitude:position.coords.latitude,longitude:position.coords.longitude};action('locate',p);if(form)pick(p);setLocating(false)},()=>{setMapError('Din plats kunde inte hämtas. Du kan fortfarande välja en plats på kartan.');setLocating(false)},{enableHighAccuracy:false,timeout:12000,maximumAge:60000});
  }
  async function save(e:React.FormEvent){
    e.preventDefault();if(!form||saving)return;
    if(!point){setError('Välj först platsen där ljuset tändes på kartan.');return;}
    setSaving(true);setError('');
    try {
      const id=await saveCandle({...form,...point},editId||undefined);
      dirty.current=false;setForm(null);setPoint(null);setEditId(null);setQuery('');setSelected(id);setNotice(editId?'Anteckningen är uppdaterad.':'Ditt ljus är sparat på familjens karta.');await load();
    } catch(e){setError(e instanceof Error?e.message:'Ljuset kunde inte sparas. Försök igen.');}
    finally{setSaving(false);}
  }
  async function remove(){
    if(!current||saving)return;setSaving(true);setError('');
    try{await deleteCandle(current.id);setSelected(null);setConfirmDelete(false);setNotice('Ljuset är borttaget.');await load();}catch(e){setError(e instanceof Error?e.message:'Ljuset kunde inte tas bort.');}finally{setSaving(false);}
  }
  async function share(){setCopied(false);dialog.current?.showModal();}
  async function copy(){try{await navigator.clipboard.writeText(new URL(base,location.href).href);setCopied(true)}catch{setCopied(false);}}
  function exportCandles(){const file=new Blob([JSON.stringify({app:'Ljusspår',exportedAt:new Date().toISOString(),candles:candles.map(({canEdit,...c})=>c)},null,2)],{type:'application/json'});const url=URL.createObjectURL(file);const link=document.createElement('a');link.href=url;link.download='ljusspar-'+today()+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}

  return <div className="app-shell">
    <a className="skip-link" href="#memories">Till familjens ljus</a>
    <header className="app-header"><a className="wordmark" href={base} aria-label="Ljusspår, startsida"><span className="brand-mark">{icon(Flame)}</span><span>Ljusspår<span className="wordmark-dot">.</span></span></a><span className="header-caption">Små ljus. Stora minnen.</span><button className="button soft share-button" onClick={share}>{icon(Users)}<span>Familjens karta</span>{icon(LockKeyhole)}</button></header>
    <main className="workspace">
      <section className="map-panel" ref={mapPanel} aria-label="Kartan">
        <MapCanvas key={mapVersion} candles={visible} selected={selected} picking={!!form&&!saving} point={point} onPick={pick} onSelect={select} mapAction={mapAction} onReady={()=>{setMapReady(true);setMapError('')}} onError={setMapError}/>
        <div className="map-topbar"><span className="map-badge">{icon(LockKeyhole)} Bara för familjen</span><div className="map-tools"><button className="map-tool" onClick={()=>action('all')} disabled={!mapReady}>{icon(Globe2)} Visa alla ljus</button><button className="map-tool reset-map" aria-label="Återställ karta" title="Återställ karta" onClick={()=>{setMapReady(false);setMapError('');setMapAction(old=>point?{type:'locate',seq:old.seq+1,point}:{type:'all',seq:old.seq+1});setMapVersion(v=>v+1)}}>{icon(RefreshCw)}</button></div></div>
        {!mapReady&&!mapError&&<div className="map-loading"><LoaderCircle className="spin" size={24}/>Öppnar världskartan…</div>}
        {form?<div className="placement-hint"><span className="placement-dot"/><div><strong>{point?'Platsen är vald':'Var tände du ljuset?'}</strong><span>{point?'Tryck på en annan plats för att flytta ljuset.':'Zooma in och tryck på kartan för att välja plats.'}</span></div></div>:!loading&&!loadError&&candles.length===0&&<div className="map-welcome"><picture className="animated-candle"><source media="(prefers-reduced-motion: reduce)" srcSet={asset("candle-still.png")}/><img src={asset("candle-burning.gif")} alt="Ett brinnande ljus" width="144" height="220" draggable={false}/></picture><p>Ett ljus kan lämna ett spår<br/>var som helst i världen.</p><button className="button primary" onClick={()=>start()}>{icon(Plus)} Sätt ut det första ljuset</button></div>}
        {form&&<div className="map-crosshair" aria-hidden="true">+</div>}
        <div className="map-location"><button className="map-tool" onClick={locate} disabled={locating||!mapReady}>{icon(locating?LoaderCircle:LocateFixed)}{locating?'Hittar din plats…':'Min plats'}</button>{form&&<button className="map-tool" onClick={()=>action('center')} disabled={!mapReady}>{icon(Crosshair)} Välj kartans mittpunkt</button>}</div>
        {mapError&&<div className="map-warning" role="status">{mapError}<button className="icon-button" onClick={()=>setMapError('')} aria-label="Stäng kartmeddelandet">{icon(X)}</button></div>}
      </section>
      <aside className="memory-panel" id="memories" ref={formPanel}>
        {form?<section className="editor" aria-labelledby="editor-title"><button className="text-button back" onClick={cancel} disabled={saving}>{icon(ArrowLeft)} Tillbaka till ljusen</button><p className="eyebrow">Ett minne på kartan</p><h1 id="editor-title">{editId?'Ditt ljus':'Sätt ut ett ljus'}</h1><p className="intro">En plats, en tanke, en person du bär med dig.</p>
          <form onSubmit={save}>
            <label className="field">För vem tände du ljuset?<input ref={nameInput} autoComplete="off" placeholder="Namn eller till exempel farmor" value={form.person} onChange={e=>change('person',e.target.value)} maxLength={100} required disabled={saving}/></label>
            <div className={'chosen-place'+(point?' has-point':'')}><MapPin size={20}/><div><strong>{point?'Plats vald på kartan':'Välj platsen på kartan'}</strong><span>{point?`${point.latitude.toFixed(4)}, ${point.longitude.toFixed(4)}`:'Zooma, tryck eller använd Min plats.'}</span></div><button type="button" className="text-button" disabled={saving} onClick={()=>{if(point)action('locate',point);mapPanel.current?.scrollIntoView({behavior:'smooth',block:'start'})}}>Visa</button></div>
            <label className="field">Vad heter platsen?<input placeholder="Till exempel en kyrka, stad eller plats" value={form.place} onChange={e=>change('place',e.target.value)} maxLength={160} required disabled={saving}/></label>
            <div className="field-pair"><label className="field">När tändes ljuset?<input type="date" value={form.date} onChange={e=>change('date',e.target.value)} required disabled={saving}/></label><label className="field">Tänt av<input placeholder="Ditt namn" autoComplete="given-name" value={form.authorName} onChange={e=>change('authorName',e.target.value)} maxLength={80} required disabled={saving}/></label></div>
            <label className="field">Några ord <span className="optional">valfritt</span><textarea placeholder="Vad tänkte du på just där?" rows={4} value={form.message} onChange={e=>change('message',e.target.value)} maxLength={2000} disabled={saving}/></label>
            <details className="coordinates"><summary>Ange koordinater manuellt</summary><div className="field-pair"><label className="field">Latitud<input type="number" step="any" min="-90" max="90" defaultValue={point?.latitude??''} key={'lat'+(point?.latitude??'')} onBlur={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=-90&&n<=90)pick({latitude:n,longitude:point?.longitude??0})}} disabled={saving}/></label><label className="field">Longitud<input type="number" step="any" min="-180" max="180" defaultValue={point?.longitude??''} key={'lng'+(point?.longitude??'')} onBlur={e=>{const n=e.target.valueAsNumber;if(Number.isFinite(n)&&n>=-180&&n<=180)pick({latitude:point?.latitude??0,longitude:n})}} disabled={saving}/></label></div></details>
            {error&&<p className="error-message" role="alert">{error}</p>}
            <button type="submit" className="button primary full" disabled={saving}>{icon(saving?LoaderCircle:editId?Check:Flame)} {saving?'Sparar…':editId?'Spara ändringarna':'Spara ljuset på kartan'}</button><p className="form-footnote">{icon(LockKeyhole)} Delas med dem som har familjekoden.</p>
          </form>
        </section>:current?<section className="memory-detail"><button className="text-button back" onClick={()=>{setSelected(null);setError('')}}>{icon(ArrowLeft)} Alla ljus</button><div className="detail-flame"><picture className="animated-candle"><source media="(prefers-reduced-motion: reduce)" srcSet={asset("candle-still.png")}/><img src={asset("candle-burning.gif")} alt="Ett brinnande ljus" width="144" height="220" draggable={false}/></picture></div><p className="eyebrow">Ett ljus för</p><h1>{current.person}</h1><p className="detail-place">{icon(MapPin)}{current.place}</p><p className="detail-date">{icon(CalendarDays)}{dateLabel(current.date)}</p>{current.message?<blockquote>{current.message}</blockquote>:<p className="quiet-thought">Ett litet ljus. En tanke som finns kvar.</p>}<p className="author-line">{icon(Heart)} Tänt av {current.authorName}</p>{notice&&<p className="success-message" role="status">{notice}</p>}
          {current.canEdit&&<div className="detail-actions"><button className="button soft" onClick={()=>start(current)}>{icon(PenLine)} Ändra</button><button className="text-button danger" onClick={()=>setConfirmDelete(true)}>{icon(Trash2)} Ta bort</button></div>}
          {confirmDelete&&<div className="delete-confirm"><p>Ta bort det här ljuset från familjens karta?</p><div className="button-row"><button className="button destructive" onClick={remove} disabled={saving}>{saving?'Tar bort…':'Ja, ta bort'}</button><button className="button soft" onClick={()=>setConfirmDelete(false)} disabled={saving}>Behåll ljuset</button></div></div>}{error&&<p className="error-message" role="alert">{error}</p>}
          <button className="button primary full new-from-detail" onClick={()=>start()}>{icon(Plus)} Sätt ut ett till ljus</button>
        </section>:<section className="memories-list"><p className="eyebrow">Familjens minneskarta</p><h1>Ljuset finns kvar.<br/><em>Och minnet med det.</em></h1><p className="intro">Samla platserna där ni tänt ett ljus för någon ni saknar. Nära hemmet eller långt härifrån.</p><button className="button primary full add-candle" onClick={()=>start()} disabled={loading||!!loadError}>{icon(Plus)} Sätt ut ett ljus</button>
          <div className="list-heading"><h2>Våra ljus <span>{candles.length}</span></h2><button className="icon-button" aria-label="Uppdatera ljusen" onClick={()=>load()} disabled={loading}>{icon(RefreshCw)}</button></div>
          {candles.length>0&&<p className="list-help">Öppna ett ljus för att ändra eller ta bort det.</p>}{candles.length>0&&<label className="search-field"><Search size={17}/><span className="sr-only">Sök bland ljusen</span><input type="search" placeholder="Sök person eller plats" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
          {loading?<p className="list-placeholder" role="status">Hämtar familjens ljus…</p>:loadError?<div className="error-message" role="alert"><p>{loadError}</p><button className="text-button" onClick={()=>{setLoading(true);load()}}>Försök igen {icon(ArrowRight)}</button></div>:!candles.length?<div className="empty-list"><Flame size={26} strokeWidth={1.2}/><h3>Här får era minnen en plats.</h3><p>Sätt ut det första ljuset på kartan.<br/>Det behöver inte vara från idag.</p></div>:!visible.length?<div className="empty-list"><p>Inga ljus matchar din sökning.</p><button className="text-button" onClick={()=>setQuery('')}>Visa alla ljus</button></div>:<ul className="candle-list">{visible.map(c=><li key={c.id}><button className="candle-item" onClick={()=>select(c.id)}><span className="list-flame">{icon(Flame)}</span><span className="candle-summary"><strong>För {c.person}</strong><span>{c.place}</span><time dateTime={c.date}>{dateLabel(c.date)}</time></span><ArrowRight size={17} className="item-arrow"/></button></li>)}</ul>}
          {notice&&<p className="success-message" role="status">{notice}</p>}
          {candles.length>0&&<div className="list-footer"><span>{candles.length} {candles.length===1?'ljus':'ljus'} · {people} {people===1?'person':'personer'} vi minns</span><button className="icon-button" onClick={exportCandles} aria-label="Ladda ned familjens ljus som JSON">{icon(Download)}</button></div>}
          <div className="family-note">{icon(Users)}<div><strong>En karta ni delar.</strong><p>Nya ljus blir synliga för familjen på både mobilen och datorn.</p></div></div>
        </section>}
        <footer className="panel-footer"><span>{icon(Flame)} Med omtanke, överallt.</span><button className="logout-button" type="button" onClick={()=>logout()}>Logga ut</button></footer>
      </aside>
    </main>
    <dialog ref={dialog} className="family-dialog" aria-labelledby="family-title"><button className="icon-button close-dialog" onClick={()=>dialog.current?.close()} aria-label="Stäng">{icon(X)}</button><span className="dialog-icon">{icon(Users)}</span><p className="eyebrow">Privat och gemensam</p><h2 id="family-title">Familjens egen plats.</h2><p>Alla som har familjekoden kan öppna samma karta, sätta ut ljus och redigera eller ta bort enstaka ljus. Inget konto behövs.</p><p>Dela länken och familjekoden med dem som ska ha tillgång. Länken ensam räcker inte för att öppna kartan.</p><button className="button primary full" onClick={copy}>{icon(copied?Check:Copy)}{copied?'Länken är kopierad':'Kopiera länken till kartan'}</button><p className="form-footnote">{icon(LockKeyhole)} Ljusen skyddas av familjekoden.</p></dialog>
  </div>;
}
