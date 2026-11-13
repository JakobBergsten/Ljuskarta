import {createRoot} from 'react-dom/client';
import {useEffect,useState} from 'react';
import CandleApp from './CandleApp';
import CodeGate from './CodeGate';
import {watchAuth} from './firebase';
import './globals.css';
function App(){const [ready,setReady]=useState<boolean|null>(null);useEffect(()=>watchAuth(setReady),[]);return ready===null?<main className="gate-main"><p role="status">Öppnar Ljusspår…</p></main>:ready?<CandleApp defaultName=""/>:<CodeGate/>}
createRoot(document.getElementById('root')!).render(<App/>);
