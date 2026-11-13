'use client';
import {login as firebaseLogin,configured,configurationError} from './firebase';
import {asset,base} from './assets';
import {useState} from 'react';
import {Flame,LockKeyhole,ArrowRight,LoaderCircle} from 'lucide-react';

export default function CodeGate(){
  const [code,setCode]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function login(event:React.FormEvent){
    event.preventDefault();if(busy)return;setBusy(true);setError('');
    try{
      await firebaseLogin(code);
    }catch(e){const kind=(e as {code?:string}).code;setError(!configured?configurationError:kind==='auth/too-many-requests'?'För många försök. Vänta en stund och försök igen.':kind==='auth/network-request-failed'?'Kontrollera uppkopplingen och försök igen.':'Fel familjekod. Försök igen.');setBusy(false)}
  }
  return <div className="gate-page"><header className="app-header"><a className="wordmark" href={base}><span className="brand-mark"><Flame size={23}/></span><span>Ljusspår<span className="wordmark-dot">.</span></span></a><span className="gate-private"><LockKeyhole size={14}/> Familjens egen plats</span></header><main className="gate-main"><section className="gate-card" aria-labelledby="gate-title"><picture className="animated-candle"><source media="(prefers-reduced-motion: reduce)" srcSet={asset("candle-still.png")}/><img src={asset("candle-burning.gif")} alt="Ett brinnande ljus" width="144" height="220" draggable={false}/></picture><p className="eyebrow">Välkommen till familjens minneskarta</p><h1 id="gate-title">En plats för våra ljus.<br/><em>Och dem vi minns.</em></h1><p className="intro">Skriv in familjekoden för att öppna kartan.</p><form onSubmit={login}><label className="field">Familjekod<input type="password" name="family-code" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value)} maxLength={128} required autoFocus disabled={busy}/></label>{error&&<p className="error-message" role="alert">{error}</p>}<button className="button primary full" disabled={busy}>{busy?<LoaderCircle size={18} className="spin"/>:<ArrowRight size={18}/>} {busy?'Öppnar…':'Öppna familjens karta'}</button></form><p className="form-footnote"><LockKeyhole size={12}/> Inget konto behövs. Bara familjens kod.</p></section></main></div>;
}
