# 🌺 Guía para publicar Florece — Paso a paso

## Lo que necesitas (todo gratis)
- Cuenta en GitHub (github.com) — gratuita
- Cuenta en Netlify (netlify.com) — gratuita  
- API Key de Anthropic (console.anthropic.com) — $5 USD da para miles de usos

---

## PASO 1 — Obtén tu API Key de Anthropic
1. Ve a console.anthropic.com
2. Crea cuenta o inicia sesión
3. Ve a "API Keys" → "Create Key"
4. Copia la clave (empieza con "sk-ant-...")
5. Guárdala en un lugar seguro — solo se muestra una vez

---

## PASO 2 — Sube el código a GitHub
1. Ve a github.com e inicia sesión
2. Clic en "+" → "New repository"
3. Nombre: "florece-app" → Public → "Create repository"
4. Descarga esta carpeta "florece-deploy" a tu computador
5. En la página del repo haz clic en "uploading an existing file"
6. Arrastra TODOS los archivos de la carpeta y súbelos
7. Clic en "Commit changes"

---

## PASO 3 — Publica en Netlify (gratis)
1. Ve a netlify.com → "Sign up" → "Sign up with GitHub"
2. Clic en "Add new site" → "Import an existing project"
3. Conecta con GitHub → selecciona "florece-app"
4. Configuración automática (Netlify detecta el netlify.toml)
5. Clic en "Deploy site"
6. Netlify te da un link como: https://florece-app-abc123.netlify.app

---

## PASO 4 — Agregar tu API Key (IMPORTANTE)
1. En Netlify → tu sitio → "Site configuration"
2. Ve a "Environment variables"
3. Clic en "Add a variable"
4. Key: ANTHROPIC_API_KEY
5. Value: (pega tu clave sk-ant-...)
6. Clic en "Save"
7. Ve a "Deploys" → "Trigger deploy" → "Deploy site"

✅ ¡Lista! Tu link funciona y puedes compartirlo.

---

## PASO 5 — Dominio personalizado (opcional, $10-12/año)
1. Compra florece.app o soyflorece.com en namecheap.com
2. En Netlify → "Domain management" → "Add a domain"
3. Sigue las instrucciones para conectar el dominio

---

## Compartir tu app
Una vez publicada comparte el link en:
- Tu bio de Instagram
- Stories con el link
- Grupos de WhatsApp
- TikTok en los videos

---

## ¿Problemas? 
Si algo no funciona escríbeme y lo resolvemos juntas 💜
