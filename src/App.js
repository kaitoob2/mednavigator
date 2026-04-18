import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#F7F9FC",card:"#FFFFFF",border:"#E8EDF3",
  dark:"#0F1923",mid:"#5A6A7A",muted:"#9AAABB",
  accent:"#0057FF",accentBg:"#EEF3FF",
  green:"#00A86B",greenBg:"#E6F7F1",
  amber:"#F59E0B",amberBg:"#FEF3C7",
  red:"#EF4444",redBg:"#FEE2E2",white:"#FFFFFF",
};

const SAMPLE_RESULTS = [
  {service:"Emergency Room Visit",youWereCharged:4800,hospitalPublishes:1100,difference:3700,concern:"high",note:"Differs from hospital's own published price by $3,700"},
  {service:"IV Saline Solution",youWereCharged:890,hospitalPublishes:8,difference:882,concern:"high",note:"Hospital's published supply price is $8 — billed $882 more"},
  {service:"Blood Panel",youWereCharged:2100,hospitalPublishes:320,difference:1780,concern:"high",note:"Billed amount exceeds published rate — worth requesting explanation"},
  {service:"Physician Consultation",youWereCharged:580,hospitalPublishes:580,difference:0,concern:"none",note:"Matches published rate"},
  {service:"Nursing Care (2 hrs)",youWereCharged:420,hospitalPublishes:420,difference:0,concern:"none",note:"Matches published rate"},
  {service:"Discharge Processing",youWereCharged:310,hospitalPublishes:0,difference:310,concern:"medium",note:"This charge does not appear in the hospital's published price list"},
];

async function callAI(prompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-20250514",
      max_tokens:1000,
      system:"You are a helpful medical bill review assistant. You help patients understand their hospital bills by comparing charges against publicly published hospital prices. Never say charges are illegal or that hospitals violated laws. Always use phrases like differs from published rate and worth requesting an explanation. Always remind users this is informational only and not legal advice. Be warm, clear, and plain-spoken.",
      messages:[{role:"user",content:prompt}]
    })
  });
  const d = await res.json();
  return d.content?.map(b=>b.text||"").join("")||"Unable to generate response.";
}
function TypeWriter({text,speed=14,onDone}){
  const [out,setOut]=useState("");
  const i=useRef(0);
  useEffect(()=>{
    setOut("");i.current=0;
    if(!text)return;
    const iv=setInterval(()=>{
      i.current++;
      setOut(text.slice(0,i.current));
      if(i.current>=text.length){clearInterval(iv);onDone?.();}
    },speed);
    return()=>clearInterval(iv);
  },[text]);
  return <span style={{whiteSpace:"pre-wrap"}}>{out}{out.length<(text?.length||0)&&<span style={{color:C.accent}}>|</span>}</span>;
}

function ConcernBadge({level}){
  if(level==="none")return <span style={{background:C.greenBg,color:C.green,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>✓ Looks Fine</span>;
  if(level==="medium")return <span style={{background:C.amberBg,color:C.amber,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>Worth Asking About</span>;
  return <span style={{background:C.redBg,color:C.red,borderRadius:6,padding:"3px 10px",fontSize:11,fontWeight:700}}>Worth Questioning​​​​​​​​​​​​​​​​
function ResultsScreen({billName,hasEob,onPay,onBack}){
  const flagged=SAMPLE_RESULTS.filter(r=>r.concern!=="none");
  const clean=SAMPLE_RESULTS.filter(r=>r.concern==="none");
  const totalDiff=flagged.reduce((a,b)=>a+b.difference,0);
  const totalBilled=SAMPLE_RESULTS.reduce((a,b)=>a+b.youWereCharged,0);
  const [summary,setSummary]=useState("");
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    async function getSummary(){
      const text=await callAI(`A hospital bill for "${billName}" was compared against the hospital's own published prices. Found ${flagged.length} charges worth questioning totalling $${totalDiff.toLocaleString()} out of a total bill of $${totalBilled.toLocaleString()}. Write a 2-sentence plain English summary explaining what was found and what the patient's next step should be. Never say illegal, violation, or overcharged. Say the charges differ from published rates and the patient should request a written explanation.`);
      setSummary(text);
      setLoading(false);
    }
    getSummary();
  },[]);

  return(
    <div style={{maxWidth:580,margin:"0 auto",padding:"32px 24px"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.mid,cursor:"pointer",fontSize:14,marginBottom:24,padding:0}}>← Check another bill</button>
      <div style={{background:totalDiff>0?"#FFF7ED":C.greenBg,border:`1.5px solid ${totalDiff>0?"#FED7AA":"#86EFAC"}`,borderRadius:16,padding:"24px",marginBottom:20}}>
        <div style={{fontSize:12,fontWeight:700,color:totalDiff>0?C.amber:C.green,letterSpacing:0.5,marginBottom:8,textTransform:"uppercase"}}>
          {totalDiff>0?"⚠️ Charges Worth Questioning":"✓ Bill Looks Consistent"}
        </div>
        <div style={{fontFamily:"'Lora',Georgia,serif",fontSize:42,fontWeight:700,color:C.dark,lineHeight:1,marginBottom:8}}>${totalDiff.toLocaleString()}</div>
        <div style={{color:C.mid,fontSize:14}}>differs from published rates on your ${totalBilled.toLocaleString()} bill</div>
        {hasEob&&<div style={{marginTop:12,fontSize:12,color:C.accent,background:C.accentBg,borderRadius:8,padding:"6px 12px",display:"inline-block"}}>✓ Compared against your EOB for stronger accuracy</div>}
      </div>
      {(loading||summary)&&(
        <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:12,padding:"16px 20px",marginBottom:20,fontSize:14,color:C.mid,lineHeight:1.7}}>
          {loading?<span style={{color:C.muted}}>Preparing your summary...</span>:<TypeWriter text={summary} speed={12}/>}
        </div>
      )}
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,overflow:"hidden",marginBottom:20}}>
        {flagged.length>0&&(
          <div>
            <div style={{padding:"12px 20px",background:"#FFFBF5",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,fontWeight:700,color:C.amber}}>WORTH QUESTIONING</span>
            </div>
            {flagged.map((item,i)=>(
              <div key={i} style={{padding:"16px 20px",borderBottom:`1px solid ${C.border}`,display:"grid",gridTemplateColumns:"1fr auto",gap:12,alignItems:"start"}}>
                <div>
                  <div style={{fontWeight:600,color:C.dark,fontSize:14,marginBottom:4}}>{item.service}</div>
                  <div style={{fontSize:12,color:C.mid,marginBottom:6}}>{item.note}</div>
                  <div style={{display:"flex",gap:16,fontSize:12}}>
                    <span style={{color:C.mid}}>You were charged: <strong style={{color:C.dark}}>${item.youWereCharged.toLocaleString()}</strong></span>
                    {item.hospitalPublishes>0&&<span style={{color:C.mid}}>Hospital publishes: <strong style={{color:C.green}}>${item.hospitalPublishes.toLocaleString()}</strong></span>}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <ConcernBadge level={item.concern}/>
                  {item.difference>0&&<div style={{fontSize:13,fontWeight:700,color:C.amber,marginTop:6}}>+${item.difference.toLocaleString()}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
        {clean.length>0&&(
          <div>
            <div style={{padding:"12px 20px",background:"#F0FDF4",borderBottom:`1px solid ${C.border}`}}>
              <span style={{fontSize:12,fontWeight:700,color:C.green}}>LOOKS FINE</span>
            </div>
            {clean.map((item,i)=>(
              <div key={i} style={{padding:"14px 20px",borderBottom:i<clean.length-1?`1px solid ${C.border}`:"none",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:14,color:C.mid}}>{item.service}</span>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <span style={{fontSize:14,color:C.mid}}>${item.youWereCharged.toLocaleString()}</span>
                  <ConcernBadge level="none"/>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{fontSize:12,color:C.muted,textAlign:"center",marginBottom:20,lineHeight:1.6}}>
        Comparisons based on this hospital's own published price transparency data as required by federal law. This is informational only — not legal advice.
      </div>
      {totalDiff>0&&(
        <div style={{background:C.card,border:`1.5px solid ${C.accent}`,borderRadius:16,padding:"24px",textAlign:"center"}}>
          <div style={{fontFamily:"'Lora',Georgia,serif",fontSize:22,fontWeight:700,color:C.dark,marginBottom:8}}>Want us to write the letters?</div>
          <div style={{color:C.mid,fontSize:14,marginBottom:20,lineHeight:1.6}}>We write a review request letter to the hospital. You just review and send.</div>
          <button onClick={onPay} style={{width:"100%",background:C.accent,border:"none",borderRadius:12,padding:"16px",fontSize:16,fontWeight:700,color:C.white,cursor:"pointer",marginBottom:10}}>Get All Letters — $49/year</button>
          <div style={{fontSize:12,color:C.muted}}>Cancel anytime · Free to see results · No surprise charges</div>
        </div>
      )}
    </div>
  );
}
function CaseScreen({billName,onBack}){
  const [letterLoading,setLetterLoading]=useState(true);
  const [letter,setLetter]=useState("");
  const [letterDone,setLetterDone]=useState(false);
  const [rxQuery,setRxQuery]=useState("");
  const [rxResult,setRxResult]=useState("");
  const [rxLoading,setRxLoading]=useState(false);

  const flagged=SAMPLE_RESULTS.filter(r=>r.concern!=="none");
  const totalDiff=flagged.reduce((a,b)=>a+b.difference,0);

  const timeline=[
    {label:"Review request sent",sub:"Today",status:"done",icon:"✉️"},
    {label:"Waiting for hospital response",sub:"30 day deadline",status:"active",icon:"⏳"},
    {label:"Follow up to billing advocate",sub:"If no response",status:"pending",icon:"👤"},
    {label:"Attorney general complaint",sub:"If still unresolved",status:"pending",icon:"⚖️"},
    {label:"Resolution",sub:"Average 45 days",status:"pending",icon:"✅"},
  ];

  useEffect(()=>{
    async function getLetter(){
      const text=await callAI(`Write a polite and firm review request letter for a patient regarding their bill from "${billName}". The following charges differ from the hospital's own published prices: ${flagged.map(f=>`${f.service} — charged $${f.youWereCharged}, hospital publishes $${f.hospitalPublishes}, difference $${f.difference}`).join("; ")}. Total amount worth questioning: $${totalDiff.toLocaleString()}. The letter should: use [Patient Name], [Patient Address], [Date], and [Hospital Name] as placeholders; list each charge with the published price and the difference; request a written itemized explanation within 30 days; mention the Hospital Price Transparency Rule; include a disclaimer that this letter was prepared with AI assistance and is not legal advice; never use the words illegal, violation, fraud, or overcharged. Keep it under 300 words. Professional and respectful.`);
      setLetter(text);
      setLetterLoading(false);
    }
    getLetter();
  },[]);

  async function findRx(){
    if(!rxQuery.trim())return;
    setRxLoading(true);
    setRxResult("");
    const text=await callAI(`The patient is looking for affordable options for: "${rxQuery}". Give 3 practical tips to reduce the cost — mention generic alternatives if available, coupon programs like GoodRx or Cost Plus Drugs, and whether a 90-day supply saves money. Note this is general pricing information only — always confirm with a pharmacist. Under 150 words.`);
    setRxResult(text);
    setRxLoading(false);
  }

  return(
    <div style={{maxWidth:580,margin:"0 auto",padding:"32px 24px"}}>
      <button onClick={onBack} style={{background:"none",border:"none",color:C.mid,cursor:"pointer",fontSize:14,marginBottom:24,padding:0}}>← Back to results</button>
      <div style={{background:C.accentBg,borderRadius:16,padding:"20px 24px",marginBottom:24,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
        <div>
          <div style={{fontSize:12,color:C.accent,fontWeight:700,marginBottom:4}}>YOUR CASE</div>
          <div style={{fontWeight:700,color:C.dark,fontSize:16}}>{billName}</div>
          <div style={{fontSize:13,color:C.mid,marginTop:2}}>${totalDiff.toLocaleString()} worth questioning</div>
        </div>
        <div style={{background:C.accent,color:C.white,borderRadius:10,padding:"8px 16px",fontSize:13,fontWeight:700}}>Active</div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
        <div style={{fontSize:13,fontWeight:700,color:C.dark,marginBottom:16}}>What happens next</div>
        {timeline.map((step,i)=>(
          <div key={i} style={{display:"flex",gap:14,marginBottom:i<timeline.length-1?16:0,alignItems:"flex-start"}}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0}}>
              <div style={{width:36,height:36,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,background:step.status==="done"?C.greenBg:step.status==="active"?C.accentBg:C.bg,border:`2px solid ${step.status==="done"?C.green:step.status==="active"?C.accent:C.border}`}}>
                {step.icon}
              </div>
              {i<timeline.length-1&&<div style={{width:2,height:20,background:step.status==="done"?C.green:C.border,marginTop:4}}/>}
            </div>
            <div style={{paddingTop:6}}>
              <div style={{fontSize:14,fontWeight:step.status==="active"?700:500,color:step.status==="pending"?C.muted:C.dark}}>{step.label}</div>
              <div style={{fontSize:12,color:C.muted,marginTop:2}}>{step.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px",marginBottom:20}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div style={{fontSize:13,fontWeight:700,color:C.dark}}>Your Review Request Letter</div>
          {letterDone&&(
            <button onClick={()=>navigator.clipboard?.writeText(letter)} style={{background:"none",border:`1px solid ${C.border}`,borderRadius:8,padding:"6px 12px",fontSize:12,color:C.mid,cursor:"pointer"}}>Copy</button>
          )}
        </div>
        {letterLoading?(
          <div style={{color:C.muted,fontSize:14}}>Writing your letter...</div>
        ):(
          <div style={{fontSize:13,lineHeight:1.8,color:C.mid,fontFamily:"Georgia,serif"}}>
            <TypeWriter text={letter} speed={8} onDone={()=>setLetterDone(true)}/>
          </div>
        )}
        <div style={{marginTop:16,fontSize:11,color:C.muted,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          This letter was prepared with AI assistance and is informational only. It does not constitute legal advice. Consider consulting a healthcare billing specialist for complex disputes.
        </div>
      </div>
      <div style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:16,padding:"20px 24px"}}>
        <div style={{fontSize:13,fontWeight:700,color:C.dark,marginBottom:4}}>💊 Find cheaper prescriptions</div>
        <div style={{fontSize:13,color:C.mid,marginBottom:14}}>Type any medication to see lower cost options near you</div>
        <div style={{display:"flex",gap:10}}>
          <input value={rxQuery} onChange={e=>setRxQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&findRx()}
            placeholder="e.g. Metformin, Ozempic, Lisinopril..."
            style={{flex:1,background:C.bg,border:`1.5px solid ${C.border}`,borderRadius:10,padding:"10px 14px",fontSize:14,color:C.dark,outline:"none"}}/>
          <button onClick={findRx} disabled={rxLoading} style={{background:C.accent,border:"none",borderRadius:10,padding:"10px 18px",fontSize:14,fontWeight:700,color:C.white,cursor:"pointer",minWidth:80}}>
            {rxLoading?"...":"Find"}
          </button>
        </div>
        {rxResult&&(
          <div style={{marginTop:14,fontSize:13,color:C.mid,lineHeight:1.7}}>
            <TypeWriter text={rxResult} speed={12}/>
          </div>
        )}
      </div>
    </div>
  );
}
export default function App(){
  const [screen,setScreen]=useState("upload");
  const [billName,setBillName]=useState("");
  const [hasEob,setHasEob]=useState(false);

  return(
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:"'DM Sans','Segoe UI',sans-serif"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
        *{box-sizing:border-box;}
        button{font-family:'DM Sans',sans-serif;}
        input{font-family:'DM Sans',sans-serif;}
      `}</style>
      <div style={{background:C.white,borderBottom:`1px solid ${C.border}`,padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,borderRadius:8,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🏥</div>
          <div>
            <div style={{fontFamily:"'Lora',Georgia,serif",fontWeight:700,fontSize:17,color:C.dark,lineHeight:1}}>MedNavigator</div>
            <div style={{fontSize:10,color:C.muted,letterSpacing:0.3}}>Bill Review Tool</div>
          </div>
        </div>
        <div style={{display:"flex",gap:16,alignItems:"center"}}>
          {screen!=="upload"&&<span style={{fontSize:13,color:C.mid}}>{screen==="results"?"Your Results":"Your Case"}</span>}
          <div style={{fontSize:13,color:C.accent,fontWeight:600}}>$49/year</div>
        </div>
      </div>
      {screen==="upload"&&(
        <UploadScreen onAnalyze={(name,eob)=>{
          setBillName(name);
          setHasEob(eob);
          setScreen("results");
        }}/>
      )}
      {screen==="results"&&(
        <ResultsScreen
          billName={billName}
          hasEob={hasEob}
          onPay={()=>setScreen("case")}
          onBack={()=>setScreen("upload")}
        />
      )}
      {screen==="case"&&(
        <CaseScreen
          billName={billName}
          onBack={()=>setScreen("results")}
        />
      )}
      <div style={{textAlign:"center",padding:"32px 24px 40px",color:C.muted,fontSize:12,lineHeight:1.7,maxWidth:520,margin:"0 auto"}}>
        MedNavigator compares charges against publicly available hospital price data. Results are informational only and do not constitute legal or medical advice. Always consult a qualified professional for complex billing disputes.
      </div>
    </div>
  );
}
