import { useState, useEffect, useRef } from "react";

// ─── DESIGN TOKENS ───
const C = {
  violeta: "#5B2D8E",
  violetaClaro: "#8B5FBF",
  violetaSuave: "#EDE0FF",
  dorado: "#C9A050",
  doradoClaro: "#F0D080",
  crema: "#FBF7F2",
  cremaDark: "#F0E8DC",
  carbon: "#1A1625",
  gris: "#6B6478",
  grisSuave: "#C8C0D0",
  blanco: "#FFFFFF",
  verde: "#4CAF80",
  rosa: "#E8A0C0",
};

// ─── CAYENA SVG ───
function Cayena({ size = 36, color = "white", glow = false }) {
  const s = glow ? { filter: `drop-shadow(0 0 10px ${color === "white" ? "rgba(255,255,255,0.9)" : "rgba(139,95,191,0.8)"})` } : {};
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={s}>
      {[0,72,144,216,288].map((deg, i) => (
        <ellipse key={i} cx="50" cy="26" rx="10" ry="27"
          fill={color} fillOpacity="0.93"
          transform={`rotate(${deg},50,50)`} />
      ))}
      <circle cx="50" cy="50" r="11" fill={C.dorado} />
      <circle cx="50" cy="50" r="6.5" fill={C.doradoClaro} />
      <line x1="50" y1="43" x2="50" y2="31" stroke={C.dorado} strokeWidth="1.8"/>
      <circle cx="50" cy="30" r="3" fill={C.dorado}/>
    </svg>
  );
}

// ─── STORAGE HELPERS ───
// ─── SUPABASE CONFIG ───
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

async function sbFetch(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...options,
    headers: {
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": options.prefer || "",
      ...options.headers
    }
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// All data stored in Supabase — works across devices
async function storeGet(key, shared = false) {
  try {
    const data = await sbFetch(`florece_store?key=eq.${encodeURIComponent(key)}&select=value`);
    return data && data[0] ? JSON.parse(data[0].value) : null;
  } catch { return null; }
}

async function storeSet(key, val, shared = false) {
  try {
    // Use upsert — inserts if not exists, updates if exists
    await sbFetch(`florece_store`, {
      method: "POST",
      headers: { 
        "Prefer": "resolution=merge-duplicates,return=minimal",
        "on_conflict": "key"
      },
      body: JSON.stringify({ key, value: JSON.stringify(val) })
    });
  } catch(e) {
    // Fallback: try PATCH if POST fails
    try {
      await sbFetch(`florece_store?key=eq.${encodeURIComponent(key)}`, {
        method: "PATCH",
        headers: { "Prefer": "return=minimal" },
        body: JSON.stringify({ value: JSON.stringify(val) })
      });
    } catch {}
  }
}

// ─── AI AFFIRMATION via Claude ───
async function generateAffirmation(theme = "general", history = []) {
  const themes = {
    general: "libertad financiera y de tiempo para madres y mujeres emprendedoras",
    negocio: "iniciar y crecer un negocio propio con valentía",
    familia: "ser una madre presente y una mujer abundante al mismo tiempo",
    abundancia: "atraer prosperidad, dinero y oportunidades",
    accion: "tomar acción a pesar del miedo y las dudas",
  };
  const mentores = ["Lain García Calvo", "Brian Tracy", "Tony Robbins", "Margarita Pasos", "Otilia Bernal"];
  const angulos = [
    "el poder de la palabra hablada y la energía que transmite",
    "la conexión entre sentir algo profundamente y manifestarlo en la realidad",
    "tomar acción concreta hoy mismo, sin esperar el momento perfecto",
    "soltar el miedo y la duda para abrir paso a la abundancia",
    "la fuerza interior que ya existe dentro de cada mujer",
    "construir libertad para poder estar presente con quienes ama",
  ];
  const mentorElegido = mentores[Math.floor(Math.random() * mentores.length)];
  const anguloElegido = angulos[Math.floor(Math.random() * angulos.length)];
  const sello = Math.random().toString(36).substring(2, 8);
  const evitar = history.length > 0
    ? `\n\nNO repitas ni te parezcas a estas afirmaciones que ya se mostraron recientemente:\n${history.map(h=>`- "${h}"`).join("\n")}`
    : "";

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `[id:${sello}] Genera UNA afirmación poderosa y ORIGINAL en español sobre: ${themes[theme] || themes.general}.

Inspírate especialmente en el estilo de ${mentorElegido}, enfocándote en: ${anguloElegido}.

Reglas:
- Primera persona, tiempo presente, muy emotiva
- Máximo 2 frases
- Debe sonar fresca y distinta cada vez — evita frases genéricas como "soy capaz de crear la vida que imagino"
- Solo la afirmación, sin comillas ni explicaciones ni numeración${evitar}`
      }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "Soy capaz de crear la vida que imagino. Mi momento es hoy.";
}

async function generateCommunityReply(postText) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{
        role: "user",
        content: `Eres Florece, una IA de apoyo para una comunidad de mujeres emprendedoras hispanohablantes. 
        Una usuaria escribió en la comunidad: "${postText}"
        Responde con un mensaje de apoyo cálido, empoderador y genuino. Máximo 2 frases. Sin emojis excesivos. Solo el mensaje.`
      }]
    })
  });
  const data = await res.json();
  return data.content?.[0]?.text?.trim() || "Qué hermoso compartir esto. Seguimos creciendo juntas. 💜";
}

// ─── STATIC DATA ───
const DECK = [
  { text: "Tengo todo lo que necesito para empezar hoy.", cat: "💼 Negocio", mentor: "Margarita Pasos", fav: false },
  { text: "Soy una madre presente, poderosa y abundante.", cat: "👨‍👧 Familia", mentor: "Otilia Bernal", fav: false },
  { text: "Mi mente es mi mayor activo. Elijo pensamientos de éxito.", cat: "🧠 Mentalidad", mentor: "Brian Tracy", fav: false },
  { text: "El dinero fluye hacia mí de manera fácil y constante.", cat: "✨ Abundancia", mentor: "Lain García Calvo", fav: false },
  { text: "Soy libre de crear la vida que imagino para mí y los míos.", cat: "🌸 Libertad", mentor: "Florece", fav: false },
  { text: "Cada acción que tomo me acerca a mi versión más poderosa.", cat: "💫 Acción", mentor: "Tony Robbins", fav: false },
  { text: "El miedo es solo una señal de que estoy creciendo.", cat: "💪 Valentía", mentor: "Tony Robbins", fav: false },
  { text: "Mi historia merece ser contada. Mi éxito merece ser vivido.", cat: "🌺 Identidad", mentor: "Florece", fav: false },
];

const RETO_DIAS = [
  { dia: 1, titulo: "Hoy me elijo a mí", desc: "Escribe 3 razones por las que mereces la vida que deseas.", icon: "🌱", afirmacion: "Me elijo a mí misma sin culpa. Soy mi primera prioridad." },
  { dia: 2, titulo: "El poder de mis palabras", desc: "Di en voz alta 5 veces: 'Soy capaz. Soy abundante. Soy libre.'", icon: "🗣️", afirmacion: "Mis palabras crean mi realidad. Hablo lo que quiero ser." },
  { dia: 3, titulo: "Gratitud que atrae", desc: "Anota 5 cosas que agradeces hoy, incluyendo algo de tu futuro.", icon: "🙏", afirmacion: "La gratitud abre las puertas de la abundancia en mi vida." },
  { dia: 4, titulo: "Visualiza tu vida libre", desc: "Cierra los ojos 5 minutos y vívete ya en tu vida ideal.", icon: "🔮", afirmacion: "Lo que puedo imaginar, lo puedo crear. Ya lo estoy viviendo." },
  { dia: 5, titulo: "Una acción valiente", desc: "Haz HOY una cosa que has pospuesto por miedo.", icon: "⚡", afirmacion: "Actúo a pesar del miedo. El proceso me enseña y me fortalece." },
  { dia: 6, titulo: "Mi tribu me sostiene", desc: "Comparte en la comunidad algo que aprendiste esta semana.", icon: "💜", afirmacion: "No camino sola. Juntas somos más fuertes y más libres." },
  { dia: 7, titulo: "Soy quien decide", desc: "Escribe tu declaración personal de libertad. Fírmala.", icon: "✍️", afirmacion: "Soy la autora de mi historia. Elijo escribirla desde el poder." },
];

const MENTORES = ["Lain García Calvo","Brian Tracy","Tony Robbins","Margarita Pasos","Otilia Bernal"];

// ─── MODAL ───
function Modal({ open, onClose, children }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position:"fixed",inset:0,background:"rgba(26,22,37,0.7)",backdropFilter:"blur(6px)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center" }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:C.crema,borderRadius:"28px 28px 0 0",padding:"8px 24px 40px",width:"100%",maxWidth:480,maxHeight:"85vh",overflowY:"auto",animation:"slideUp 0.3s ease" }}>
        <div style={{ width:40,height:4,background:C.grisSuave,borderRadius:10,margin:"16px auto 20px",cursor:"pointer" }} onClick={onClose}/>
        {children}
      </div>
    </div>
  );
}

// ─── TOAST ───
function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div style={{ position:"fixed",bottom:90,left:"50%",transform:"translateX(-50%)",background:C.violeta,color:"white",padding:"12px 24px",borderRadius:50,fontSize:14,zIndex:400,boxShadow:"0 8px 30px rgba(91,45,142,0.4)",whiteSpace:"nowrap",animation:"fadeIn 0.3s ease" }}>
      {msg}
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: SPLASH / REGISTRO
// ═══════════════════════════════════════
function SplashScreen({ onEnter }) {
  const [mode, setMode] = useState("splash"); // splash | registro | login
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim()) { setErr("Completa todos los campos 💜"); return; }
    if (!email.includes("@")) { setErr("Ingresa un email válido"); return; }
    setLoading(true);
    const existing = await storeGet(`user:${email.toLowerCase().trim()}`);
    if (existing) { setErr("Ya tienes una cuenta. Inicia sesión."); setLoading(false); return; }
    const user = { name: name.trim(), email: email.toLowerCase().trim(), joined: Date.now(), streak: 0, lastPractice: null, points: 0, level: "Semilla 🌱", completedDays: [], favAffirmations: [] };
    await storeSet(`user:${email.toLowerCase().trim()}`, user);
    setLoading(false);
    onEnter(user);
  };

  const handleLogin = async () => {
    if (!email.trim()) { setErr("Ingresa tu email 💜"); return; }
    setLoading(true);
    const user = await storeGet(`user:${email.toLowerCase().trim()}`);
    if (!user) { setErr("No encontramos esa cuenta. ¿Ya te registraste?"); setLoading(false); return; }
    setLoading(false);
    onEnter(user);
  };

  const inputStyle = { width:"100%",padding:"14px 16px",borderRadius:14,border:`1.5px solid ${C.grisSuave}`,background:C.blanco,fontSize:15,fontFamily:"inherit",color:C.carbon,outline:"none",boxSizing:"border-box" };
  const btnPrimary = { width:"100%",background:`linear-gradient(135deg,${C.dorado},#E8B050)`,color:C.carbon,border:"none",borderRadius:50,padding:"16px",fontSize:15,fontWeight:600,cursor:loading?"not-allowed":"pointer",opacity:loading?0.7:1,fontFamily:"inherit" };
  const btnGhost = { background:"transparent",color:"rgba(255,255,255,0.65)",border:"1px solid rgba(255,255,255,0.25)",borderRadius:50,padding:"13px 32px",fontSize:14,cursor:"pointer",fontFamily:"inherit",marginTop:10,width:"100%" };

  if (mode === "splash") return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${C.carbon} 0%,#2D1845 55%,${C.violeta} 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"40px 28px",position:"relative",overflow:"hidden" }}>
      <div style={{ position:"absolute",width:500,height:500,background:"radial-gradient(circle,rgba(139,95,191,0.18) 0%,transparent 70%)",top:-120,left:-120,borderRadius:"50%",pointerEvents:"none" }}/>
      <div style={{ position:"absolute",width:350,height:350,background:"radial-gradient(circle,rgba(201,160,80,0.12) 0%,transparent 70%)",bottom:-80,right:-80,borderRadius:"50%",pointerEvents:"none" }}/>

      <div style={{ width:90,height:90,borderRadius:"50%",background:`linear-gradient(135deg,${C.dorado},${C.violetaClaro})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 28px",boxShadow:`0 0 60px rgba(139,95,191,0.55)`,position:"relative",zIndex:1 }}>
        <Cayena size={58} color="white" glow />
      </div>

      <h1 style={{ fontFamily:"Georgia,serif",fontSize:54,fontWeight:300,color:"white",letterSpacing:5,lineHeight:1,margin:"0 0 8px",position:"relative",zIndex:1 }}>FLORECE</h1>
      <p style={{ fontSize:12,color:C.dorado,letterSpacing:3,textTransform:"uppercase",marginBottom:44 }}>Tu momento es hoy</p>

      <p style={{ fontFamily:"Georgia,serif",fontSize:24,fontStyle:"italic",color:"rgba(255,255,255,0.88)",maxWidth:320,lineHeight:1.45,marginBottom:14,position:"relative",zIndex:1 }}>
        "El momento perfecto no existe. El momento es ahora."
      </p>
      <p style={{ fontSize:14,color:"rgba(255,255,255,0.48)",maxWidth:290,lineHeight:1.65,marginBottom:52,position:"relative",zIndex:1 }}>
        Comunidad gratuita para mujeres y madres que deciden creer en sí mismas y construir la vida que merecen.
      </p>

      <div style={{ width:"100%",maxWidth:360,position:"relative",zIndex:1 }}>
        <button onClick={()=>setMode("registro")} style={btnPrimary}>Unirme gratis ✨</button>
        <button onClick={()=>setMode("login")} style={btnGhost}>Ya tengo cuenta</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${C.carbon} 0%,#2D1845 100%)`,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px" }}>
      <div style={{ width:"100%",maxWidth:400 }}>
        <div style={{ textAlign:"center",marginBottom:36 }}>
          <div style={{ width:64,height:64,borderRadius:"50%",background:`linear-gradient(135deg,${C.dorado},${C.violetaClaro})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <Cayena size={40} color="white" />
          </div>
          <h2 style={{ fontFamily:"Georgia,serif",fontSize:28,color:"white",fontWeight:300,margin:"0 0 6px" }}>
            {mode==="registro" ? "Bienvenida a Florece" : "Hola de nuevo 💜"}
          </h2>
          <p style={{ fontSize:14,color:"rgba(255,255,255,0.5)",margin:0 }}>
            {mode==="registro" ? "Es gratis. Siempre." : "Ingresa tu email para continuar"}
          </p>
        </div>

        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {mode==="registro" && (
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Tu nombre" style={inputStyle} />
          )}
          <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Tu email" type="email" style={inputStyle} />
          {err && <p style={{ color:"#FF8FAB",fontSize:13,margin:"0",textAlign:"center" }}>{err}</p>}
          <button onClick={mode==="registro"?handleRegister:handleLogin} style={btnPrimary} disabled={loading}>
            {loading ? "Un momento..." : mode==="registro" ? "Comenzar mi camino 🌺" : "Entrar"}
          </button>
          <button onClick={()=>{setMode(mode==="registro"?"login":"registro");setErr("");}} style={{ ...btnGhost,marginTop:0 }}>
            {mode==="registro" ? "Ya tengo cuenta" : "Registrarme gratis"}
          </button>
          <button onClick={()=>setMode("splash")} style={{ background:"none",border:"none",color:"rgba(255,255,255,0.35)",fontSize:13,cursor:"pointer",marginTop:4 }}>← Volver</button>
        </div>
      </div>
    </div>
  );
}

// ─── SOUND ENGINE (Web Audio API, sin librerías) ───
const SoundEngine = {
  ctx: null,
  nodes: [],
  getCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    return this.ctx;
  },
  // Genera tono puro + armónicos suaves tipo cuenco tibetano
  playBowl(freq = 528, duration = 3, vol = 0.18) {
    const ctx = this.getCtx();
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, ctx.currentTime);
    master.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.3);
    master.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    master.connect(ctx.destination);
    [1, 2, 3].forEach((harmonic, i) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = i === 0 ? "sine" : "sine";
      osc.frequency.value = freq * (i === 0 ? 1 : harmonic === 2 ? 2.756 : 5.1);
      g.gain.value = i === 0 ? 1 : i === 1 ? 0.18 : 0.06;
      osc.connect(g); g.connect(master);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    });
  },
  // Binaural: tono base + diferencia en Hz entre oídos
  playBinaural(base = 432, beat = 7, duration = 60, vol = 0.12) {
    const ctx = this.getCtx();
    const stop = [];
    ["left","right"].forEach((side, i) => {
      const merger = ctx.createChannelMerger(2);
      const splitter = ctx.createChannelSplitter(2);
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = side === "left" ? base : base + beat;
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
      g.gain.linearRampToValueAtTime(vol, ctx.currentTime + duration - 3);
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
      osc.connect(g); g.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
      stop.push(osc);
    });
    return () => stop.forEach(o => { try { o.stop(); } catch {} });
  },
  // Lluvia suave (ruido rosa)
  playRain(duration = 60, vol = 0.08) {
    const ctx = this.getCtx();
    const bufSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < bufSize; i++) {
      const white = Math.random() * 2 - 1;
      b0=0.99886*b0+white*0.0555179; b1=0.99332*b1+white*0.0750759;
      b2=0.96900*b2+white*0.1538520; b3=0.86650*b3+white*0.3104856;
      b4=0.55000*b4+white*0.5329522; b5=-0.7616*b5-white*0.0168980;
      data[i]=(b0+b1+b2+b3+b4+b5+b6+white*0.5362)/7; b6=white*0.115926;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + 2);
    g.gain.linearRampToValueAtTime(vol, ctx.currentTime + duration - 3);
    g.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
    src.connect(g); g.connect(ctx.destination);
    src.start();
    return () => { try { src.stop(); } catch {} };
  },
  ding(freq = 880) {
    this.playBowl(freq, 2, 0.2);
  }
};

// ─── FRECUENCIAS DE ALTA VIBRACIÓN ───
const FRECUENCIAS = [
  { hz: 396, nombre: "396 Hz", subtitulo: "Libera el miedo y la culpa", emoji: "🌱", descripcion: "Conecta con la tierra. Disuelve bloqueos internos.", color: "linear-gradient(135deg,#E8F5E9,#C8E6C9)", beat: 4 },
  { hz: 432, nombre: "432 Hz", subtitulo: "Armonía natural del universo", emoji: "🌊", descripcion: "Sintoniza tu cuerpo con la frecuencia del cosmos.", color: "linear-gradient(135deg,#E3F2FD,#BBDEFB)", beat: 6 },
  { hz: 528, nombre: "528 Hz", subtitulo: "Frecuencia del amor y la sanación", emoji: "💚", descripcion: "Transforma tu ADN. La frecuencia del milagro.", color: "linear-gradient(135deg,#F3E5F5,#E1BEE7)", beat: 7 },
  { hz: 639, nombre: "639 Hz", subtitulo: "Relaciones y conexión", emoji: "💜", descripcion: "Armoniza tus vínculos. Atrae amor y comunidad.", color: "linear-gradient(135deg,#FCE4EC,#F8BBD9)", beat: 8 },
  { hz: 741, nombre: "741 Hz", subtitulo: "Intuición y expresión", emoji: "✨", descripcion: "Despierta tu intuición. Habla desde tu verdad.", color: "linear-gradient(135deg,#FFF8E1,#FFECB3)", beat: 10 },
  { hz: 852, nombre: "852 Hz", subtitulo: "Despertar espiritual", emoji: "🌟", descripcion: "Eleva tu conciencia. Conecta con tu propósito.", color: "linear-gradient(135deg,#E8EAF6,#C5CAE9)", beat: 12 },
];

// ─── MEDITACIÓN MODAL ───
function MeditacionModal({ onClose, onComplete }) {
  const pasos = [
    { icon:"🌬️", titulo:"Respira y llega", instruccion:"Cierra los ojos. Pon una mano en tu corazón. Siente que estás aquí, ahora, a salvo.", duracion:20 },
    { icon:"🌊", titulo:"Respiración 4-4-4", instruccion:"Inhala contando 4... sostén 4... exhala 4. Repite 3 veces. Cada exhale suelta lo que no necesitas.", duracion:30 },
    { icon:"✨", titulo:"Enciende tu luz", instruccion:"Imagina una luz dorada en tu pecho. Con cada respiración se expande. Esa luz eres tú — tu poder, tu calma, tu capacidad.", duracion:35 },
    { icon:"🎯", titulo:"Programa tu día", instruccion:"Di mentalmente: 'Hoy actúo desde mi poder. Soy capaz. Todo lo que necesito ya está en mí.'", duracion:25 },
    { icon:"🌺", titulo:"Regresa con gratitud", instruccion:"Mueve suavemente los dedos. Respira hondo. Cuando abras los ojos, traes esa paz contigo. Estás lista.", duracion:20 },
  ];

  const [paso, setPaso] = useState(0);
  const [segundos, setSegundos] = useState(pasos[0].duracion);
  const [activo, setActivo] = useState(false);
  const [terminado, setTerminado] = useState(false);
  const [freqSelec, setFreqSelec] = useState(2); // 528 Hz por defecto
  const [sonandoBinaural, setSonandoBinaural] = useState(false);
  const [sonandoLluvia, setSonandoLluvia] = useState(false);
  const [showFreqs, setShowFreqs] = useState(false);
  const timerRef = useRef(null);
  const stopBinauralRef = useRef(null);
  const stopLluviaRef = useRef(null);

  const freq = FRECUENCIAS[freqSelec];

  // Limpiar al desmontar
  useEffect(() => () => {
    clearInterval(timerRef.current);
    stopBinauralRef.current?.();
    stopLluviaRef.current?.();
  }, []);

  const toggleBinaural = () => {
    if (sonandoBinaural) {
      stopBinauralRef.current?.();
      stopBinauralRef.current = null;
      setSonandoBinaural(false);
    } else {
      SoundEngine.playBowl(freq.hz, 3, 0.2);
      setTimeout(() => {
        const stop = SoundEngine.playBinaural(freq.hz, freq.beat, 300, 0.1);
        stopBinauralRef.current = stop;
      }, 1000);
      setSonandoBinaural(true);
    }
  };

  const toggleLluvia = () => {
    if (sonandoLluvia) {
      stopLluviaRef.current?.();
      stopLluviaRef.current = null;
      setSonandoLluvia(false);
    } else {
      const stop = SoundEngine.playRain(300, 0.09);
      stopLluviaRef.current = stop;
      setSonandoLluvia(true);
    }
  };

  const iniciar = () => {
    SoundEngine.ding(freq.hz);
    setActivo(true);
    timerRef.current = setInterval(() => {
      setSegundos(s => {
        if (s <= 1) {
          clearInterval(timerRef.current);
          SoundEngine.ding(528);
          if (paso < pasos.length - 1) {
            const next = paso + 1;
            setPaso(next);
            setSegundos(pasos[next].duracion);
            timerRef.current = null;
            setActivo(false);
          } else {
            setTerminado(true);
            setActivo(false);
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  };

  const avanzar = () => {
    clearInterval(timerRef.current);
    setActivo(false);
    SoundEngine.ding(440);
    if (paso < pasos.length - 1) {
      const next = paso + 1;
      setPaso(next);
      setSegundos(pasos[next].duracion);
    } else {
      setTerminado(true);
    }
  };

  const p = pasos[paso];
  const progPct = ((paso + (1 - segundos / p.duracion)) / pasos.length) * 100;

  if (showFreqs) return (
    <div>
      <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:20 }}>
        <button onClick={()=>setShowFreqs(false)} style={{ background:"none", border:"none", fontSize:18, cursor:"pointer", color:C.gris }}>←</button>
        <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, color:C.violeta, margin:0 }}>Elige tu frecuencia</h3>
      </div>
      <p style={{ fontSize:13, color:C.gris, lineHeight:1.6, margin:"0 0 16px" }}>Cada frecuencia resuena con un área de tu ser. La música activa el estado que deseas crear.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
        {FRECUENCIAS.map((f, i) => (
          <div key={i} onClick={() => { setFreqSelec(i); SoundEngine.playBowl(f.hz, 2.5, 0.18); setShowFreqs(false); }}
            style={{ background:freqSelec===i?f.color:"white", borderRadius:16, padding:"14px 16px", cursor:"pointer", border:`2px solid ${freqSelec===i?"rgba(91,45,142,0.4)":"rgba(91,45,142,0.08)"}`, transition:"all 0.2s", display:"flex", alignItems:"center", gap:14 }}>
            <div style={{ fontSize:28, flexShrink:0 }}>{f.emoji}</div>
            <div style={{ flex:1 }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                <span style={{ fontWeight:700, fontSize:15, color:C.carbon }}>{f.nombre}</span>
                {freqSelec===i && <span style={{ fontSize:10, background:C.violeta, color:"white", borderRadius:10, padding:"2px 8px" }}>Activa</span>}
              </div>
              <p style={{ fontSize:13, color:C.violeta, fontWeight:600, margin:"0 0 2px" }}>{f.subtitulo}</p>
              <p style={{ fontSize:12, color:C.gris, margin:0 }}>{f.descripcion}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (terminado) return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🌺</div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:24, color:C.violeta, margin:"0 0 10px" }}>Meditación completada</h3>
      <p style={{ fontFamily:"Georgia,serif", fontSize:17, fontStyle:"italic", color:C.carbon, lineHeight:1.6, marginBottom:20 }}>
        "Llevas esta calma contigo el resto del día. Eres luz."
      </p>
      <div style={{ background:C.violetaSuave, borderRadius:14, padding:"14px 16px", marginBottom:20 }}>
        <p style={{ fontSize:13, color:C.violeta, margin:0 }}>✨ +10 puntos · Meditación con {freq.nombre} completada</p>
      </div>
      <button onClick={() => { stopBinauralRef.current?.(); stopLluviaRef.current?.(); onComplete(); onClose(); }}
        style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
        Continuar mi día 💜
      </button>
    </div>
  );

  return (
    <div>
      {/* FRECUENCIA ACTIVA */}
      <div style={{ background:freq.color, borderRadius:16, padding:"12px 16px", marginBottom:16, display:"flex", alignItems:"center", justifyContent:"space-between", border:"1px solid rgba(91,45,142,0.12)", cursor:"pointer" }} onClick={()=>setShowFreqs(true)}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <span style={{ fontSize:22 }}>{freq.emoji}</span>
          <div>
            <p style={{ fontSize:13, fontWeight:700, color:C.carbon, margin:0 }}>{freq.nombre} · {freq.subtitulo}</p>
            <p style={{ fontSize:11, color:C.gris, margin:0 }}>Toca para cambiar frecuencia</p>
          </div>
        </div>
        <span style={{ color:C.gris, fontSize:16 }}>›</span>
      </div>

      {/* CONTROLES DE SONIDO */}
      <div style={{ display:"flex", gap:8, marginBottom:18 }}>
        <button onClick={toggleBinaural} style={{ flex:1, background:sonandoBinaural?C.violeta:"white", color:sonandoBinaural?"white":C.violeta, border:`1.5px solid ${sonandoBinaural?C.violeta:"rgba(91,45,142,0.25)"}`, borderRadius:50, padding:"10px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          {sonandoBinaural ? "🔊" : "🔈"} {sonandoBinaural ? "Frecuencia ON" : "Activar frecuencia"}
        </button>
        <button onClick={toggleLluvia} style={{ flex:1, background:sonandoLluvia?"rgba(76,175,128,0.15)":"white", color:sonandoLluvia?"#2E7D52":C.gris, border:`1.5px solid ${sonandoLluvia?"rgba(76,175,128,0.4)":"rgba(0,0,0,0.1)"}`, borderRadius:50, padding:"10px 14px", fontSize:13, cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:6 }}>
          {sonandoLluvia ? "🌧️" : "🌧️"} {sonandoLluvia ? "Lluvia ON" : "Lluvia suave"}
        </button>
      </div>

      {/* PROGRESS BAR */}
      <div style={{ height:4, background:"rgba(91,45,142,0.1)", borderRadius:10, marginBottom:18, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progPct}%`, background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`, borderRadius:10, transition:"width 0.5s" }} />
      </div>

      <p style={{ fontSize:11, color:C.gris, textTransform:"uppercase", letterSpacing:1, margin:"0 0 6px" }}>Paso {paso+1} de {pasos.length}</p>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:22, color:C.violeta, margin:"0 0 14px" }}>{p.icon} {p.titulo}</h3>
      <div style={{ background:`linear-gradient(135deg,#F5EEFF,#EDD9F7)`, borderRadius:18, padding:"20px 18px", marginBottom:18, border:`1px solid rgba(91,45,142,0.12)` }}>
        <p style={{ fontFamily:"Georgia,serif", fontSize:17, fontStyle:"italic", color:C.carbon, lineHeight:1.7, margin:0 }}>{p.instruccion}</p>
      </div>

      {/* TIMER */}
      <div style={{ textAlign:"center", marginBottom:16 }}>
        <div style={{ width:88, height:88, borderRadius:"50%", background:`linear-gradient(135deg,${C.violeta},${C.violetaClaro})`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 14px", boxShadow:`0 8px 30px rgba(91,45,142,0.3)${activo?",0 0 0 8px rgba(91,45,142,0.1)":""}`, transition:"box-shadow 0.5s" }}>
          <span style={{ fontSize:26, fontWeight:700, color:"white", lineHeight:1 }}>{segundos}</span>
          <span style={{ fontSize:10, color:"rgba(255,255,255,0.6)", textTransform:"uppercase", letterSpacing:1 }}>seg</span>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
          {!activo && (
            <button onClick={iniciar} style={{ background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"11px 26px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
              {paso===0 && segundos===p.duracion ? "▶ Comenzar" : "▶ Reanudar"}
            </button>
          )}
          {activo && (
            <button onClick={()=>{clearInterval(timerRef.current);setActivo(false);}} style={{ background:"none", border:`1px solid ${C.grisSuave}`, borderRadius:50, padding:"11px 22px", fontSize:14, cursor:"pointer", color:C.gris, fontFamily:"inherit" }}>⏸ Pausar</button>
          )}
          <button onClick={avanzar} style={{ background:"none", border:`1px solid rgba(91,45,142,0.25)`, borderRadius:50, padding:"11px 22px", fontSize:14, cursor:"pointer", color:C.violeta, fontFamily:"inherit" }}>
            {paso < pasos.length-1 ? "Siguiente →" : "Terminar ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DIARIO MODAL ───
function DiarioModal({ user, onClose, onComplete }) {
  const [entries, setEntries] = useState(["","",""]);
  const [saved, setSaved] = useState(false);

  const update = (i, val) => setEntries(e => e.map((v,j) => j===i ? val : v));

  const guardar = async () => {
    const entry = { date: new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"}), items: entries.filter(e=>e.trim()), ts: Date.now() };
    const prev = await storeGet(`diario:${user.email}`) || [];
    await storeSet(`diario:${user.email}`, [entry, ...prev.slice(0,29)]);
    setSaved(true);
  };

  const preguntas = [
    { q:"¿Qué te llenó de gratitud hoy?", placeholder:"Hoy agradezco...", emoji:"🙏" },
    { q:"¿Qué victoria celebras, por pequeña que sea?", placeholder:"Hoy logré...", emoji:"🏆" },
    { q:"¿Qué le dices a la mujer que serás mañana?", placeholder:"Mañana me propongo...", emoji:"🌺" },
  ];

  if (saved) return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:56, marginBottom:14 }}>✍️</div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:22, color:C.violeta, margin:"0 0 10px" }}>Guardado en tu diario 💜</h3>
      <p style={{ fontSize:14, color:C.gris, lineHeight:1.6, marginBottom:20 }}>Lo que escribes, lo afirmas. Lo que afirmas, lo creas.</p>
      <div style={{ background:C.violetaSuave, borderRadius:14, padding:"14px 16px", marginBottom:20 }}>
        <p style={{ fontSize:13, color:C.violeta, margin:0 }}>✨ +10 puntos · Diario completado</p>
      </div>
      <button onClick={()=>{onComplete();onClose();}} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>Continuar 💜</button>
    </div>
  );

  return (
    <div>
      <p style={{ fontSize:13, color:C.gris, lineHeight:1.5, margin:"0 0 20px" }}>Tómate 3 minutos. Lo que escribes hoy siembra lo que cosechas mañana.</p>
      <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
        {preguntas.map((p,i) => (
          <div key={i} style={{ background:i===0?"rgba(76,175,128,0.06)":i===1?"rgba(201,160,80,0.07)":"rgba(91,45,142,0.06)", borderRadius:16, padding:"16px 14px", border:`1.5px solid ${i===0?"rgba(76,175,128,0.2)":i===1?"rgba(201,160,80,0.25)":"rgba(91,45,142,0.15)"}` }}>
            <p style={{ fontSize:12, fontWeight:600, color:C.gris, textTransform:"uppercase", letterSpacing:0.8, margin:"0 0 8px" }}>{p.emoji} {p.q}</p>
            <textarea value={entries[i]} onChange={e=>update(i,e.target.value)} placeholder={p.placeholder} rows={2} style={{ width:"100%", border:"none", background:"transparent", outline:"none", fontSize:15, fontFamily:"Georgia,serif", fontStyle:"italic", color:C.carbon, resize:"none", lineHeight:1.6, boxSizing:"border-box" }} />
          </div>
        ))}
      </div>
      <button onClick={guardar} disabled={entries.every(e=>!e.trim())} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", marginTop:20, fontFamily:"inherit", opacity:entries.every(e=>!e.trim())?0.5:1 }}>
        Guardar en mi diario 💜
      </button>
    </div>
  );
}

// ─── MANIFESTACIONES MODAL (práctica diaria) ───
function AfirmacionesModal({ onClose, onComplete }) {
  const lista = [
    { texto:"No esperes el momento perfecto. Toma el momento y hazlo perfecto.", autor:"Tony Robbins" },
    { texto:"La acción es la cura fundamental para el miedo.", autor:"Tony Robbins" },
    { texto:"Lo que sientes es lo que atraes. Siente la prosperidad antes de tenerla.", autor:"Lain García Calvo" },
    { texto:"Siempre se gana o se aprende. Nunca se pierde.", autor:"Margarita Pasos" },
    { texto:"Tu mundo exterior es siempre un reflejo de tu mundo interior.", autor:"Brian Tracy" },
  ];
  const [idx, setIdx] = useState(0);
  const [fase, setFase] = useState("leer");
  const [cuenta, setCuenta] = useState(3);
  const [rep, setRep] = useState(0);
  const timerRef = useRef(null);

  const iniciarRepeticion = () => {
    setFase("repetir");
    setCuenta(3);
    setRep(0);
    let r = 0;
    timerRef.current = setInterval(() => {
      setCuenta(c => {
        if (c <= 1) {
          r++;
          setRep(r);
          if (r >= 3) {
            clearInterval(timerRef.current);
            if (idx < lista.length - 1) { setIdx(i=>i+1); setFase("leer"); }
            else setFase("completo");
          }
          return 3;
        }
        return c - 1;
      });
    }, 1000);
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

  const item = lista[idx];

  if (fase === "completo") return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:14 }}>🌟</div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:22, color:C.violeta, margin:"0 0 12px" }}>¡Manifestaste con tu voz!</h3>
      <p style={{ fontFamily:"Georgia,serif", fontSize:16, fontStyle:"italic", color:C.carbon, lineHeight:1.6, marginBottom:20 }}>
        "Tu voz es el instrumento más poderoso para programar tu mente. Lo que dices con emoción, lo creas."
      </p>
      <div style={{ background:C.violetaSuave, borderRadius:14, padding:"14px", marginBottom:20 }}>
        <p style={{ fontSize:13, color:C.violeta, margin:0 }}>✨ +10 puntos · Manifestaciones completadas</p>
      </div>
      <button onClick={()=>{onComplete();onClose();}} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>¡Lo manifesté! 💜</button>
    </div>
  );

  return (
    <div>
      <div style={{ height:4, background:"rgba(91,45,142,0.1)", borderRadius:10, marginBottom:20 }}>
        <div style={{ height:"100%", width:`${(idx/lista.length)*100}%`, background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`, borderRadius:10, transition:"width 0.5s" }} />
      </div>
      <p style={{ fontSize:11, color:C.gris, textTransform:"uppercase", letterSpacing:1, margin:"0 0 8px" }}>Manifestación {idx+1} de {lista.length}</p>

      <div style={{ background:`linear-gradient(135deg,${C.violeta},#2D1845)`, borderRadius:20, padding:"28px 22px", textAlign:"center", marginBottom:8 }}>
        <p style={{ fontFamily:"Georgia,serif", fontSize:19, fontStyle:"italic", color:"white", lineHeight:1.55, margin:"0 0 14px" }}>"{item.texto}"</p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 14px" }}>
          <span style={{ fontSize:12, color:C.dorado, fontWeight:600 }}>— {item.autor}</span>
        </div>
      </div>
      <p style={{ fontSize:11, color:C.gris, textAlign:"center", margin:"0 0 16px", fontStyle:"italic" }}>Haz tuya esta palabra. Siéntela. Créela.</p>

      {fase === "leer" && (
        <div>
          <div style={{ background:"rgba(201,160,80,0.1)", borderRadius:14, padding:"14px 16px", marginBottom:16, border:"1px solid rgba(201,160,80,0.25)" }}>
            <p style={{ fontSize:13, color:"#8B6020", margin:0, lineHeight:1.5 }}>
              🗣️ <strong>Di esta manifestación en voz alta 3 veces</strong>, con emoción, como si ya fuera tu verdad. La voz activa la mente. El sentimiento activa el universo.
            </p>
          </div>
          <button onClick={iniciarRepeticion} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
            ▶ Empezar repetición guiada
          </button>
        </div>
      )}

      {fase === "repetir" && (
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:14, color:C.gris, margin:"0 0 12px" }}>Di la manifestación con toda tu emoción:</p>
          <div style={{ display:"flex", gap:8, justifyContent:"center", marginBottom:16 }}>
            {[1,2,3].map(n => (
              <div key={n} style={{ width:40, height:40, borderRadius:"50%", background:rep>=n?C.violeta:"rgba(91,45,142,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, color:rep>=n?"white":C.gris, transition:"all 0.3s" }}>
                {rep>=n?"✓":n}
              </div>
            ))}
          </div>
          <div style={{ width:70, height:70, borderRadius:"50%", background:`linear-gradient(135deg,${C.dorado},#E8B050)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 12px", boxShadow:"0 6px 24px rgba(201,160,80,0.4)" }}>
            <span style={{ fontSize:28, fontWeight:700, color:C.carbon, lineHeight:1 }}>{cuenta}</span>
          </div>
          <p style={{ fontSize:13, color:C.gris }}>Repite {3-rep} vez{3-rep===1?"":"es"} más...</p>
        </div>
      )}
    </div>
  );
}

// ─── VISUALIZACIÓN MODAL ───
function VisualizacionModal({ user, onClose, onComplete }) {
  const escenas = [
    { emoji:"🌅", titulo:"Tu mañana perfecta", texto:"Imagínate despertando sin alarma. Con calma. Tu cuerpo descansado. Entras a tu cocina y todo está en paz. Tienes tiempo. Tienes presencia. Estás donde quieres estar.", color:"linear-gradient(135deg,#FFF8E1,#FFE0B2)" },
    { emoji:"💼", titulo:"Tu negocio floreciendo", texto:"Ves tu teléfono. Hay mensajes de clientes agradecidas. Hay transferencias en tu cuenta. Tu trabajo ayuda a personas reales. Lo que haces importa. Lo que ganas es tuyo.", color:"linear-gradient(135deg,#E8EAF6,#D1C4E9)" },
    { emoji:"👨‍👧‍👦", titulo:"Presente con los tuyos", texto:"Estás con tu familia. Pero esta vez, sin estrés económico. Sin la cabeza en otro lado. Ríes. Abrazas. Dices 'sí' a los planes sin mirar el saldo. Eres libre para estar aquí.", color:"linear-gradient(135deg,#E8F5E9,#C8E6C9)" },
    { emoji:"🌺", titulo:"La versión de ti que ya eres", texto:"Esa mujer que veías solo en sueños... eres tú. No es el futuro, es el camino que ya empezaste hoy. Cada práctica, cada acción, cada día te acerca más a ella. Siéntela. Ella ya existe.", color:"linear-gradient(135deg,#FCE4EC,#F8BBD9)" },
  ];
  const [idx, setIdx] = useState(0);
  const [texto, setTexto] = useState("");
  const [fase, setFase] = useState("escena"); // escena | escribir | completo
  const [aiVision, setAiVision] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);

  const generarVision = async () => {
    setLoadingAi(true);
    setAiVision(""); // clear previous vision
    const hora = new Date().toLocaleTimeString("es-ES");
    const enfoques = [
      "Enfócate en los sentidos: qué ves, qué hueles, qué escuchas en esa vida.",
      "Enfócate en las emociones: cómo te sientes en tu cuerpo al vivir eso.",
      "Enfócate en los detalles cotidianos de ese día perfecto.",
      "Enfócate en el impacto que tienes en las personas que amas.",
      "Enfócate en tu sensación de libertad, de haberlo logrado.",
    ];
    const enfoque = enfoques[Math.floor(Math.random() * enfoques.length)];
    const res = await fetch("/api/claude", {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model:"claude-sonnet-4-6", max_tokens:1000,
        messages:[{ role:"user", content:`Eres una guía de visualización creativa para mujeres emprendedoras hispanohablantes. Hora actual: ${hora}.

La usuaria describió su vida ideal así: "${texto}"

Genera una visualización guiada ÚNICA y DIFERENTE cada vez. ${enfoque}

Reglas:
- 3-4 frases en segunda persona (tú), tiempo presente
- Muy emotiva, sensorial y específica basada en lo que escribió
- Diferente a cualquier visualización genérica
- Solo el texto de la visualización, sin introducción ni explicación` }]
      })
    });
    const data = await res.json();
    setAiVision(data.content?.[0]?.text?.trim() || "Esa vida que describes ya está en camino. La sientes porque la mereces. Cada día que practicas la acercas más.");
    setLoadingAi(false);
  };

  if (fase === "completo") return (
    <div style={{ textAlign:"center" }}>
      <div style={{ fontSize:60, marginBottom:14 }}>🎯</div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:22, color:C.violeta, margin:"0 0 12px" }}>Tu visión está sembrada 💜</h3>
      {aiVision && <div style={{ background:C.violetaSuave, borderRadius:16, padding:"18px 16px", marginBottom:20, textAlign:"left" }}>
        <p style={{ fontSize:12, color:C.violeta, fontWeight:600, margin:"0 0 8px" }}>🌺 Tu visualización personalizada:</p>
        <p style={{ fontFamily:"Georgia,serif", fontSize:16, fontStyle:"italic", color:C.carbon, lineHeight:1.7, margin:0 }}>{aiVision}</p>
      </div>}
      <div style={{ background:"rgba(201,160,80,0.1)", borderRadius:14, padding:"14px", marginBottom:20 }}>
        <p style={{ fontSize:13, color:"#8B6020", margin:0 }}>✨ +10 puntos · Visualización completada</p>
      </div>
      <button onClick={()=>{onComplete();onClose();}} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>Llevar esta visión conmigo 💜</button>
    </div>
  );

  if (fase === "escribir") return (
    <div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, color:C.violeta, margin:"0 0 10px" }}>✍️ Describe tu vida ideal</h3>
      <p style={{ fontSize:13, color:C.gris, lineHeight:1.6, margin:"0 0 14px" }}>¿Cómo es el día perfecto en la vida que quieres? ¿Qué haces? ¿Con quién estás? ¿Cómo te sientes? Escribe sin filtros.</p>
      <textarea value={texto} onChange={e=>setTexto(e.target.value)} placeholder="En mi vida ideal me despierto... tengo... hago... siento..." rows={5} style={{ width:"100%", border:`1.5px solid rgba(91,45,142,0.2)`, borderRadius:16, padding:"14px 16px", outline:"none", fontSize:15, fontFamily:"Georgia,serif", fontStyle:"italic", color:C.carbon, resize:"none", lineHeight:1.6, background:C.crema, boxSizing:"border-box" }} />
      <button onClick={generarVision} disabled={!texto.trim()||loadingAi} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:(!texto.trim()||loadingAi)?"not-allowed":"pointer", marginTop:14, fontFamily:"inherit", opacity:(!texto.trim()||loadingAi)?0.6:1 }}>
        {loadingAi ? "✨ Creando tu visualización con IA..." : "Crear mi visualización con IA 🎯"}
      </button>
      {aiVision && !loadingAi && (
        <div>
          <div style={{ background:C.violetaSuave, borderRadius:16, padding:"18px 16px", marginTop:16, marginBottom:12 }}>
            <p style={{ fontSize:12, color:C.violeta, fontWeight:600, margin:"0 0 8px" }}>🌺 Tu visualización:</p>
            <p style={{ fontFamily:"Georgia,serif", fontSize:16, fontStyle:"italic", color:C.carbon, lineHeight:1.7, margin:0 }}>{aiVision}</p>
          </div>
          <div style={{ display:"flex", gap:10 }}>
            <button onClick={generarVision} style={{ flex:1, background:"none", border:`1px solid rgba(91,45,142,0.25)`, borderRadius:50, padding:"11px", fontSize:13, cursor:"pointer", color:C.violeta, fontFamily:"inherit" }}>
              🔀 Generar otra
            </button>
            <button onClick={()=>setFase("completo")} style={{ flex:1, background:C.dorado, color:C.carbon, border:"none", borderRadius:50, padding:"11px", fontSize:13, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>
              Esta es mi visión ✓
            </button>
          </div>
        </div>
      )}
    </div>
  );

  const e = escenas[idx];
  return (
    <div>
      <div style={{ height:4, background:"rgba(91,45,142,0.1)", borderRadius:10, marginBottom:20 }}>
        <div style={{ height:"100%", width:`${((idx)/escenas.length)*100}%`, background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`, borderRadius:10, transition:"width 0.5s" }} />
      </div>
      <p style={{ fontSize:11, color:C.gris, textTransform:"uppercase", letterSpacing:1, margin:"0 0 6px" }}>Escena {idx+1} de {escenas.length}</p>
      <div style={{ background:e.color, borderRadius:20, padding:"26px 20px", marginBottom:18, textAlign:"center" }}>
        <div style={{ fontSize:48, marginBottom:12 }}>{e.emoji}</div>
        <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, color:C.carbon, margin:"0 0 14px", fontWeight:400 }}>{e.titulo}</h3>
        <p style={{ fontFamily:"Georgia,serif", fontSize:16, fontStyle:"italic", color:"#3A3040", lineHeight:1.7, margin:0 }}>{e.texto}</p>
      </div>
      <p style={{ fontSize:12, color:C.gris, textAlign:"center", margin:"0 0 14px", fontStyle:"italic" }}>🌬️ Respira. Cierra los ojos. Siente esto como real.</p>
      <div style={{ display:"flex", gap:10 }}>
        {idx < escenas.length - 1 ? (
          <button onClick={()=>setIdx(i=>i+1)} style={{ flex:1, background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Siguiente escena →</button>
        ) : (
          <button onClick={()=>setFase("escribir")} style={{ flex:1, background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"13px", fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>Crear mi visión personal ✍️</button>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: HOME
// ═══════════════════════════════════════
function HomeScreen({ user, onUpdate, showToast, onOpenModal }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Buenos días" : hour < 18 ? "Buenas tardes" : "Buenas noches";
  const [todayAff, setTodayAff] = useState("");
  const [loadingAff, setLoadingAff] = useState(true);
  const [activePractice, setActivePractice] = useState(null);
  const affHistoryRef = useRef([]);

  const practices = [
    { icon:"🧘‍♀️", bg:"rgba(91,45,142,0.1)", name:"Meditación de Apertura", desc:"Guiada paso a paso. 5 minutos que transforman tu día.", time:"5 min", key:"meditacion" },
    { icon:"✍️", bg:"rgba(201,160,80,0.15)", name:"Diario de Gratitud", desc:"3 preguntas que siembran abundancia. Escribe y libera.", time:"3 min", key:"gratitud" },
    { icon:"🌟", bg:"rgba(232,160,192,0.25)", name:"Manifestaciones en Voz Alta", desc:"Frases de tus mentores. Tu voz activa lo que manifiestas.", time:"5 min", key:"afirmaciones" },
    { icon:"🎯", bg:"rgba(76,175,128,0.12)", name:"Visualización", desc:"Escenas + crea tu visión personal con IA. Siéntela real.", time:"7 min", key:"visualizacion" },
  ];

  const awardPoints = async () => {
    const updated = { ...user, lastPractice: Date.now(), points: (user.points||0) + 10 };
    const today = new Date().toDateString();
    if (!user.lastPractice || new Date(user.lastPractice).toDateString() !== today) {
      updated.streak = (user.streak || 0) + 1;
    }
    if (updated.streak >= 21) updated.level = "Mariposa 🦋";
    else if (updated.streak >= 7) updated.level = "Brote 🌿";
    else if (updated.streak >= 3) updated.level = "Flor 🌺";
    await storeSet(`user:${user.email}`, updated);
    onUpdate(updated);
    showToast("✨ +10 puntos ganados");
  };

  const refreshAff = async () => {
    setLoadingAff(true);
    let aff = "";
    let intentos = 0;
    // Try up to 3 times to get something different from the last one shown
    do {
      aff = await generateAffirmation("general", affHistoryRef.current);
      intentos++;
    } while (affHistoryRef.current.includes(aff) && intentos < 3);
    affHistoryRef.current = [aff, ...affHistoryRef.current].slice(0, 5);
    setTodayAff(aff);
    setLoadingAff(false);
  };

  useEffect(() => { refreshAff(); }, []);

  // Full-screen practice overlay
  if (activePractice) return (
    <div style={{ position:"fixed", inset:0, background:C.crema, zIndex:200, overflowY:"auto", padding:"0 0 40px" }}>
      <div style={{ background:C.blanco, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid rgba(91,45,142,0.08)`, position:"sticky", top:0, zIndex:10 }}>
        <button onClick={()=>setActivePractice(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.gris, padding:0 }}>←</button>
        <span style={{ fontFamily:"Georgia,serif", fontSize:18, color:C.violeta }}>{practices.find(p=>p.key===activePractice)?.name}</span>
      </div>
      <div style={{ padding:"24px 20px" }}>
        {activePractice==="meditacion" && <MeditacionModal onClose={()=>setActivePractice(null)} onComplete={awardPoints}/>}
        {activePractice==="gratitud" && <DiarioModal user={user} onClose={()=>setActivePractice(null)} onComplete={awardPoints}/>}
        {activePractice==="afirmaciones" && <AfirmacionesModal onClose={()=>setActivePractice(null)} onComplete={awardPoints}/>}
        {activePractice==="visualizacion" && <VisualizacionModal user={user} onClose={()=>setActivePractice(null)} onComplete={awardPoints}/>}
      </div>
    </div>
  );

  const levelColor = { "Semilla 🌱":"#4CAF80","Flor 🌺":C.rosa,"Brote 🌿":"#8BC34A","Mariposa 🦋":C.violetaClaro };

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      {/* GREETING CARD */}
      <div style={{ background:`linear-gradient(135deg,${C.violeta} 0%,#2D1845 100%)`,borderRadius:24,padding:"28px 24px",color:"white",marginBottom:24,position:"relative",overflow:"hidden" }}>
        <div style={{ position:"absolute",right:-15,top:-15,fontSize:90,opacity:0.08,userSelect:"none" }}>✨</div>
        <p style={{ fontSize:11,color:C.dorado,letterSpacing:2,textTransform:"uppercase",margin:"0 0 6px" }}>{greeting}</p>
        <h2 style={{ fontFamily:"Georgia,serif",fontSize:28,fontWeight:300,margin:"0 0 14px" }}>{user.name} 💜</h2>
        <div style={{ fontFamily:"Georgia,serif",fontSize:16,fontStyle:"italic",color:"rgba(255,255,255,0.82)",lineHeight:1.5,borderLeft:`2px solid ${C.dorado}`,paddingLeft:14,marginBottom:18,cursor:loadingAff?"not-allowed":"pointer" }} onClick={!loadingAff?refreshAff:undefined}>
          {loadingAff ? "Generando tu afirmación del día..." : todayAff}
          {!loadingAff && <span style={{ fontSize:10,display:"block",color:"rgba(255,255,255,0.35)",marginTop:4 }}>Toca para renovar ↻</span>}
        </div>
        <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
          <span style={{ background:"rgba(201,160,80,0.22)",border:`1px solid ${C.dorado}`,borderRadius:20,padding:"4px 12px",fontSize:12,color:C.dorado }}>🔥 {user.streak||0} días</span>
          <span style={{ background:"rgba(201,160,80,0.22)",border:`1px solid ${C.dorado}`,borderRadius:20,padding:"4px 12px",fontSize:12,color:C.dorado }}>⭐ {user.points||0} puntos</span>
          <span style={{ background:"rgba(255,255,255,0.1)",borderRadius:20,padding:"4px 12px",fontSize:12,color:"rgba(255,255,255,0.7)" }}>{user.level||"Semilla 🌱"}</span>
        </div>
      </div>

      <h3 style={{ fontFamily:"Georgia,serif",fontSize:20,margin:"0 0 14px",fontWeight:400 }}>Tu práctica de hoy</h3>
      <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:28 }}>
        {practices.map(p => (
          <div key={p.key} onClick={()=>setActivePractice(p.key)} style={{ background:C.blanco,borderRadius:18,padding:"18px 16px",display:"flex",alignItems:"center",gap:14,boxShadow:"0 2px 14px rgba(0,0,0,0.05)",cursor:"pointer",border:"1.5px solid transparent",transition:"all 0.15s" }}>
            <div style={{ width:50,height:50,borderRadius:13,background:p.bg,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>{p.icon}</div>
            <div style={{ flex:1 }}>
              <p style={{ fontWeight:600,fontSize:14,margin:"0 0 3px",color:C.carbon }}>{p.name}</p>
              <p style={{ fontSize:12,color:C.gris,margin:"0 0 4px",lineHeight:1.4 }}>{p.desc}</p>
              <p style={{ fontSize:11,color:C.violetaClaro,margin:0,fontWeight:500 }}>⏱ {p.time}</p>
            </div>
            <span style={{ color:C.grisSuave,fontSize:20 }}>›</span>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily:"Georgia,serif",fontSize:20,margin:"0 0 12px",fontWeight:400 }}>Frase de mentores</h3>
      <div style={{ background:C.blanco,borderRadius:16,padding:"16px 18px",border:`1px solid ${C.violetaSuave}`,cursor:"pointer" }} onClick={()=>onOpenModal({ title:"Tony Robbins", content:<p style={{ fontFamily:"Georgia,serif",fontSize:20,fontStyle:"italic",color:C.violeta,lineHeight:1.5 }}>"No esperes el momento perfecto. Toma el momento y hazlo perfecto."</p> })}>
        <p style={{ fontFamily:"Georgia,serif",fontSize:16,fontStyle:"italic",color:C.carbon,lineHeight:1.45,margin:"0 0 6px",paddingRight:28,position:"relative" }}>
          "No esperes el momento perfecto. Toma el momento y hazlo perfecto."
          <span style={{ position:"absolute",right:0,top:0 }}>💜</span>
        </p>
        <p style={{ fontSize:11,color:C.gris,margin:0,textTransform:"uppercase",letterSpacing:1 }}>Tony Robbins</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: MANIFESTACIONES POR ÁMBITO
// ═══════════════════════════════════════

// ─── ABUNDANCIA — sección destacada propia ───
const ABUNDANCIA = {
  key:"abundancia", label:"Abundancia", emoji:"💰", hz:639, freqIdx:3,
  color:"linear-gradient(135deg,#FFF8E1,#FFE082)", borderColor:"rgba(255,160,0,0.3)",
  mentor:"Lain García Calvo · Brian Tracy · Margarita Pasos",
  descripcion:"El dinero es energía. Vibra en la frecuencia de la prosperidad.",
  afirmaciones:[
    { texto:"La abundancia no es algo que obtienes, es algo con lo que te sintonizas.", autor:"Lain García Calvo" },
    { texto:"Lo que sientes es lo que atraes. Siente la prosperidad antes de tenerla.", autor:"Lain García Calvo" },
    { texto:"El dinero es solo un resultado. La riqueza se construye primero en la mente.", autor:"Lain García Calvo" },
    { texto:"No puedes atraer lo que deseas si vibras en la frecuencia de la carencia.", autor:"Lain García Calvo" },
    { texto:"Mereces ser próspera. La culpa sobre el dinero es la mayor barrera para recibirlo.", autor:"Lain García Calvo" },
    { texto:"Tu mundo exterior es siempre un reflejo de tu mundo interior.", autor:"Brian Tracy" },
    { texto:"Las personas exitosas tienen el hábito de hacer las cosas que a los fracasados no les gusta hacer.", autor:"Brian Tracy" },
    { texto:"Siempre se gana o se aprende. El dinero perdido es una lección, nunca una derrota final.", autor:"Margarita Pasos" },
  ]
};

const AMBITOS = [
  {
    key:"mentalidad", label:"Mentalidad", emoji:"🧠", hz:528, freqIdx:2,
    color:"linear-gradient(135deg,#F3E5F5,#CE93D8)", borderColor:"rgba(156,39,176,0.25)",
    mentor:"Brian Tracy · Lain García Calvo",
    descripcion:"Reprograma tu mente. Tus pensamientos crean tu realidad.",
    afirmaciones:[
      { texto:"Todo lo que has logrado hasta ahora es el resultado de tus hábitos de pensamiento.", autor:"Brian Tracy" },
      { texto:"Puedes controlar solo una cosa en el universo: tus propios pensamientos.", autor:"Brian Tracy" },
      { texto:"Tu mundo exterior es siempre un reflejo de tu mundo interior.", autor:"Brian Tracy" },
      { texto:"Lo que piensas de manera habitual se convierte en tu experiencia habitual.", autor:"Lain García Calvo" },
      { texto:"El subconsciente no distingue entre lo real y lo imaginado. Úsalo a tu favor.", autor:"Lain García Calvo" },
    ]
  },
  {
    key:"negocio", label:"Negocio", emoji:"💼", hz:741, freqIdx:4,
    color:"linear-gradient(135deg,#E8EAF6,#9FA8DA)", borderColor:"rgba(63,81,181,0.25)",
    mentor:"Margarita Pasos · Tony Robbins",
    descripcion:"Tu negocio es un acto de servicio. Tú mereces prosperidad.",
    afirmaciones:[
      { texto:"Si esperas a que todo esté perfecto para actuar, nunca actuarás. El momento es ahora.", autor:"Margarita Pasos" },
      { texto:"El éxito no es un accidente. Es trabajo duro, perseverancia, aprendizaje y sacrificio.", autor:"Margarita Pasos" },
      { texto:"La única forma de hacer un gran trabajo es amar lo que haces.", autor:"Tony Robbins" },
      { texto:"No hay que esperar las circunstancias perfectas. Hay que crear las circunstancias.", autor:"Tony Robbins" },
      { texto:"El éxito en los negocios requiere entrenamiento, disciplina y trabajo duro.", autor:"Brian Tracy" },
    ]
  },
  {
    key:"familia", label:"Familia", emoji:"👨‍👧", hz:396, freqIdx:0,
    color:"linear-gradient(135deg,#E8F5E9,#A5D6A7)", borderColor:"rgba(76,175,80,0.25)",
    mentor:"Otilia Bernal · Margarita Pasos",
    descripcion:"Ser libre es también poder estar presente para los que amas.",
    afirmaciones:[
      { texto:"Una madre en paz consigo misma es la mayor herencia que puede dejar a sus hijos.", autor:"Otilia Bernal" },
      { texto:"No puedes dar lo que no tienes. Cuídate primero para poder cuidar con amor.", autor:"Otilia Bernal" },
      { texto:"Tus hijos no necesitan una madre perfecta. Necesitan una madre presente y auténtica.", autor:"Otilia Bernal" },
      { texto:"Construir tu libertad no es abandonar tu familia. Es darles una mejor versión de ti.", autor:"Margarita Pasos" },
      { texto:"El mejor regalo que le puedes dar a tu familia es trabajar en tu bienestar.", autor:"Tony Robbins" },
    ]
  },
  {
    key:"accion", label:"Acción", emoji:"⚡", hz:741, freqIdx:4,
    color:"linear-gradient(135deg,#FFF3E0,#FFCC80)", borderColor:"rgba(255,152,0,0.3)",
    mentor:"Tony Robbins · Margarita Pasos",
    descripcion:"El miedo no desaparece. Se actúa con él puesto.",
    afirmaciones:[
      { texto:"No esperes el momento perfecto. Toma el momento y hazlo perfecto.", autor:"Tony Robbins" },
      { texto:"La acción es la cura fundamental para el miedo.", autor:"Tony Robbins" },
      { texto:"Las personas de éxito hacen lo que los que fracasan no están dispuestos a hacer.", autor:"Tony Robbins" },
      { texto:"Siempre se gana o se aprende. Nunca se pierde.", autor:"Margarita Pasos" },
      { texto:"El único fracaso real es no intentarlo. Todo lo demás es aprendizaje.", autor:"Margarita Pasos" },
    ]
  },
  {
    key:"libertad", label:"Libertad", emoji:"🌺", hz:852, freqIdx:5,
    color:"linear-gradient(135deg,#FCE4EC,#F48FB1)", borderColor:"rgba(233,30,99,0.2)",
    mentor:"Tony Robbins · Margarita Pasos · Otilia Bernal",
    descripcion:"La libertad no se espera. Se construye cada día con cada acción.",
    afirmaciones:[
      { texto:"La libertad no es un destino. Es una decisión que tomas cada mañana.", autor:"Tony Robbins" },
      { texto:"El mayor poder que tienes es el poder de elegir tus propios pensamientos.", autor:"Brian Tracy" },
      { texto:"Tu vida no mejora por azar. Mejora cuando tú decides cambiar.", autor:"Tony Robbins" },
      { texto:"Emprender es el camino más honesto hacia la libertad que te mereces.", autor:"Margarita Pasos" },
      { texto:"Decide hoy quién vas a ser. El futuro se construye en las decisiones de hoy.", autor:"Otilia Bernal" },
    ]
  },
];

// ── Componente de práctica por ámbito (pantalla completa) ──
function AmbitoPractice({ ambito, onBack, showToast }) {
  const [fase, setFase] = useState("intro"); // intro | practica | completo
  const [affIdx, setAffIdx] = useState(0);
  const [repCount, setRepCount] = useState(0);
  const [cuenta, setCuenta] = useState(4);
  const [sonando, setSonando] = useState(false);
  const [aiAff, setAiAff] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [fade, setFade] = useState(true);
  const timerRef = useRef(null);
  const stopSoundRef = useRef(null);

  useEffect(() => () => { clearInterval(timerRef.current); stopSoundRef.current?.(); }, []);

  const toggleSonido = () => {
    if (sonando) {
      stopSoundRef.current?.();
      stopSoundRef.current = null;
      setSonando(false);
    } else {
      SoundEngine.playBowl(ambito.hz, 3, 0.22);
      setTimeout(() => {
        const freq = FRECUENCIAS[ambito.freqIdx];
        const stop = SoundEngine.playBinaural(ambito.hz, freq.beat, 600, 0.1);
        stopSoundRef.current = stop;
      }, 800);
      setSonando(true);
    }
  };

  const iniciarRepeticion = () => {
    setRepCount(0);
    setCuenta(4);
    let rep = 0;
    timerRef.current = setInterval(() => {
      setCuenta(c => {
        if (c <= 1) {
          rep++;
          setRepCount(rep);
          if (rep >= 3) {
            clearInterval(timerRef.current);
            SoundEngine.ding(528);
            if (affIdx < ambito.afirmaciones.length - 1) {
              setTimeout(() => {
                setFade(false);
                setTimeout(() => { setAffIdx(i => i+1); setRepCount(0); setCuenta(4); setFade(true); }, 220);
              }, 600);
            } else {
              setTimeout(() => setFase("completo"), 800);
            }
          }
          return 4;
        }
        return c - 1;
      });
    }, 1000);
  };

  const generarAiAff = async () => {
    setLoadingAi(true);
    setAiAff(""); // clear previous results
    const temas = { mentalidad:"reprogramación mental y autoconfianza femenina", negocio:"emprendimiento femenino y éxito empresarial", abundancia:"prosperidad y abundancia económica", familia:"maternidad consciente y familia libre", accion:"tomar acción con valentía a pesar del miedo", libertad:"libertad financiera y de tiempo para mujeres emprendedoras" };
    const mentores = ["Brian Tracy", "Tony Robbins", "Lain García Calvo", "Margarita Pasos", "Otilia Bernal"];
    const mentorElegido = mentores[Math.floor(Math.random() * mentores.length)];
    const sello = Math.random().toString(36).substring(2, 8);
    const res = await fetch("/api/claude", {
      method:"POST", headers:{"Content-Type":"application/json"},
      body: JSON.stringify({ model:"claude-sonnet-4-6", max_tokens:1000, messages:[{ role:"user", content:`[id:${sello}] Genera 3 manifestaciones poderosas y ORIGINALES en español sobre: ${temas[ambito.key]||"libertad femenina"}.

Inspírate especialmente en el estilo de ${mentorElegido} para esta tanda.

Reglas:
- Frases cortas, directas, en segunda persona (tú), muy emotivas
- Deben ser frescas y distintas de frases genéricas comunes
- Sin numeración, una por línea, sin comillas, sin explicaciones` }] })
    });
    const data = await res.json();
    setAiAff(data.content?.[0]?.text?.trim() || "");
    setLoadingAi(false);
  };

  const aff = ambito.afirmaciones[affIdx];
  const freq = FRECUENCIAS[ambito.freqIdx];
  const progPct = ((affIdx + (repCount >= 3 ? 1 : repCount/3)) / ambito.afirmaciones.length) * 100;

  if (fase === "completo") return (
    <div style={{ textAlign:"center", padding:"20px 0" }}>
      <div style={{ fontSize:64, marginBottom:16 }}>🌺</div>
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:24, color:C.violeta, margin:"0 0 10px" }}>¡Manifestaste! {ambito.emoji}</h3>
      <div style={{ background:`linear-gradient(135deg,${C.violeta},#2D1845)`, borderRadius:18, padding:"22px 20px", textAlign:"center", marginBottom:16 }}>
        <p style={{ fontFamily:"Georgia,serif", fontSize:18, fontStyle:"italic", color:"white", lineHeight:1.55, margin:"0 0 10px" }}>"{ambito.afirmaciones[ambito.afirmaciones.length-1].texto}"</p>
        <p style={{ fontSize:12, color:C.dorado, margin:0 }}>— {ambito.afirmaciones[ambito.afirmaciones.length-1].autor}</p>
      </div>
      <p style={{ fontSize:13, color:C.gris, marginBottom:24 }}>Repetiste {ambito.afirmaciones.length * 3} palabras de poder con {freq.nombre}. Tu mente lo ha registrado.</p>
      <div style={{ background:C.violetaSuave, borderRadius:14, padding:"14px", marginBottom:20 }}>
        <p style={{ fontSize:13, color:C.violeta, margin:0 }}>✨ Manifestación de {ambito.label} completada</p>
      </div>
      <button onClick={onBack} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
        Volver a mis manifestaciones 💜
      </button>
    </div>
  );

  if (fase === "intro") return (
    <div>
      {/* FRECUENCIA */}
      <div style={{ background:freq.color, borderRadius:16, padding:"16px", marginBottom:18, textAlign:"center", border:`1px solid rgba(91,45,142,0.12)` }}>
        <div style={{ fontSize:32, marginBottom:6 }}>{freq.emoji}</div>
        <p style={{ fontWeight:700, fontSize:16, color:C.carbon, margin:"0 0 2px" }}>{freq.nombre} Hz</p>
        <p style={{ fontSize:13, color:C.violeta, margin:"0 0 4px" }}>{freq.subtitulo}</p>
        <p style={{ fontSize:12, color:C.gris, margin:0 }}>{freq.descripcion}</p>
      </div>

      <div style={{ background:ambito.color, borderRadius:18, padding:"22px 20px", marginBottom:18, border:`1.5px solid ${ambito.borderColor}` }}>
        <div style={{ fontSize:40, marginBottom:10, textAlign:"center" }}>{ambito.emoji}</div>
        <h3 style={{ fontFamily:"Georgia,serif", fontSize:22, color:C.carbon, margin:"0 0 8px", textAlign:"center" }}>{ambito.label}</h3>
        <p style={{ fontSize:14, color:"#3A3040", textAlign:"center", margin:"0 0 16px", lineHeight:1.5 }}>{ambito.descripcion}</p>
        <p style={{ fontSize:11, color:C.gris, textAlign:"center", margin:0, textTransform:"uppercase", letterSpacing:1 }}>Mentores: {ambito.mentor}</p>
      </div>

      {/* PREVIEW DE FRASES */}
      <div style={{ background:C.blanco, borderRadius:16, padding:"16px", marginBottom:18, border:"1px solid rgba(91,45,142,0.08)" }}>
        <p style={{ fontSize:12, fontWeight:700, color:C.gris, textTransform:"uppercase", letterSpacing:1, margin:"0 0 12px" }}>Palabras de tus mentores</p>
        {ambito.afirmaciones.slice(0,2).map((a,i)=>(
          <div key={i} style={{ marginBottom:10, paddingBottom:10, borderBottom:i<1?`1px solid rgba(91,45,142,0.06)`:"none" }}>
            <p style={{ fontFamily:"Georgia,serif", fontSize:14, fontStyle:"italic", color:C.carbon, lineHeight:1.5, margin:"0 0 4px" }}>"{a.texto}"</p>
            <p style={{ fontSize:11, color:C.dorado, margin:0, fontWeight:600 }}>— {a.autor}</p>
          </div>
        ))}
        <p style={{ fontSize:12, color:C.gris, margin:"4px 0 0", fontStyle:"italic" }}>+ {ambito.afirmaciones.length - 2} frases más...</p>
      </div>

      <div style={{ background:"rgba(201,160,80,0.08)", borderRadius:14, padding:"14px 16px", marginBottom:18, border:"1px solid rgba(201,160,80,0.25)" }}>
        <p style={{ fontSize:13, color:"#8B6020", margin:0, lineHeight:1.6 }}>
          🎵 Activa {freq.nombre} · Cierra los ojos · Di cada frase <strong>3 veces en voz alta con emoción</strong>. Son {ambito.afirmaciones.length} manifestaciones de tus mentores. La emoción es la clave.
        </p>
      </div>

      <button onClick={()=>{ toggleSonido(); setFase("practica"); }} style={{ width:"100%", background:`linear-gradient(135deg,${C.violeta},${C.violetaClaro})`, color:"white", border:"none", borderRadius:50, padding:"15px", fontSize:15, cursor:"pointer", fontFamily:"inherit", marginBottom:10 }}>
        🎵 Comenzar con {freq.nombre}
      </button>
      <button onClick={()=>setFase("practica")} style={{ width:"100%", background:"none", border:`1px solid rgba(91,45,142,0.2)`, borderRadius:50, padding:"13px", fontSize:14, cursor:"pointer", color:C.violeta, fontFamily:"inherit" }}>
        Comenzar sin sonido
      </button>
    </div>
  );

  // FASE PRÁCTICA
  return (
    <div>
      {/* BARRA DE PROGRESO */}
      <div style={{ height:5, background:"rgba(91,45,142,0.1)", borderRadius:10, marginBottom:16, overflow:"hidden" }}>
        <div style={{ height:"100%", width:`${progPct}%`, background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`, borderRadius:10, transition:"width 0.5s" }}/>
      </div>
      <p style={{ fontSize:11, color:C.gris, textTransform:"uppercase", letterSpacing:1, margin:"0 0 4px" }}>
        {ambito.emoji} {ambito.label} · Frase {affIdx+1} de {ambito.afirmaciones.length}
      </p>

      {/* CONTROL SONIDO */}
      <button onClick={toggleSonido} style={{ background:sonando?C.violeta:"white", color:sonando?"white":C.violeta, border:`1.5px solid ${sonando?C.violeta:"rgba(91,45,142,0.25)"}`, borderRadius:50, padding:"8px 16px", fontSize:12, cursor:"pointer", fontFamily:"inherit", marginBottom:16, display:"flex", alignItems:"center", gap:6 }}>
        {sonando ? "🔊" : "🔈"} {sonando ? `${freq.nombre} ON` : `Activar ${freq.nombre}`}
      </button>

      {/* FRASE DEL MENTOR */}
      <div style={{ background:`linear-gradient(135deg,${C.violeta},#2D1845)`, borderRadius:20, padding:"28px 22px", textAlign:"center", marginBottom:8, opacity:fade?1:0, transition:"opacity 0.2s" }}>
        <p style={{ fontFamily:"Georgia,serif", fontSize:20, fontStyle:"italic", color:"white", lineHeight:1.55, margin:"0 0 14px" }}>"{aff.texto}"</p>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 14px" }}>
          <span style={{ fontSize:14 }}>✨</span>
          <span style={{ fontSize:12, color:C.dorado, fontWeight:600 }}>— {aff.autor}</span>
        </div>
      </div>
      <p style={{ fontSize:11, color:C.gris, textAlign:"center", margin:"0 0 16px", fontStyle:"italic" }}>Haz tuya esta palabra. Siéntela. Créela.</p>

      {/* REPETICIÓN GUIADA */}
      {repCount < 3 && timerRef.current ? (
        <div style={{ textAlign:"center" }}>
          <p style={{ fontSize:13, color:C.gris, margin:"0 0 12px" }}>Di esta frase con toda tu emoción:</p>
          <div style={{ display:"flex", gap:10, justifyContent:"center", marginBottom:14 }}>
            {[1,2,3].map(n=>(
              <div key={n} style={{ width:42, height:42, borderRadius:"50%", background:repCount>=n?C.violeta:"rgba(91,45,142,0.1)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:repCount>=n?"white":C.gris, transition:"all 0.4s", boxShadow:repCount>=n?"0 4px 14px rgba(91,45,142,0.35)":"none" }}>
                {repCount>=n?"✓":n}
              </div>
            ))}
          </div>
          <div style={{ width:72, height:72, borderRadius:"50%", background:`linear-gradient(135deg,${C.dorado},#E8B050)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", margin:"0 auto 10px", boxShadow:"0 6px 24px rgba(201,160,80,0.4)" }}>
            <span style={{ fontSize:28, fontWeight:700, color:C.carbon, lineHeight:1 }}>{cuenta}</span>
          </div>
          <p style={{ fontSize:12, color:C.gris }}>Repite {3-repCount} vez{3-repCount===1?"":"es"} más...</p>
        </div>
      ) : (
        <div>
          <div style={{ background:"rgba(201,160,80,0.1)", borderRadius:14, padding:"14px 16px", marginBottom:16, border:"1px solid rgba(201,160,80,0.3)" }}>
            <p style={{ fontSize:13, color:"#8B6020", margin:0, lineHeight:1.5 }}>
              🗣️ <strong>Di esta frase 3 veces en voz alta</strong>, como si ya fuera tu verdad más profunda. La emoción activa la manifestación.
            </p>
          </div>
          <button onClick={iniciarRepeticion} style={{ width:"100%", background:C.violeta, color:"white", border:"none", borderRadius:50, padding:"14px", fontSize:15, cursor:"pointer", fontFamily:"inherit" }}>
            ▶ Empezar repetición guiada
          </button>
        </div>
      )}

      {/* GENERAR CON IA */}
      <div style={{ marginTop:20, borderTop:`1px solid rgba(91,45,142,0.1)`, paddingTop:16 }}>
        <button onClick={generarAiAff} disabled={loadingAi} style={{ width:"100%", background:"none", border:`1px solid rgba(91,45,142,0.2)`, borderRadius:50, padding:"12px", fontSize:13, cursor:"pointer", color:C.violeta, fontFamily:"inherit" }}>
          {loadingAi ? "✨ Generando con IA..." : "✨ Generar más manifestaciones con IA"}
        </button>
        {aiAff && (
          <div style={{ marginTop:14, display:"flex", flexDirection:"column", gap:8 }}>
            <p style={{ fontSize:11, color:C.gris, margin:"0 0 4px", textTransform:"uppercase", letterSpacing:1 }}>Inspiradas en tus mentores</p>
            {aiAff.split("\n").filter(l=>l.trim()).map((l,i)=>(
              <div key={i} style={{ background:C.blanco, borderRadius:12, padding:"14px 16px", border:`1px solid rgba(91,45,142,0.1)` }}>
                <p style={{ fontFamily:"Georgia,serif", fontSize:15, fontStyle:"italic", color:C.carbon, margin:"0 0 6px", lineHeight:1.5 }}>{l.trim()}</p>
                <p style={{ fontSize:11, color:C.dorado, margin:0, fontWeight:600 }}>✨ Generada por Florece IA</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AffirmationsScreen({ user, onUpdate, showToast }) {
  const [ambitoActivo, setAmbitoActivo] = useState(null);
  const [favs, setFavs] = useState(user.favAffirmations || []);

  const toggleFav = async (key) => {
    const newFavs = favs.includes(key) ? favs.filter(f=>f!==key) : [...favs, key];
    setFavs(newFavs);
    const updated = { ...user, favAffirmations: newFavs };
    await storeSet(`user:${user.email}`, updated);
    onUpdate(updated);
  };

  if (ambitoActivo) {
    const a = ambitoActivo === "abundancia" ? ABUNDANCIA : AMBITOS.find(a=>a.key===ambitoActivo);
    return (
      <div style={{ padding:"0 0 90px" }}>
        <div style={{ background:C.blanco, padding:"16px 20px", display:"flex", alignItems:"center", gap:12, borderBottom:`1px solid rgba(91,45,142,0.08)`, position:"sticky", top:0, zIndex:10 }}>
          <button onClick={()=>setAmbitoActivo(null)} style={{ background:"none", border:"none", fontSize:20, cursor:"pointer", color:C.gris, padding:0 }}>←</button>
          <span style={{ fontFamily:"Georgia,serif", fontSize:18, color:C.violeta }}>{a.emoji} Manifestaciones · {a.label}</span>
        </div>
        <div style={{ padding:"20px 20px" }}>
          <AmbitoPractice ambito={a} onBack={()=>setAmbitoActivo(null)} showToast={showToast} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      {/* HEADER */}
      <div style={{ background:`linear-gradient(135deg,${C.violeta},#2D1845)`, borderRadius:22, padding:"24px 20px", color:"white", marginBottom:24, textAlign:"center" }}>
        <div style={{ fontSize:36, marginBottom:10 }}>🌟</div>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, fontWeight:300, margin:"0 0 8px" }}>Manifestaciones</h2>
        <p style={{ fontSize:13, color:"rgba(255,255,255,0.6)", margin:"0 0 14px", lineHeight:1.5 }}>
          Palabras reales de tus mentores. Cada ámbito de tu vida merece ser programado con intención y con frecuencias que elevan tu vibración.
        </p>
        <div style={{ display:"flex", gap:8, justifyContent:"center", flexWrap:"wrap" }}>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 12px", fontSize:11, color:C.dorado }}>
            🎵 Frecuencias de alta vibración
          </div>
          <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 12px", fontSize:11, color:"rgba(255,255,255,0.6)" }}>
            ✨ Frases reales de tus mentores
          </div>
        </div>
      </div>

      {/* ABUNDANCIA — SECCIÓN DESTACADA */}
      <div onClick={()=>{ SoundEngine.playBowl(ABUNDANCIA.hz, 2, 0.2); setAmbitoActivo("abundancia"); }}
        style={{ background:ABUNDANCIA.color, borderRadius:22, padding:"22px 20px", marginBottom:24, cursor:"pointer", border:`2px solid ${favs.includes("abundancia")?C.violeta:ABUNDANCIA.borderColor}`, position:"relative", overflow:"hidden", boxShadow:"0 8px 30px rgba(255,160,0,0.18)" }}>
        <div style={{ position:"absolute", right:-10, top:-10, fontSize:90, opacity:0.1 }}>💰</div>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:"rgba(255,255,255,0.5)", borderRadius:20, padding:"4px 12px", fontSize:11, color:"#8B6020", fontWeight:600, marginBottom:12 }}>
          ⭐ Ámbito destacado
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ fontSize:44, flexShrink:0 }}>{ABUNDANCIA.emoji}</div>
          <div style={{ flex:1 }}>
            <p style={{ fontFamily:"Georgia,serif", fontSize:22, fontWeight:600, color:C.carbon, margin:"0 0 4px" }}>Abundancia</p>
            <p style={{ fontSize:13, color:"#4A3060", margin:"0 0 8px", lineHeight:1.45 }}>{ABUNDANCIA.descripcion}</p>
            <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
              <span style={{ fontSize:11, color:C.gris, display:"flex", alignItems:"center", gap:3 }}>🎵 {FRECUENCIAS[ABUNDANCIA.freqIdx].nombre}</span>
              <span style={{ fontSize:11, color:C.gris }}>· {ABUNDANCIA.afirmaciones.length} manifestaciones</span>
            </div>
          </div>
        </div>
        <button onClick={e=>{e.stopPropagation();toggleFav("abundancia");}} style={{ position:"absolute", top:14, right:14, background:"none", border:"none", fontSize:18, cursor:"pointer", opacity:favs.includes("abundancia")?1:0.3 }}>💜</button>
      </div>

      {/* ÁMBITOS GRID */}
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, margin:"0 0 6px", fontWeight:400 }}>¿Qué más quieres manifestar?</h3>
      <p style={{ fontSize:13, color:C.gris, margin:"0 0 16px" }}>Toca un ámbito. Escucha la frecuencia. Di las palabras.</p>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:28 }}>
        {AMBITOS.map(a => (
          <div key={a.key} onClick={()=>{ SoundEngine.playBowl(a.hz, 1.5, 0.15); setAmbitoActivo(a.key); }}
            style={{ background:a.color, borderRadius:18, padding:"20px 16px", cursor:"pointer", border:`2px solid ${favs.includes(a.key)?C.violeta:a.borderColor}`, transition:"all 0.2s", position:"relative" }}>
            <div style={{ fontSize:30, marginBottom:8 }}>{a.emoji}</div>
            <p style={{ fontWeight:700, fontSize:14, color:C.carbon, margin:"0 0 4px" }}>{a.label}</p>
            <p style={{ fontSize:11, color:"#4A3060", margin:"0 0 10px", lineHeight:1.4 }}>{a.descripcion.substring(0,40)}...</p>
            <div style={{ fontSize:10, color:C.gris, display:"flex", alignItems:"center", gap:3 }}>
              🎵 {FRECUENCIAS[a.freqIdx].nombre}
            </div>
            <button onClick={e=>{e.stopPropagation();toggleFav(a.key);}} style={{ position:"absolute", top:10, right:10, background:"none", border:"none", fontSize:16, cursor:"pointer", opacity:favs.includes(a.key)?1:0.25, transition:"opacity 0.2s" }}>💜</button>
          </div>
        ))}
      </div>

      {/* MENTORES */}
      <div style={{ background:C.blanco, borderRadius:18, padding:"18px 16px", border:`1px solid rgba(91,45,142,0.08)`, marginBottom:16 }}>
        <h4 style={{ fontFamily:"Georgia,serif", fontSize:17, color:C.violeta, margin:"0 0 14px" }}>Tus mentores en Florece</h4>
        {[
          { nombre:"Brian Tracy", area:"Mentalidad · Negocio", emoji:"🧠" },
          { nombre:"Lain García Calvo", area:"Abundancia · Mentalidad", emoji:"💰" },
          { nombre:"Tony Robbins", area:"Acción · Libertad · Familia", emoji:"⚡" },
          { nombre:"Margarita Pasos", area:"Negocio · Acción · Familia", emoji:"💼" },
          { nombre:"Otilia Bernal", area:"Familia · Libertad", emoji:"👨‍👧" },
        ].map(m=>(
          <div key={m.nombre} style={{ display:"flex", alignItems:"center", gap:12, marginBottom:10, paddingBottom:10, borderBottom:"1px solid rgba(91,45,142,0.05)" }}>
            <div style={{ width:38, height:38, borderRadius:"50%", background:`linear-gradient(135deg,${C.violetaSuave},${C.violetaClaro})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, flexShrink:0 }}>{m.emoji}</div>
            <div>
              <p style={{ fontWeight:600, fontSize:14, color:C.carbon, margin:"0 0 2px" }}>{m.nombre}</p>
              <p style={{ fontSize:11, color:C.gris, margin:0 }}>{m.area}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: RETO 7 DÍAS
// ═══════════════════════════════════════
function RetoScreen({ user, onUpdate, showToast }) {
  const completed = user.completedDays || [];

  const complete = async (dia) => {
    if (completed.includes(dia)) return;
    const newCompleted = [...completed, dia];
    const updated = { ...user, completedDays: newCompleted, points: (user.points||0)+20 };
    await storeSet(`user:${user.email}`, updated);
    onUpdate(updated);
    showToast(`🎉 Día ${dia} completado · +20 puntos`);
  };

  const progress = Math.round((completed.length / 7) * 100);

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      <div style={{ background:`linear-gradient(135deg,${C.violeta},#2D1845)`,borderRadius:22,padding:"24px 20px",color:"white",marginBottom:22,textAlign:"center" }}>
        <p style={{ fontSize:12,color:C.dorado,letterSpacing:2,textTransform:"uppercase",margin:"0 0 6px" }}>Tu transformación</p>
        <h2 style={{ fontFamily:"Georgia,serif",fontSize:26,fontWeight:300,margin:"0 0 16px" }}>Reto 7 Días 🌺</h2>
        <div style={{ background:"rgba(255,255,255,0.1)",borderRadius:50,height:8,marginBottom:10 }}>
          <div style={{ height:"100%",width:`${progress}%`,background:`linear-gradient(90deg,${C.dorado},#F0D080)`,borderRadius:50,transition:"width 0.8s ease" }}/>
        </div>
        <p style={{ fontSize:13,color:"rgba(255,255,255,0.6)",margin:0 }}>{completed.length} de 7 días · {progress}% completado</p>
      </div>

      <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
        {RETO_DIAS.map(d => {
          const done = completed.includes(d.dia);
          const isNext = !done && completed.length === d.dia - 1;
          return (
            <div key={d.dia} style={{ background:C.blanco,borderRadius:18,padding:"18px 16px",border:`2px solid ${done?"rgba(91,45,142,0.35)":isNext?"rgba(201,160,80,0.4)":"rgba(91,45,142,0.07)"}`,opacity:(!done && !isNext && d.dia > completed.length+1)?0.5:1,transition:"all 0.2s" }}>
              <div style={{ display:"flex",alignItems:"center",gap:14 }}>
                <div style={{ width:50,height:50,borderRadius:13,background:done?`linear-gradient(135deg,${C.violeta},${C.violetaClaro})`:isNext?`linear-gradient(135deg,${C.dorado},#F0D080)`:"rgba(91,45,142,0.06)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0 }}>
                  {done ? "✅" : d.icon}
                </div>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:11,color:C.gris,margin:"0 0 3px",textTransform:"uppercase",letterSpacing:1 }}>Día {d.dia}</p>
                  <p style={{ fontWeight:600,fontSize:14,color:C.carbon,margin:"0 0 4px" }}>{d.titulo}</p>
                  <p style={{ fontSize:12,color:C.gris,margin:0,lineHeight:1.4 }}>{d.desc}</p>
                </div>
                {(isNext || done) && (
                  <button onClick={()=>complete(d.dia)} disabled={done} style={{ background:done?C.violetaSuave:C.violeta,color:done?C.violeta:"white",border:"none",borderRadius:50,padding:"8px 16px",fontSize:12,cursor:done?"default":"pointer",fontFamily:"inherit",flexShrink:0 }}>
                    {done?"Hecho ✓":"Completar"}
                  </button>
                )}
              </div>
              {(done || isNext) && (
                <div style={{ marginTop:12,background:C.violetaSuave,borderRadius:12,padding:"10px 14px" }}>
                  <p style={{ fontFamily:"Georgia,serif",fontSize:14,fontStyle:"italic",color:C.violeta,margin:0,lineHeight:1.4 }}>"{d.afirmacion}"</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: COMUNIDAD
// ═══════════════════════════════════════
function ComunidadScreen({ user, showToast, onOpenModal }) {
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [aiReply, setAiReply] = useState({});
  const [loadingReply, setLoadingReply] = useState({});

  useEffect(() => { loadPosts(); }, []);

  const loadPosts = async () => {
    setLoadingPosts(true);
    try {
      const data = await sbFetch(`florece_posts?select=*&order=timestamp.desc&limit=50`);
      const loaded = data || [];
      if (loaded.length === 0) {
        // Seed welcome post
        const seed = { id:`post_${Date.now()}`, author:"Eri · Florece", avatar:"🌺", text:"¡Bienvenidas a Florece! Este es nuestro espacio sagrado. Aquí no hay competencia, solo apoyo. Comparte lo que sientes, lo que aprendes, lo que celebras. El viaje empieza hoy. 💜", timestamp: Date.now(), likes:[], comments:[] };
        await sbFetch(`florece_posts`, { method:"POST", prefer:"return=minimal", headers:{"Prefer":"return=minimal"}, body: JSON.stringify(seed) });
        loaded.push(seed);
      }
      setPosts(loaded);
    } catch { setPosts([]); }
    setLoadingPosts(false);
  };

  const publish = async () => {
    if (!newPost.trim() || posting) return;
    setPosting(true);
    const post = { id:`post_${Date.now()}`, author:user.name, avatar:"🌸", text:newPost.trim(), timestamp:Date.now(), likes:[], comments:[] };
    await sbFetch(`florece_posts`, { method:"POST", prefer:"return=minimal", headers:{"Prefer":"return=minimal"}, body: JSON.stringify(post) });
    setNewPost("");
    setShowForm(false);
    setPosting(false);
    showToast("💜 Tu reflexión fue publicada");
    await loadPosts();
  };

  const toggleLike = async (post) => {
    const already = post.likes?.includes(user.email);
    const newLikes = already ? post.likes.filter(e=>e!==user.email) : [...(post.likes||[]), user.email];
    await sbFetch(`florece_posts?id=eq.${post.id}`, { method:"PATCH", headers:{"Prefer":"return=minimal"}, body: JSON.stringify({ likes: newLikes }) });
    setPosts(ps => ps.map(p=>(p.id===post.id?{...p,likes:newLikes}:p)));
  };

  const getAIReply = async (post) => {
    setLoadingReply(r=>({...r,[post.id]:true}));
    const reply = await generateCommunityReply(post.text);
    setAiReply(r=>({...r,[post.id]:reply}));
    setLoadingReply(r=>({...r,[post.id]:false}));
  };

  const timeAgo = (ts) => {
    const mins = Math.floor((Date.now()-ts)/60000);
    if (mins<1) return "ahora mismo";
    if (mins<60) return `hace ${mins} min`;
    if (mins<1440) return `hace ${Math.floor(mins/60)}h`;
    return `hace ${Math.floor(mins/1440)}d`;
  };

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      <div style={{ background:`linear-gradient(135deg,${C.rosaPolvo||"#E8C5D8"},#F5D6E8)`,borderRadius:20,padding:"22px 20px",marginBottom:20,textAlign:"center" }}>
        <h2 style={{ fontFamily:"Georgia,serif",fontSize:24,color:C.violeta,margin:"0 0 6px" }}>Nuestra Comunidad 💜</h2>
        <p style={{ fontSize:13,color:C.gris,margin:"0 0 12px",lineHeight:1.5 }}>Un espacio seguro para compartir, crecer y apoyarnos.</p>
        <div style={{ display:"inline-flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.8)",borderRadius:20,padding:"5px 14px",fontSize:12,color:C.violeta }}>
          <span style={{ width:7,height:7,background:C.verde,borderRadius:"50%",display:"inline-block",animation:"blink 2s infinite" }}/>
          Comunidad activa
        </div>
      </div>

      {/* NEW POST */}
      {!showForm ? (
        <button onClick={()=>setShowForm(true)} style={{ width:"100%",background:C.violeta,color:"white",border:"none",borderRadius:50,padding:"14px 24px",fontSize:14,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,marginBottom:20,boxShadow:"0 6px 20px rgba(91,45,142,0.3)",fontFamily:"inherit" }}>
          ✍️ Comparte tu reflexión de hoy
        </button>
      ) : (
        <div style={{ background:C.blanco,borderRadius:18,padding:18,marginBottom:20,boxShadow:"0 2px 16px rgba(0,0,0,0.06)",border:`1.5px solid rgba(91,45,142,0.15)` }}>
          <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder="¿Qué aprendiste hoy? ¿Qué victoria quieres celebrar? ¿Qué necesitas soltar?&#10;&#10;Este es tu espacio seguro. 💜" style={{ width:"100%",minHeight:100,border:"none",outline:"none",fontSize:14,fontFamily:"Georgia,serif",fontStyle:"italic",color:C.carbon,resize:"none",background:"transparent",lineHeight:1.6,boxSizing:"border-box" }}/>
          <div style={{ display:"flex",gap:10,justifyContent:"flex-end",marginTop:12,borderTop:`1px solid ${C.cremaDark}`,paddingTop:12 }}>
            <button onClick={()=>{setShowForm(false);setNewPost("");}} style={{ background:"none",border:`1px solid ${C.grisSuave}`,borderRadius:50,padding:"9px 18px",fontSize:13,cursor:"pointer",color:C.gris,fontFamily:"inherit" }}>Cancelar</button>
            <button onClick={publish} disabled={posting||!newPost.trim()} style={{ background:C.violeta,color:"white",border:"none",borderRadius:50,padding:"9px 20px",fontSize:13,cursor:posting||!newPost.trim()?"not-allowed":"pointer",opacity:posting||!newPost.trim()?0.6:1,fontFamily:"inherit" }}>
              {posting?"Publicando...":"Publicar 💜"}
            </button>
          </div>
        </div>
      )}

      {/* POSTS */}
      {loadingPosts ? (
        <div style={{ textAlign:"center",padding:40,color:C.gris,fontSize:14 }}>Cargando reflexiones... 💜</div>
      ) : (
        <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
          {posts.map(p=>(
            <div key={p.id} style={{ background:C.blanco,borderRadius:18,padding:18,boxShadow:"0 2px 14px rgba(0,0,0,0.04)",border:"1.5px solid rgba(91,45,142,0.06)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:12 }}>
                <div style={{ width:40,height:40,borderRadius:"50%",background:`linear-gradient(135deg,${C.violetaClaro},${C.rosa||"#E8A0C0"})`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,flexShrink:0 }}>{p.avatar||"🌸"}</div>
                <div>
                  <p style={{ fontWeight:600,fontSize:14,margin:0,color:C.carbon }}>{p.author}</p>
                  <p style={{ fontSize:11,color:C.gris,margin:0 }}>{timeAgo(p.timestamp)}</p>
                </div>
              </div>
              <p style={{ fontSize:14,color:"#3A3540",lineHeight:1.65,margin:"0 0 14px" }}>{p.text}</p>

              {/* AI REPLY */}
              {aiReply[p.id] && (
                <div style={{ background:C.violetaSuave,borderRadius:12,padding:"12px 14px",marginBottom:12,borderLeft:`3px solid ${C.violetaClaro}` }}>
                  <p style={{ fontSize:12,color:C.violeta,margin:"0 0 4px",fontWeight:600 }}>🌺 Florece IA</p>
                  <p style={{ fontSize:13,color:C.carbon,margin:0,lineHeight:1.5,fontStyle:"italic" }}>{aiReply[p.id]}</p>
                </div>
              )}

              <div style={{ display:"flex",gap:14,flexWrap:"wrap" }}>
                <button onClick={()=>toggleLike(p)} style={{ background:"none",border:"none",fontSize:13,color:p.likes?.includes(user.email)?C.violeta:C.gris,cursor:"pointer",padding:0,fontFamily:"inherit",display:"flex",alignItems:"center",gap:4 }}>
                  {p.likes?.includes(user.email)?"💜":"🤍"} {p.likes?.length||0}
                </button>
                <button onClick={()=>getAIReply(p)} disabled={loadingReply[p.id]} style={{ background:"none",border:"none",fontSize:13,color:C.gris,cursor:"pointer",padding:0,fontFamily:"inherit" }}>
                  {loadingReply[p.id]?"✨ Respondiendo...":"✨ Respuesta IA"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════
// SCREEN: PERFIL
// ═══════════════════════════════════════
function PerfilScreen({ user, onLogout }) {
  const [activeMentor, setActiveMentor] = useState(0);
  const completed = user.completedDays?.length || 0;
  const bars = [
    { label:"🧠 Reprogramación mental", pct: Math.min(100, (user.streak||0)*10) },
    { label:"✨ Práctica de afirmaciones", pct: Math.min(100, (user.favAffirmations?.length||0)*12) },
    { label:"💼 Mentalidad de negocio", pct: Math.min(100, completed * 14) },
    { label:"🌊 Frecuencia & Vibración", pct: Math.min(100, (user.points||0)/2) },
  ];

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      <div style={{ textAlign:"center",padding:"28px 20px",background:`linear-gradient(160deg,${C.carbon},#2D1845)`,borderRadius:24,marginBottom:20,color:"white" }}>
        <div style={{ width:90,height:90,borderRadius:"50%",background:`linear-gradient(135deg,${C.dorado},${C.violetaClaro})`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px",border:"3px solid rgba(255,255,255,0.18)" }}>
          <Cayena size={56} color="white" glow />
        </div>
        <h2 style={{ fontFamily:"Georgia,serif",fontSize:26,fontWeight:300,margin:"0 0 4px" }}>{user.name}</h2>
        <p style={{ fontSize:12,color:C.dorado,letterSpacing:2,textTransform:"uppercase",margin:"0 0 18px" }}>{user.level||"Semilla 🌱"} · Florece</p>
        <div style={{ display:"flex",justifyContent:"center",gap:32 }}>
          {[[user.streak||0,"Racha"],[user.points||0,"Puntos"],[completed,"Reto días"]].map(([n,l])=>(
            <div key={l}>
              <div style={{ fontFamily:"Georgia,serif",fontSize:26,color:C.dorado }}>{n}</div>
              <div style={{ fontSize:10,color:"rgba(255,255,255,0.45)",textTransform:"uppercase",letterSpacing:1 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      <h3 style={{ fontFamily:"Georgia,serif",fontSize:20,margin:"0 0 14px",fontWeight:400 }}>Tu crecimiento</h3>
      {bars.map(b=>(
        <div key={b.label} style={{ background:C.blanco,borderRadius:16,padding:18,marginBottom:10,boxShadow:"0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display:"flex",justifyContent:"space-between",marginBottom:10 }}>
            <span style={{ fontSize:14,fontWeight:500 }}>{b.label}</span>
            <span style={{ fontSize:13,color:C.violeta,fontWeight:600 }}>{b.pct}%</span>
          </div>
          <div style={{ height:6,background:"rgba(91,45,142,0.1)",borderRadius:10,overflow:"hidden" }}>
            <div style={{ height:"100%",width:`${b.pct}%`,background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`,borderRadius:10,transition:"width 0.8s ease" }}/>
          </div>
        </div>
      ))}

      <h3 style={{ fontFamily:"Georgia,serif",fontSize:20,margin:"20px 0 14px",fontWeight:400 }}>Mis mentores favoritos</h3>
      <div style={{ display:"flex",gap:8,overflowX:"auto",paddingBottom:8,marginBottom:24 }}>
        {MENTORES.map((m,i)=>(
          <button key={m} onClick={()=>setActiveMentor(i)} style={{ background:i===activeMentor?C.violeta:C.blanco,color:i===activeMentor?"white":C.violeta,border:`1px solid ${i===activeMentor?C.violeta:"rgba(91,45,142,0.2)"}`,borderRadius:50,padding:"8px 16px",fontSize:12,cursor:"pointer",whiteSpace:"nowrap",flexShrink:0,transition:"all 0.2s",fontFamily:"inherit" }}>{m}</button>
        ))}
      </div>

      <button onClick={onLogout} style={{ width:"100%",background:"none",border:`1px solid rgba(91,45,142,0.2)`,borderRadius:50,padding:"13px",fontSize:14,color:C.gris,cursor:"pointer",fontFamily:"inherit" }}>
        Cerrar sesión
      </button>
    </div>
  );
}


// ═══════════════════════════════════════
// SCREEN: DASHBOARD ADMIN
// ═══════════════════════════════════════
const ADMIN_EMAIL = "eribethlira.s@gmail.com";

function DashboardScreen({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      const oneDayAgo = now - 86400000;
      const sevenDaysAgo = now - 604800000;

      // Load users (only for counting, no personal display)
      const storeData = await sbFetch(`florece_store?select=key,value`) || [];
      const userEntries = storeData.filter(r => r.key.startsWith("user:"));
      const parsedUsers = userEntries.map(r => {
        try { return JSON.parse(r.value); } catch { return null; }
      }).filter(Boolean);

      // Load posts for counting
      const postsData = await sbFetch(`florece_posts?select=id,timestamp,likes`) || [];

      setStats({
        totalUsers: parsedUsers.length,
        activeToday: parsedUsers.filter(u => u.lastPractice && u.lastPractice > oneDayAgo).length,
        activeWeek: parsedUsers.filter(u => u.lastPractice && u.lastPractice > sevenDaysAgo).length,
        retoCompleted: parsedUsers.filter(u => (u.completedDays||[]).length >= 7).length,
        totalPosts: postsData.length,
        postsToday: postsData.filter(p => p.timestamp > oneDayAgo).length,
        totalLikes: postsData.reduce((a,p) => a+(p.likes?.length||0), 0),
        avgStreak: parsedUsers.length ? Math.round(parsedUsers.reduce((a,u) => a+(u.streak||0), 0) / parsedUsers.length) : 0,
        levels: {
          "Semilla 🌱": parsedUsers.filter(u => !u.level || u.level==="Semilla 🌱").length,
          "Flor 🌺": parsedUsers.filter(u => u.level==="Flor 🌺").length,
          "Brote 🌿": parsedUsers.filter(u => u.level==="Brote 🌿").length,
          "Mariposa 🦋": parsedUsers.filter(u => u.level==="Mariposa 🦋").length,
        },
      });
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  const Stat = ({ emoji, value, label, color=C.violeta, bg="rgba(91,45,142,0.06)" }) => (
    <div style={{ background:C.blanco, borderRadius:18, padding:"20px 16px", textAlign:"center", boxShadow:"0 2px 14px rgba(0,0,0,0.05)", border:`1.5px solid rgba(91,45,142,0.08)` }}>
      <div style={{ fontSize:28, marginBottom:8 }}>{emoji}</div>
      <div style={{ fontFamily:"Georgia,serif", fontSize:36, fontWeight:400, color, lineHeight:1, marginBottom:6 }}>{value}</div>
      <div style={{ fontSize:12, color:C.gris, lineHeight:1.4 }}>{label}</div>
    </div>
  );

  if (loading) return (
    <div style={{ padding:"80px 20px", textAlign:"center" }}>
      <div style={{ fontSize:48, marginBottom:16 }}>📊</div>
      <p style={{ color:C.gris, fontFamily:"Georgia,serif", fontStyle:"italic" }}>Cargando datos...</p>
    </div>
  );

  return (
    <div style={{ padding:"20px 20px 90px" }}>
      {/* HEADER */}
      <div style={{ background:`linear-gradient(135deg,${C.carbon},#2D1845)`, borderRadius:22, padding:"24px 20px", color:"white", marginBottom:24, textAlign:"center" }}>
        <div style={{ marginBottom:10 }}><Cayena size={36} color="white" glow/></div>
        <p style={{ fontSize:11, color:C.dorado, letterSpacing:2, textTransform:"uppercase", margin:"0 0 6px" }}>Solo tú ves esto</p>
        <h2 style={{ fontFamily:"Georgia,serif", fontSize:26, fontWeight:300, margin:"0 0 6px" }}>Dashboard Florece</h2>
        <p style={{ fontSize:12, color:"rgba(255,255,255,0.4)", margin:"0 0 16px" }}>{new Date().toLocaleDateString("es-ES",{weekday:"long",day:"numeric",month:"long"})}</p>
        <button onClick={loadData} style={{ background:"rgba(255,255,255,0.1)", border:"1px solid rgba(255,255,255,0.2)", borderRadius:50, padding:"8px 20px", fontSize:12, color:"white", cursor:"pointer", fontFamily:"inherit" }}>
          🔄 Actualizar
        </button>
      </div>

      {/* REGISTROS */}
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, margin:"0 0 14px", fontWeight:400 }}>🌺 Mujeres que florecen</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        <Stat emoji="🌺" value={stats.totalUsers} label="Registradas en total" color={C.violeta}/>
        <Stat emoji="🔥" value={stats.activeToday} label="Practicaron hoy" color="#E53935"/>
        <Stat emoji="📅" value={stats.activeWeek} label="Activas esta semana" color={C.dorado}/>
        <Stat emoji="🦋" value={stats.retoCompleted} label="Completaron reto 7D" color="#4CAF80"/>
      </div>

      {/* COMUNIDAD */}
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, margin:"0 0 14px", fontWeight:400 }}>💜 Comunidad</h3>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
        <Stat emoji="💬" value={stats.totalPosts} label="Reflexiones publicadas" color={C.violetaClaro}/>
        <Stat emoji="✨" value={stats.postsToday} label="Posts hoy" color={C.dorado}/>
        <Stat emoji="💜" value={stats.totalLikes} label="Likes en comunidad" color="#E91E8C"/>
        <Stat emoji="🔥" value={`${stats.avgStreak}d`} label="Racha promedio" color="#FF7043"/>
      </div>

      {/* NIVELES */}
      <h3 style={{ fontFamily:"Georgia,serif", fontSize:20, margin:"0 0 14px", fontWeight:400 }}>🌱 Crecimiento de la comunidad</h3>
      <div style={{ background:C.blanco, borderRadius:18, padding:"20px 18px", boxShadow:"0 2px 14px rgba(0,0,0,0.05)", marginBottom:20 }}>
        {Object.entries(stats.levels).map(([level, count]) => {
          const pct = stats.totalUsers > 0 ? Math.round((count/stats.totalUsers)*100) : 0;
          return (
            <div key={level} style={{ marginBottom:16 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:7 }}>
                <span style={{ fontSize:14, fontWeight:500, color:C.carbon }}>{level}</span>
                <span style={{ fontSize:13, color:C.violeta, fontWeight:700 }}>{count} · {pct}%</span>
              </div>
              <div style={{ height:8, background:"rgba(91,45,142,0.08)", borderRadius:10, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${pct||0}%`, background:`linear-gradient(90deg,${C.violetaClaro},${C.dorado})`, borderRadius:10, transition:"width 1s ease" }}/>
              </div>
            </div>
          );
        })}
      </div>

      {/* MOTIVACIÓN */}
      <div style={{ background:`linear-gradient(135deg,rgba(91,45,142,0.08),rgba(201,160,80,0.08))`, borderRadius:18, padding:"20px 18px", border:`1px solid rgba(91,45,142,0.12)`, textAlign:"center" }}>
        <p style={{ fontFamily:"Georgia,serif", fontSize:18, fontStyle:"italic", color:C.violeta, margin:"0 0 8px", lineHeight:1.5 }}>
          "Cada registro es una mujer que decidió creer en sí misma."
        </p>
        <p style={{ fontSize:12, color:C.gris, margin:0 }}>— Florece 🌺</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════
export default function FloreceApp() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("home");
  const [modal, setModal] = useState(null);
  const [toast, setToast] = useState("");
  const toastRef = useRef();

  useEffect(() => {
    const check = async () => {
      // Session is LOCAL per device (localStorage) — never shared via Supabase
      try {
        const savedEmail = localStorage.getItem('florece_session');
        if (savedEmail) {
          // User profile loaded from Supabase (cloud)
          const u = await storeGet(`user:${savedEmail}`);
          if (u) setUser(u);
          else localStorage.removeItem('florece_session'); // email exists but no user — clean up
        }
      } catch {}
      setLoading(false);
    };
    check();
  }, []);

  const handleEnter = async (u) => {
    // Save session locally — each device has its own session
    localStorage.setItem('florece_session', u.email);
    setUser(u);
  };

  const handleLogout = async () => {
    // Only remove local session — user data stays safe in Supabase
    localStorage.removeItem('florece_session');
    setUser(null);
    setTab("home");
  };

  const updateUser = (u) => setUser(u);

  const showToast = (msg) => {
    setToast(msg);
    clearTimeout(toastRef.current);
    toastRef.current = setTimeout(()=>setToast(""), 2800);
  };

  const openModal = ({ title, content }) => setModal({ title, content });
  const closeModal = () => setModal(null);

  const isAdmin = user?.email === ADMIN_EMAIL;

  const tabs = [
    { id:"home", icon:"🏠", label:"Inicio" },
    { id:"manifestar", icon:"🌟", label:"Manifestar" },
    { id:"reto", icon:"🎯", label:"Reto 7D" },
    { id:"comunidad", icon:"💜", label:"Comunidad" },
    { id:"perfil", icon:"perfil", label:"Mi Camino" },
    ...(isAdmin ? [{ id:"dashboard", icon:"📊", label:"Admin" }] : []),
  ];

  if (loading) return (
    <div style={{ minHeight:"100vh",background:`linear-gradient(160deg,${C.carbon},#2D1845)`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:20 }}>
      <Cayena size={64} color="white" glow />
      <p style={{ color:"rgba(255,255,255,0.5)",fontSize:14,fontFamily:"Georgia,serif",fontStyle:"italic" }}>Cargando tu camino...</p>
    </div>
  );

  if (!user) return <SplashScreen onEnter={handleEnter} />;

  return (
    <div style={{ minHeight:"100vh",background:C.crema,fontFamily:"'DM Sans',system-ui,sans-serif",color:C.carbon,maxWidth:480,margin:"0 auto",position:"relative" }}>
      <style>{`@keyframes slideUp{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes fadeIn{from{opacity:0;transform:translateX(-50%) translateY(10px)}to{opacity:1;transform:translateX(-50%) translateY(0)}}@keyframes blink{0%,100%{opacity:1}50%{opacity:0.3}}*{-webkit-tap-highlight-color:transparent}`}</style>

      {/* NAVBAR */}
      <nav style={{ background:C.blanco,borderBottom:`1px solid rgba(91,45,142,0.08)`,padding:"0 20px",display:"flex",justifyContent:"space-between",alignItems:"center",height:58,position:"sticky",top:0,zIndex:100,boxShadow:"0 2px 18px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          <Cayena size={26} color={C.violeta} />
          <span style={{ fontFamily:"Georgia,serif",fontSize:20,color:C.violeta,letterSpacing:2 }}>FLORECE</span>
        </div>
        <div style={{ display:"flex",gap:4,alignItems:"center" }}>
          <span style={{ fontSize:12,background:C.violetaSuave,color:C.violeta,padding:"4px 10px",borderRadius:20,fontWeight:600 }}>⭐ {user.points||0}</span>
        </div>
      </nav>

      {/* SCREENS */}
      {tab==="home" && <HomeScreen user={user} onUpdate={updateUser} showToast={showToast} onOpenModal={openModal}/>}
      {tab==="manifestar" && <AffirmationsScreen user={user} onUpdate={updateUser} showToast={showToast}/>}
      {tab==="reto" && <RetoScreen user={user} onUpdate={updateUser} showToast={showToast}/>}
      {tab==="comunidad" && <ComunidadScreen user={user} showToast={showToast} onOpenModal={openModal}/>}
      {tab==="perfil" && <PerfilScreen user={user} onLogout={handleLogout}/>}
      {tab==="dashboard" && <DashboardScreen user={user}/>}

      {/* TAB BAR */}
      <nav style={{ background:C.blanco,borderTop:`1px solid rgba(91,45,142,0.08)`,display:"flex",justifyContent:"space-around",padding:"6px 0 10px",position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:480,zIndex:100,boxShadow:"0 -4px 20px rgba(0,0,0,0.05)" }}>
        {tabs.map(t=>(
          <div key={t.id} onClick={()=>setTab(t.id)} style={{ display:"flex",flexDirection:"column",alignItems:"center",gap:3,fontSize:10,color:tab===t.id?C.violeta:C.gris,cursor:"pointer",padding:"4px 8px",borderRadius:10,minWidth:52,transition:"all 0.15s" }}>
            <span style={{ fontSize:20,filter:tab===t.id?`drop-shadow(0 0 5px rgba(91,45,142,0.5))`:""  }}>
              {t.icon==="perfil"?<Cayena size={20} color={tab===t.id?C.violeta:C.gris}/>:t.icon}
            </span>
            <span style={{ fontWeight:tab===t.id?600:400 }}>{t.label}</span>
          </div>
        ))}
      </nav>

      {/* MODAL */}
      <Modal open={!!modal} onClose={closeModal}>
        {modal && (
          <>
            <h3 style={{ fontFamily:"Georgia,serif",fontSize:22,color:C.violeta,margin:"0 0 16px",fontWeight:400 }}>{modal.title}</h3>
            {modal.content}
            <button onClick={closeModal} style={{ width:"100%",background:C.violeta,color:"white",border:"none",borderRadius:50,padding:"14px",fontSize:15,cursor:"pointer",marginTop:20,fontFamily:"inherit" }}>Continuar mi camino ✨</button>
          </>
        )}
      </Modal>

      {/* TOAST */}
      <Toast msg={toast}/>
    </div>
  );
}
