import { useEffect, useMemo, useState } from 'react'
import Sidebar from '../components/Sidebar'
import { API_URL, apiFetch } from '../config/api'

const PERIODS = ['Today', '7 Days', '30 Days', '90 Days', 'All Time']
const money = value => '₱' + (Number(value) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const quantity = item => Number(item.quantity) || 0
const dateKey = value => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-')
}
const inPeriod = (value, period) => {
  if (period === 'All Time') return true
  const date = new Date(value)
  if (!value || Number.isNaN(date.getTime())) return false
  const today = new Date(), start = new Date(today)
  start.setHours(0,0,0,0)
  start.setDate(start.getDate() - (period === 'Today' ? 0 : period === '7 Days' ? 6 : period === '30 Days' ? 29 : 89))
  return date >= start && date <= today
}

export default function Reports() {
  const [sales,setSales] = useState([]), [stockIns,setStockIns] = useState([]), [damaged,setDamaged] = useState([])
  const [period,setPeriod] = useState(() => window.localStorage.getItem('hardware-reports-period') || '7 Days')
  const [loading,setLoading] = useState(true), [error,setError] = useState(''), [selectedDate,setSelectedDate] = useState('')
  useEffect(() => { window.localStorage.setItem('hardware-reports-period',period) },[period])
  useEffect(() => {
    let active=true
    async function load(){
      setLoading(true);setError('')
      try{
        const paths=['/api/sales','/api/stock-in','/api/damaged']
        const responses=await Promise.all(paths.map(path=>apiFetch(API_URL(path))))
        const failed=responses.find(response=>!response.ok)
        if(failed) throw new Error(`Unable to load reports (HTTP ${failed.status}).`)
        const values=await Promise.all(responses.map(response=>response.json()))
        if(!active)return
        setSales(Array.isArray(values[0])?values[0]:[])
        setStockIns(Array.isArray(values[1])?values[1]:[])
        setDamaged(Array.isArray(values[2])?values[2]:[])
      }catch(err){if(active)setError(err.message||'Unable to load reports.')}
      finally{if(active)setLoading(false)}
    }
    load();return()=>{active=false}
  },[])
  const filteredSales=useMemo(()=>sales.filter(x=>inPeriod(x.date,period)),[sales,period])
  const filteredStockIns=useMemo(()=>stockIns.filter(x=>inPeriod(x.date,period)),[stockIns,period])
  const filteredDamaged=useMemo(()=>damaged.filter(x=>inPeriod(x.date,period)),[damaged,period])
  const revenue=x=>Number(x.amount)||0, profit=x=>Number(x.profit)||0
  const totalRevenue=filteredSales.reduce((s,x)=>s+revenue(x),0)
  const grossProfit=filteredSales.reduce((s,x)=>s+profit(x),0)
  const damageLoss=filteredDamaged.reduce((s,x)=>s+(Number(x.loss)||quantity(x)*(Number(x.unitCost)||0)),0)
  const netProfit=grossProfit-damageLoss
  const daily=useMemo(()=>{
    const groups=new Map()
    const add=(value,type,item)=>{
      const key=dateKey(value);if(!key)return
      const day=groups.get(key)||{date:key,revenue:0,profit:0,damageLoss:0,sales:[],damaged:[],stockIns:[]}
      if(type==='sale'){day.revenue+=revenue(item);day.profit+=profit(item);day.sales.push(item)}
      else if(type==='damage'){day.damageLoss+=Number(item.loss)||quantity(item)*(Number(item.unitCost)||0);day.damaged.push(item)}
      else day.stockIns.push(item)
      groups.set(key,day)
    }
    filteredSales.forEach(x=>add(x.date,'sale',x));filteredDamaged.forEach(x=>add(x.date,'damage',x));filteredStockIns.forEach(x=>add(x.date,'stock',x))
    return [...groups.values()].sort((a,b)=>a.date.localeCompare(b.date))
  },[filteredSales,filteredDamaged,filteredStockIns])
  const selected=daily.find(x=>x.date===selectedDate)
  const dateLabel=x=>new Date(x+'T00:00:00').toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'})
  return <div className="app-layout"><Sidebar active="/reports"/><main className="app-main min-vh-100"><div className="reports-page-content" id="mainContent">
    <div className="reports-page-header d-flex flex-wrap align-items-end justify-content-between gap-3 mb-4"><div><span className="analytics-kicker">HARDWARE TOOLS / ANALYTICS</span><h1 className="mb-1"><b>Reports</b></h1><p className="mb-0">Sales, profit, stock movement, and damaged-item losses.</p></div></div>
    {loading&&<div className="analytics-loading"><span className="spinner-border spinner-border-sm me-2"/>Loading reports…</div>}{error&&<div className="alert alert-danger">{error}</div>}
    {!loading&&!error&&<>
      <div className="row g-3 mb-4">
        <div className="col-12 col-sm-6 col-xl-3"><div className="analytics-metric-card"><p className="analytics-eyebrow">Revenue</p><div className="analytics-metric-value">{money(totalRevenue)}</div><small className="analytics-muted">Recorded sales income</small></div></div>
        <div className="col-12 col-sm-6 col-xl-3"><div className="analytics-metric-card"><p className="analytics-eyebrow">Gross profit</p><div className="analytics-metric-value">{money(grossProfit)}</div><small className="analytics-muted">Sales profit before damage loss</small></div></div>
        <div className="col-12 col-sm-6 col-xl-3"><div className="analytics-metric-card"><p className="analytics-eyebrow">Damage loss</p><div className="analytics-metric-value">{money(damageLoss)}</div><small className="analytics-muted">Purchase cost of damaged units</small></div></div>
        <div className="col-12 col-sm-6 col-xl-3"><div className="analytics-metric-card"><p className="analytics-eyebrow">Net profit</p><div className="analytics-metric-value">{money(netProfit)}</div><small className="analytics-muted">Gross profit less damage loss</small></div></div>
      </div>
      <div className="report-period-toolbar report-period-toolbar-top" role="group" aria-label="Earnings overview period">{PERIODS.map(option=><button key={option} type="button" className={`btn btn-sm ${period===option?'is-active':''}`} aria-pressed={period===option} onClick={()=>setPeriod(option)}>{option}</button>)}</div>
      <section className="analytics-panel report-earnings-panel mb-4"><div className="analytics-panel-heading flex-wrap"><div><h2>Daily Earnings Overview</h2><p>Select any date to inspect sales, damaged items, and profit</p></div><div className="d-flex flex-wrap gap-3 small"><span><i className="bi bi-square-fill me-1" style={{color:'#6c9ee8'}}/>Revenue</span><span><i className="bi bi-square-fill me-1" style={{color:'#20b779'}}/>Gross profit</span><span><i className="bi bi-square-fill me-1" style={{color:'#e0a43b'}}/>Damage loss</span></div></div>
      {daily.length?<div className="report-daily-chart report-daily-svg-chart"><svg key={period} viewBox={`0 0 ${Math.max(620,daily.length*74)} 230`} role="img" aria-label="Daily earnings bar chart" preserveAspectRatio="none"><g className="report-svg-grid">{[0,1,2,3,4].map(n=><line key={n} x1="42" x2={Math.max(600,daily.length*74-12)} y1={18+n*42} y2={18+n*42}/>)}</g>{daily.map((day,index)=>{const max=Math.max(1,...daily.map(x=>Math.max(x.revenue,x.profit,x.damageLoss)));const base=190,x=54+index*74;const bars=[{value:day.revenue,className:'report-bar-revenue',offset:0},{value:day.profit,className:'report-bar-profit',offset:17},{value:day.damageLoss,className:'report-bar-damage',offset:34}];return <g key={day.date} className={`report-svg-day ${selectedDate===day.date?'is-selected':''}`} role="button" tabIndex="0" onClick={()=>setSelectedDate(day.date)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setSelectedDate(day.date)}}}><title>{`${dateLabel(day.date)} · Revenue ${money(day.revenue)} · Profit ${money(day.profit)} · Damage ${money(day.damageLoss)}`}</title>{bars.map(bar=>{const height=bar.value?Math.max(3,bar.value/max*168):0;return <rect key={bar.className} x={x+bar.offset} y={base-height} width="11" height="0" rx="4" className={bar.className}><animate attributeName="height" from="0" to={height} dur=".7s" begin="0s" fill="freeze"/><animate attributeName="y" from={base} to={base-height} dur=".7s" begin="0s" fill="freeze"/></rect>})}<text x={x+17} y="213" textAnchor="middle">{new Date(day.date+'T00:00:00').toLocaleDateString('en-PH',{month:'short',day:'numeric'})}</text><rect x={x-5} y="12" width="58" height="205" fill="transparent"/></g>})}</svg></div>:<div className="analytics-empty">No records for this period yet.</div>}
      <div className="d-flex flex-wrap justify-content-between gap-2 mt-3 small"><span><b>Revenue:</b> {money(totalRevenue)}</span><span><b>Gross profit:</b> {money(grossProfit)}</span><span><b>Damage loss:</b> {money(damageLoss)}</span><span><b>Net profit:</b> {money(netProfit)}</span></div></section>
      <div className="row g-3 mb-4"><div className="col-12 col-md-6"><section className="analytics-panel h-100"><div className="analytics-panel-heading"><div><h2>Stock received</h2><p>Units in selected period</p></div></div><div className="analytics-metric-value">{filteredStockIns.reduce((s,x)=>s+quantity(x),0).toLocaleString()}</div></section></div><div className="col-12 col-md-6"><section className="analytics-panel h-100"><div className="analytics-panel-heading"><div><h2>Damaged units</h2><p>Removed from inventory</p></div></div><div className="analytics-metric-value">{filteredDamaged.reduce((s,x)=>s+quantity(x),0).toLocaleString()}</div></section></div></div>
      <section className="analytics-panel"><div className="analytics-panel-heading"><div><h2>Sales Report</h2><p>Individual recorded sales</p></div></div><div className="table-responsive"><table className="table analytics-table align-middle mb-0"><thead><tr><th>Date</th><th>Product</th><th>Units sold</th><th className="text-end">Revenue</th><th className="text-end">Profit</th></tr></thead><tbody>{filteredSales.length?filteredSales.map((x,i)=><tr key={x.id||i}><td>{x.date?new Date(x.date).toLocaleDateString('en-PH'):'—'}</td><td>{x.product}</td><td>{quantity(x)}</td><td className="text-end">{money(revenue(x))}</td><td className="text-end">{money(profit(x))}</td></tr>):<tr><td colSpan="5" className="text-center py-4">No sales records for this period.</td></tr>}</tbody></table></div></section>
    </>}
  </div></main>
  {selected&&<div className="hw-report-modal-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)setSelectedDate('')}}><section className="hw-report-modal" role="dialog" aria-modal="true" aria-labelledby="report-date-title"><header><div><span className="analytics-kicker">DAILY BREAKDOWN</span><h2 id="report-date-title">{dateLabel(selected.date)}</h2></div><button type="button" className="btn-close" aria-label="Close" onClick={()=>setSelectedDate('')}/></header>
    <div className="hw-report-modal-summary"><div><small>Revenue</small><strong>{money(selected.revenue)}</strong></div><div><small>Gross profit</small><strong>{money(selected.profit)}</strong></div><div><small>Damage loss</small><strong>{money(selected.damageLoss)}</strong></div><div><small>Net profit</small><strong>{money(selected.profit-selected.damageLoss)}</strong></div></div>
    <h3>Sales ({selected.sales.length})</h3>{selected.sales.length?<div className="table-responsive"><table className="table table-sm"><thead><tr><th>Product</th><th>Qty</th><th>Revenue</th><th>Profit</th></tr></thead><tbody>{selected.sales.map((x,i)=><tr key={x.id||i}><td>{x.product}</td><td>{quantity(x)}</td><td>{money(revenue(x))}</td><td>{money(profit(x))}</td></tr>)}</tbody></table></div>:<p className="analytics-muted">No sales recorded.</p>}
    <h3>Damaged items ({selected.damaged.length})</h3>{selected.damaged.length?<div className="table-responsive"><table className="table table-sm"><thead><tr><th>Product</th><th>Qty</th><th>Reason</th><th>Loss</th></tr></thead><tbody>{selected.damaged.map((x,i)=><tr key={x.id||i}><td>{x.product}</td><td>{quantity(x)}</td><td>{x.reason||'—'}</td><td>{money(Number(x.loss)||quantity(x)*(Number(x.unitCost)||0))}</td></tr>)}</tbody></table></div>:<p className="analytics-muted">No damaged items recorded.</p>}
    <h3>Stock received ({selected.stockIns.length})</h3>{selected.stockIns.length?<ul className="hw-report-stock-list">{selected.stockIns.map((x,i)=><li key={x.id||i}><span>{x.product}</span><strong>{quantity(x)} units</strong></li>)}</ul>:<p className="analytics-muted">No stock-in records.</p>}
  </section></div>}
  </div>
}
