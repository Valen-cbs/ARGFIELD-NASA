import { GoogleIcon } from './GoogleIcon';
import { useEffect, useState } from 'react';
import type { EngineResult } from '../engine/engineTypes';
import { ENGINE_VERSION } from '../engine/engineTypes';
const pending=new Map<string,Promise<any>>();
function request(context:string,refresh=false){
 if(!pending.has(context))pending.set(context,fetch('/api/analysis',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({context,refresh})}).then(async r=>{if(!r.ok)throw Error();return r.json();}).finally(()=>pending.delete(context)));
 return pending.get(context)!;
}
export function IntelligentAnalysis({result}:{result:EngineResult}){
 const management=(result.managementRecommendations??[]).map(item=>({crop:item.crop,system:item.system,priority:item.actions[0]?.detail}));
 const context=JSON.stringify({version:ENGINE_VERSION,priority:result.input.priorities,comparison:result.diagnostics.comparison,alternatives:result.alternatives.slice(0,2).map(a=>({id:a.id,label:a.label,score:a.score,completeness:a.completeness,justification:a.justification,warnings:a.warnings})),management,baseline:result.baseline?{label:result.baseline.label,score:result.baseline.score,horizon:result.baseline.horizonCampaigns}:null,missing:result.diagnostics.missingInputs,warnings:result.warnings,observations:result.provenance.satellite.filter(s=>s.used).map(s=>({id:s.productId,date:s.observedAt,reason:s.reason}))});
 const [state,setState]=useState<{context:string;data?:any;error?:boolean}>({context:''});
 const [refresh,setRefresh]=useState(0);
 useEffect(()=>{let active=true;request(context,refresh>0).then(data=>{if(active)setState({context,data});}).catch(()=>{if(active)setState({context,error:true});});return()=>{active=false;};},[context,refresh]);
 const current=state.context===context?state:null;
 return <section className="w-full min-w-0 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-indigo-50 to-white dark:from-indigo-950/40 dark:to-zinc-900 p-6 sm:p-8 shadow-sm"><div className="flex items-start gap-3"><GoogleIcon name="auto_awesome" className="text-indigo-600 dark:text-indigo-300"/><div><p className="text-xs font-bold uppercase tracking-widest text-indigo-700 dark:text-indigo-300">Análisis inteligente</p></div></div><p className="mt-5 w-full text-justify text-sm leading-relaxed" role="status">{current?.data?.resumen??(current?.error?'Análisis automático no disponible. '+(result.alternatives[0]?.justification[0]??result.managementRecommendations?.[0]?.actions[0]?.detail??'Revisá la evaluación del motor.'):'Preparando una explicación breve…')}</p><p className="mt-2 w-full text-justify text-xs text-slate-500">{current?.data?'Interpretación con IA. Conservá como referencia las advertencias del motor.':'La evaluación y sus advertencias están disponibles arriba.'}</p>{current?.data && (current.data.stale||Date.now()>current.data.expiresAt) && <button className="mt-3 text-sm underline" onClick={()=>setRefresh(v=>v+1)}>Actualizar explicación vencida</button>}</section>;
}
