import assert from 'node:assert/strict';
import { test } from 'node:test';
import { currentForecast, forecastTotal, parseFieldForecast } from '../src/services/fieldForecast';
import { forecastHazardAlerts } from '../src/services/weatherAlerts';
import { buildExportReport } from '../src/services/exportReport';
import type { FarmProfile } from '../src/types';
import type { RotationEngineState } from '../src/services/rotationEngineAdapter';

const now = new Date('2026-11-15T15:00:00Z');
const farm: FarmProfile = { location: {name:'Lote',lat:-27,lng:-59,province:'Chaco',region:'norte',basinId:'x',basinName:'x',mainRiver:'x'},fieldSizeHectares:100,currentCrop:'maize',soilType:'mollisol_deep',irrigation:'dryland',priority:'conserve_moisture'};
const dates = Array.from({length:7},(_,i)=>`2026-11-${15+i}`);
const payload = () => ({current:{time:'2026-11-15T12:00'},daily:{time:[...dates],temperature_2m_max:[35,35,35,20,20,20,20] as Array<number|null>,temperature_2m_min:Array(7).fill(10),precipitation_sum:[0,0,0,0,0,0,0] as Array<number|null>,et0_fao_evapotranspiration:Array(7).fill(5)}});

test('forecast nulls keep original date alignment and zero rainfall is valid',()=>{
 const p=payload();p.daily.temperature_2m_max[1]=null;
 const f=parseFieldForecast(p)!;
 assert.equal(f.days[1].tmax,null); assert.equal(f.days[2].tmax,35);
 assert.equal(forecastTotal(f,'rain'),0); assert.equal(forecastTotal(f,'et0'),35);
});
test('invalid dates, duplicates and out-of-order dates are rejected',()=>{
 for(const date of ['2026-02-30',dates[0],'2026-11-14']) {const p=payload();p.daily.time[1]=date; assert.equal(parseFieldForecast(p),null);}
});
test('partial weeks, gaps and missing values cannot become seven-day totals',()=>{
 const p=payload();p.daily.time=p.daily.time.slice(0,3);assert.equal(forecastTotal(parseFieldForecast(p),'rain'),null);
 const q=payload();q.daily.precipitation_sum[2]=null;assert.equal(forecastTotal(parseFieldForecast(q),'rain'),null);
 const r=payload();r.daily.time[3]='2026-11-18';r.daily.time[4]='2026-11-20';r.daily.time[5]='2026-11-21';r.daily.time[6]='2026-11-22';assert.equal(forecastTotal(parseFieldForecast(r),'rain'),null);
});
test('rain alerts work without temperatures and heat alerts without rainfall',()=>{
 const p=payload();p.daily.temperature_2m_max.fill(null);p.daily.precipitation_sum[2]=50;
 assert.deepEqual(forecastHazardAlerts(p,farm,now).map(a=>a.type),['excess_precipitation']);
 const q=payload();q.daily.precipitation_sum.fill(null);
 assert.deepEqual(forecastHazardAlerts(q,farm,now).map(a=>a.type),['temperature_anomaly']);
});
test('heat requires consecutive calendar dates and known temperatures',()=>{
 const p=payload();p.daily.time=['2026-11-15','2026-11-17','2026-11-19'];assert.equal(forecastHazardAlerts(p,farm,now).length,0);
 const q=payload();q.daily.temperature_2m_max[1]=null;assert.equal(forecastHazardAlerts(q,farm,now).length,0);
 assert.equal(forecastHazardAlerts(payload(),farm,now)[0].currentValue,35);
});
test('past or future provider clocks cannot label a payload as current',()=>{
 for(const year of ['2020','2030']) {const p=payload();p.current.time=p.current.time.replace('2026',year);assert.equal(currentForecast(parseFieldForecast(p),now),null);assert.equal(forecastHazardAlerts(p,farm,now).length,0);}
});
test('weekly rainfall threshold needs full week; negative and nonfinite values are missing',()=>{
 const p=payload();p.daily.precipitation_sum=[40,40,40];p.daily.time=p.daily.time.slice(0,3);p.daily.temperature_2m_max.fill(20);
 assert.equal(forecastHazardAlerts(p,farm,now).length,0);
 const q=payload();q.daily.precipitation_sum=[-1,NaN,Infinity,0,0,0,0];assert.equal(forecastTotal(parseFieldForecast(q),'rain'),null);
 const r=payload();r.daily.temperature_2m_max.fill(20);r.daily.precipitation_sum=[20,20,20,20,20,0,0];assert.match(forecastHazardAlerts(r,farm,now)[0].relevanceReason,/100.0/);
});
test('export preserves model nulls, baseline and provenance rather than describing them as demo',()=>{
 const evaluation={baseline:{score:null},provenance:{satellite:[{productId:'smap',used:false}]}};
 const state={status:'ready',engine:evaluation,error:null} as unknown as RotationEngineState;
 const report=buildExportReport(farm,[],[],[],state,now);
 assert.equal(report.rotationStrategiesMode,'model');assert.equal(report.rotationEvaluation?.baseline?.score,null);assert.equal(report.rotationEvaluation,state.engine);
 assert.equal(buildExportReport(farm,[],[],[]).rotationStrategiesMode,'qualitative');
});
