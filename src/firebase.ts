import {initializeApp} from 'firebase/app';
import {getAuth,signInWithEmailAndPassword,signOut,onAuthStateChanged} from 'firebase/auth';
import {getDatabase,ref,child,get,onValue,runTransaction} from 'firebase/database';
import {validateCandle} from '../lib/candle-validation.mjs';
import type {Candle,CandleDraft} from './types';
import {firebaseConfig as defaults} from './firebase-config';

const env={
  VITE_FIREBASE_API_KEY:import.meta.env.VITE_FIREBASE_API_KEY||defaults.apiKey,
  VITE_FIREBASE_AUTH_DOMAIN:import.meta.env.VITE_FIREBASE_AUTH_DOMAIN||defaults.authDomain,
  VITE_FIREBASE_DATABASE_URL:import.meta.env.VITE_FIREBASE_DATABASE_URL||defaults.databaseURL,
  VITE_FIREBASE_PROJECT_ID:import.meta.env.VITE_FIREBASE_PROJECT_ID||defaults.projectId,
  VITE_FAMILY_EMAIL:import.meta.env.VITE_FAMILY_EMAIL||defaults.familyEmail,
  VITE_FAMILY_UID:import.meta.env.VITE_FAMILY_UID||defaults.familyUid,
};
export const configured=!!(env.VITE_FIREBASE_API_KEY&&env.VITE_FIREBASE_AUTH_DOMAIN&&env.VITE_FIREBASE_DATABASE_URL&&env.VITE_FIREBASE_PROJECT_ID&&env.VITE_FAMILY_EMAIL&&env.VITE_FAMILY_UID);
const app=configured?initializeApp({apiKey:env.VITE_FIREBASE_API_KEY,authDomain:env.VITE_FIREBASE_AUTH_DOMAIN,databaseURL:env.VITE_FIREBASE_DATABASE_URL,projectId:env.VITE_FIREBASE_PROJECT_ID}):null;
const auth=app?getAuth(app):null,db=app?getDatabase(app):null;
const familyUid=env.VITE_FAMILY_UID;
export const configurationError='Kartan är inte färdigansluten ännu. Firebase-inställningarna behöver läggas till av sidans ägare.';
export function login(code:string){if(!auth)throw Error(configurationError);return signInWithEmailAndPassword(auth,env.VITE_FAMILY_EMAIL,code).then(async result=>{if(result.user.uid!==familyUid){await signOut(auth);throw Error('Fel familjekod.');}})}
export function logout(){return auth?signOut(auth):Promise.resolve()}
export function watchAuth(callback:(ready:boolean)=>void){if(!auth){callback(false);return()=>{}}return onAuthStateChanged(auth,user=>callback(user?.uid===familyUid))}
function root(){if(!db||auth?.currentUser?.uid!==familyUid)throw Error('Logga in med familjekoden igen.');return ref(db,'families/'+familyUid+'/candles')}
function decode(value:Record<string,any>|null):Candle[]{return Object.entries(value||{}).map(([id,c])=>({...c,id,message:c.message||'',canEdit:true})).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt.localeCompare(a.createdAt))}
export async function listCandles(){return decode((await get(root())).val())}
export function watchCandles(next:(items:Candle[])=>void,error:(message:string)=>void){return onValue(root(),snapshot=>next(decode(snapshot.val())),()=>error('Ljusen kunde inte hämtas. Kontrollera uppkopplingen och försök igen.'))}
export async function saveCandle(draft:CandleDraft,id?:string){
  const fields=validateCandle(draft),key=id||crypto.randomUUID(),now=new Date().toISOString();
  const item=child(root(),key);
  await new Promise<void>((resolve,reject)=>onValue(item,()=>resolve(),reject,{onlyOnce:true}));
  // A transaction preserves creation metadata and never recreates a deleted candle during an edit.
  const result=await runTransaction(item,old=>{
    if(id&&!old)return;
    if(!id&&old)return;
    return {...fields,id:key,authorId:old?.authorId||familyUid,createdAt:old?.createdAt||now,updatedAt:now};
  },{applyLocally:false});
  if(!result.committed)throw Error(id?'Ljuset finns inte längre. Uppdatera listan.':'Ljuset kunde inte sparas. Försök igen.');
  return key;
}
export async function deleteCandle(id:string){
  const item=ref(db!,'families/'+familyUid+'/candles/'+id);root();
  await runTransaction(item,()=>null,{applyLocally:false});
}
