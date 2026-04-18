import { useState, useRef, useEffect } from "react";

const ACCENT = "#0057FF";
const DARK = "#0F1923";
const MID = "#5A6A7A";
const MUTED = "#9AAABB";
const GREEN = "#00A86B";
const AMBER = "#F59E0B";
const BORDER = "#E8EDF3";
const BG = "#F7F9FC";
const WHITE = "#FFFFFF";

const BILLS = [
  { service: "Emergency Room Visit", charged: 4800, published: 1100, diff: 3700, flag: "high" },
  { service: "IV Saline Solution", charged: 890, published: 8, diff: 882, flag: "high" },
  { service: "Blood Panel", charged: 2100, published: 320, diff: 1780, flag: "high" },
  { service: "Discharge Processing", charged: 310, published: 0, diff: 310, flag: "medium" },
  { service: "Physician Consultation", charged: 580, published: 580, diff: 0, flag: "ok" },
  { service: "Nursing Care", charged: 420, published: 420, diff: 0, flag: "ok" },
];

async function ai(prompt) {
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 800,
        system: "You are a helpful medical bill review assistant. Compare charges against published hospital prices. Never say illegal or violation. Say charges differ from published rates. Always note results are informational only and not legal advice.",
        messages: [{ role: "user", content: prompt }]
      })
    });
    const d = await r.json();
    return d.content[0].text;
  } catch (e) {
    return "Unable to generate response.";
  }
}

function Writer({ text, speed = 15 }) {
  const [out, setOut] = useState("");
  const idx = useRef(0);
  useEffect(() => {
    setOut(""); idx.current = 0;
    if (!text) return;
    const t = setInterval(() => {
      idx.current++;
      setOut(text.slice(0, idx.current));
      if (idx.current >= text.length) clearInterval(t);
    }, speed);
    return () => clearInterval(t);
  }, [text]);
  return <span style={{ whiteSpace: "pre-wrap" }}>{out}</span>;
}

function Badge({ flag }) {
  if (flag === "ok") return <span style={{ background: "#E6F7F1", color: GREEN, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Looks Fine</span>;
  if (flag === "medium") return <span style={{ background: "#FEF3C7", color: AMBER, borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Worth Asking</span>;
  return <span style={{ background: "#FEE2E2", color: "#EF4444", borderRadius: 6, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>Worth Questioning</span>;
}

function Upload({ onDone }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("");
  const steps = ["Reading your bill...", "Looking up published prices...", "Comparing each charge...", "Preparing results..."];

  async function go() {
    setLoading(true);
    for (let i = 0; i < steps.length; i++) {
      setStep(steps[i]);
      await new Promise(r => setTimeout(r, 900));
    }
    onDone(name || "Memorial Hospital — ER Visit");
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "40px 24px" }}>
      <div style={{ textAlign: "center", marginBottom: 40 }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🏥</div>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: DARK, marginBottom: 10 }}>Is your hospital bill correct?</h1>
        <p style={{ color: MID, fontSize: 15, lineHeight: 1.6 }}>We compare every charge against what the hospital itself publishes as their price. Free to see results.</p>
      </div>
      {!loading ? (
        <div>
          <div onClick={go} style={{ background: WHITE, border: "2px dashed " + BORDER, borderRadius: 14, padding: "28px 20px", textAlign: "center", marginBottom: 14, cursor: "pointer" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontWeight: 600, color: DARK, fontSize: 15 }}>Upload your hospital bill</div>
            <div style={{ color: MUTED, fontSize: 13, marginTop: 4 }}>PDF or photo — or tap to use sample</div>
          </div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Bill name (optional)" style={{ width: "100%", border: "1.5px solid " + BORDER, borderRadius: 10, padding: "11px 14px", fontSize: 14, marginBottom: 14, outline: "none", boxSizing: "border-box" }} />
          <button onClick={go} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: 12, padding: "15px", fontSize: 15, fontWeight: 700, color: WHITE, cursor: "pointer" }}>Check My Bill — Free</button>
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 16 }}>
            {["Free to see results", "Up to 5 years back", "Private"].map(t => <span key={t} style={{ fontSize: 12, color: MUTED }}>✓ {t}</span>)}
          </div>
        </div>
      ) : (
        <div style={{ background: WHITE, borderRadius: 14, padding: "36px 20px", textAlign: "center", border: "1px solid " + BORDER }}>
          <div style={{ width: 44, height: 44, border: "3px solid " + ACCENT, borderTopColor: "transparent", borderRadius: "50%", margin: "0 auto 18px", animation: "spin 1s linear infinite" }} />
          <div style={{ fontWeight: 600, color: DARK, marginBottom: 6 }}>Checking your bill</div>
          <div style={{ color: MID, fontSize: 14 }}>{step}</div>
        </div>
      )}
    </div>
  );
}

function Results({ name, onPay, onBack }) {
  const flagged = BILLS.filter(b => b.flag !== "ok");
  const clean = BILLS.filter(b => b.flag === "ok");
  const total = flagged.reduce((a, b) => a + b.diff, 0);
  const billed = BILLS.reduce((a, b) => a + b.charged, 0);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ai("A hospital bill was compared against published prices. Found " + flagged.length + " charges worth questioning totalling $" + total.toLocaleString() + " on a $" + billed.toLocaleString() + " bill. Write 2 plain English sentences: what was found and what the patient should do next. Never say illegal or overcharged.").then(t => { setSummary(t); setLoading(false); });
  }, []);

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MID, fontSize: 14, cursor: "pointer", marginBottom: 20, padding: 0 }}>← Check another bill</button>
      <div style={{ background: total > 0 ? "#FFF7ED" : "#E6F7F1", border: "1.5px solid " + (total > 0 ? "#FED7AA" : "#86EFAC"), borderRadius: 14, padding: "22px", marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: total > 0 ? AMBER : GREEN, marginBottom: 6, textTransform: "uppercase" }}>{total > 0 ? "⚠️ Charges Worth Questioning" : "✓ Bill Looks Consistent"}</div>
        <div style={{ fontSize: 40, fontWeight: 700, color: DARK, lineHeight: 1, marginBottom: 6 }}>${total.toLocaleString()}</div>
        <div style={{ color: MID, fontSize: 14 }}>differs from published rates on your ${billed.toLocaleString()} bill</div>
      </div>
      <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: 12, padding: "14px 18px", marginBottom: 18, fontSize: 14, color: MID, lineHeight: 1.7 }}>
        {loading ? "Preparing summary..." : <Writer text={summary} />}
      </div>
      <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: 14, overflow: "hidden", marginBottom: 18 }}>
        {flagged.length > 0 && (
          <div>
            <div style={{ padding: "10px 18px", background: "#FFFBF5", borderBottom: "1px solid " + BORDER }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: AMBER }}>WORTH QUESTIONING</span>
            </div>
            {flagged.map((item, i) => (
              <div key={i} style={{ padding: "14px 18px", borderBottom: "1px solid " + BORDER, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ fontWeight: 600, color: DARK, fontSize: 14, marginBottom: 3 }}>{item.service}</div>
                  <div style={{ fontSize: 12, color: MID }}>Charged: ${item.charged.toLocaleString()} · Published: ${item.published.toLocaleString()}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <Badge flag={item.flag} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: AMBER, marginTop: 4 }}>+${item.diff.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {clean.length > 0 && (
          <div>
            <div style={{ padding: "10px 18px", background: "#F0FDF4", borderBottom: "1px solid " + BORDER }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>LOOKS FINE</span>
            </div>
            {clean.map((item, i) => (
              <div key={i} style={{ padding: "12px 18px", borderBottom: i < clean.length - 1 ? "1px solid " + BORDER : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 14, color: MID }}>{item.service}</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 14, color: MID }}>${item.charged.toLocaleString()}</span>
                  <Badge flag="ok" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ fontSize: 12, color: MUTED, textAlign: "center", marginBottom: 18 }}>Comparisons based on hospital's own published price transparency data. Informational only — not legal advice.</div>
      {total > 0 && (
        <div style={{ background: WHITE, border: "1.5px solid " + ACCENT, borderRadius: 14, padding: "22px", textAlign: "center" }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: DARK, marginBottom: 8 }}>Want us to write the letter?</div>
          <div style={{ color: MID, fontSize: 14, marginBottom: 18, lineHeight: 1.6 }}>We write a professional review request letter to the hospital billing department. You copy it and send it.</div>
          <button onClick={onPay} style={{ width: "100%", background: ACCENT, border: "none", borderRadius: 12, padding: "14px", fontSize: 15, fontWeight: 700, color: WHITE, cursor: "pointer", marginBottom: 8 }}>Get The Letter — $49/year</button>
          <div style={{ fontSize: 12, color: MUTED }}>Free to see results · No card needed until here</div>
        </div>
      )}
    </div>
  );
}

function Case({ name, onBack }) {
  const [letter, setLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [rx, setRx] = useState("");
  const [rxQ, setRxQ] = useState("");
  const [rxL, setRxL] = useState(false);
  const flagged = BILLS.filter(b => b.flag !== "ok");
  const total = flagged.reduce((a, b) => a + b.diff, 0);

  useEffect(() => {
    ai("Write a polite review request letter for a patient. Bill from: " + name + ". Charges that differ from published prices: " + flagged.map(f => f.service + " charged $" + f.charged + " published $" + f.published).join(", ") + ". Total: $" + total.toLocaleString() + ". Use placeholders [Patient Name] [Date] [Hospital Name]. Request written explanation within 30 days. Cite Hospital Price Transparency Rule. Add disclaimer this is AI assistance not legal advice. Never say illegal or violation. Under 280 words.").then(t => { setLetter(t); setLoading(false); });
  }, []);

  async function findRx() {
    if (!rxQ.trim()) return;
    setRxL(true);
    const t = await ai("Affordable options for: " + rxQ + ". Give 3 tips — generics, GoodRx, 90-day supply. Note this is general info only. Under 120 words.");
    setRx(t); setRxL(false);
  }

  const steps = [
    { icon: "✉️", label: "Letter sent to billing department", sub: "Today", done: true },
    { icon: "⏳", label: "Waiting for hospital response", sub: "30 day deadline", active: true },
    { icon: "👤", label: "Escalate to patient advocate", sub: "If no response", done: false },
    { icon: "✅", label: "Resolution", sub: "Average 45 days", done: false },
  ];

  return (
    <div style={{ maxWidth: 560, margin: "0 auto", padding: "28px 20px" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: MID, fontSize: 14, cursor: "pointer", marginBottom: 20, padding: 0 }}>← Back</button>
      <div style={{ background: "#EEF3FF", borderRadius: 14, padding: "18px 22px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 12, color: ACCENT, fontWeight: 700, marginBottom: 3 }}>YOUR CASE</div>
          <div style={{ fontWeight: 700, color: DARK }}>{name}</div>
          <div style={{ fontSize: 13, color: MID }}>${total.toLocaleString()} worth questioning</div>
        </div>
        <div style={{ background: ACCENT, color: WHITE, borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>Active</div>
      </div>
      <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: 14, padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ fontWeight: 700, color: DARK, fontSize: 13, marginBottom: 14 }}>What happens next</div>
        {steps.map((s, i) => (
          <div key={i} style={{ display: "flex", gap: 12, marginBottom: i < steps.length - 1 ? 14 : 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, background: s.done ? "#E6F7F1" : s.active ? "#EEF3FF" : BG, border: "2px solid " + (s.done ? GREEN : s.active ? ACCENT : BORDER), flexShrink: 0 }}>{s.icon}</div>
            <div style={{ paddingTop: 4 }}>
              <div style={{ fontSize: 14, fontWeight: s.active ? 700 : 500, color: s.done || s.active ? DARK : MUTED }}>{s.label}</div>
              <div style={{ fontSize: 12, color: MUTED }}>{s.sub}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: 14, padding: "18px 22px", marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontWeight: 700, color: DARK, fontSize: 13 }}>Your Review Request Letter</div>
          {!loading && <button onClick={() => navigator.clipboard.writeText(letter)} style={{ background: "none", border: "1px solid " + BORDER, borderRadius: 8, padding: "5px 12px", fontSize: 12, color: MID, cursor: "pointer" }}>Copy</button>}
        </div>
        <div style={{ fontSize: 13, lineHeight: 1.8, color: MID, fontFamily: "Georgia, serif" }}>
          {loading ? "Writing your letter..." : <Writer text={letter} speed={8} />}
        </div>
        <div style={{ marginTop: 14, fontSize: 11, color: MUTED, borderTop: "1px solid " + BORDER, paddingTop: 10 }}>AI assistance only. Not legal advice. Consult a healthcare billing specialist for complex disputes.</div>
      </div>
      <div style={{ background: WHITE, border: "1px solid " + BORDER, borderRadius: 14, padding: "18px 22px" }}>
        <div style={{ fontWeight: 700, color: DARK, fontSize: 13, marginBottom: 4 }}>💊 Find cheaper prescriptions</div>
        <div style={{ fontSize: 13, color: MID, marginBottom: 12 }}>Type any medication name</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input value={rxQ} onChange={e => setRxQ(e.target.value)} onKeyDown={e => e.key === "Enter" && findRx()} placeholder="e.g. Metformin, Ozempic..." style={{ flex: 1, border: "1.5px solid " + BORDER, borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none" }} />
          <button onClick={findRx} style={{ background: ACCENT, border: "none", borderRadius: 10, padding: "10px 16px", fontSize: 14, fontWeight: 700, color: WHITE, cursor: "pointer" }}>{rxL ? "..." : "Find"}</button>
        </div>
        {rx && <div style={{ marginTop: 12, fontSize: 13, color: MID, lineHeight: 1.7 }}><Writer text={rx} /></div>}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("upload");
  const [name, setName] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: BG, fontFamily: "system-ui, sans-serif" }}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}*{box-sizing:border-box}`}</style>
      <div style={{ background: WHITE, borderBottom: "1px solid " + BORDER, height: 56, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 30, height: 30, background: ACCENT, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>🏥</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: DARK }}>MedNavigator</div>
        </div>
        <div style={{ fontSize: 13, color: ACCENT, fontWeight: 600 }}>$49/year</div>
      </div>
      {screen === "upload" && <Upload onDone={n => { setName(n); setScreen("results"); }} />}
      {screen === "results" && <Results name={name} onPay={() => setScreen("case")} onBack={() => setScreen("upload")} />}
      {screen === "case" && <Case name={name} onBack={() => setScreen("results")} />}
      <div style={{ textAlign: "center", padding: "28px 20px 40px", color: MUTED, fontSize: 12, lineHeight: 1.7 }}>MedNavigator compares charges against publicly available hospital price data. Results are informational only and not legal advice.</div>
    </div>
  );
}
