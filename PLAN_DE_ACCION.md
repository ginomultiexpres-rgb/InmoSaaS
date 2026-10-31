# 📋 Plan de Acción — Corrección de Errores (InmoTenant Arequipa)

**Fecha:** 31 de octubre de 2026
**Alcance:** 6 fases priorizadas. Cada tarea incluye archivo, acción concreta y criterio de verificación.
**Regla general:** al terminar cada fase ejecutar `npm run lint` (tsc --noEmit) y `npm run build`. No avanzar a la siguiente fase con errores.

---

## 🔴 FASE 1 — Seguridad (CRÍTICA, hacer primero)

### 1.1 Eliminar credenciales hardcodeadas de Supabase
- **Archivo:** `src/lib/supabase.ts` (líneas 5–7)
- **Problema:** `SUPABASE_PROJECT_URL` y `SUPABASE_ANON_KEY` están fijados en el código; `.env.example` define `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` pero **nadie los lee**. Las credenciales quedaron expuestas en el historial de Git.
- **Acción:**
  ```ts
  const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY: la app operará en modo demo.');
  }
  export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  export const supabaseClient: SupabaseClient | null = isSupabaseConfigured
    ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, { auth: { persistSession: true, autoRefreshToken: true } })
    : null;
  ```
- **Verificación:** `grep -rn "imospkeubutacrluepfa\|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" src/` no devuelve coincidencias.
- ⚠️ **Adicional (fuera del repo):** rotar/regenerar la anon key y revisar el proyecto `imospkeubutacrluepfa` en el dashboard de Supabase, ya que está comprometida por haberse commiteado.

### 1.2 Corregir políticas RLS abiertas (`USING (true)`)
- **Archivo:** `src/data/schemaAndCode.ts` (10 políticas detectadas: líneas ~233–250 y ~977–994)
- **Problema:** `CREATE POLICY ... FOR ALL TO anon, authenticated USING (true)` anula el aislamiento multi-tenant: cualquier visitante puede leer/escribir datos de todos los tenants. Además `GRANT ALL ON ALL TABLES TO anon` es excesivo.
- **Acción:** reemplazar por políticas escoping por tenant usando la función `current_tenant_id()` (ya mencionada en la documentación interna):
  ```sql
  ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "tenant_select_properties" ON public.properties
    FOR SELECT TO authenticated
    USING (tenant_id = current_tenant_id());
  -- repetir patrón SELECT/INSERT/UPDATE/DELETE para tenants, properties, crm_leads, appointments
  -- quitar GRANT ALL TO anon; solo SELECT público a properties si se desea landing pública
  ```
- **Verificación:** el SQL generado no contiene `USING (true)`; probar con un usuario autenticado de tenant A que no puede leer filas de tenant B.

### 1.3 Implementar autenticación real
- **Archivos:** `src/App.tsx`, nuevo `src/components/LoginView.tsx`, `src/lib/supabase.ts`
- **Problema:** cero uso de `supabase.auth` en el código de aplicación → las políticas RLS por `auth.uid()` son inoperables hoy.
- **Acción:**
  1. Vista de login con `supabaseClient.auth.signInWithPassword({ email, password })` y registro con `signUp`.
  2. En `App.tsx`: `const { data: { session } } = await supabase.auth.getSession()` + listener `onAuthStateChange`. Si no hay sesión → renderizar Login (o solo `PublicAgentLanding`).
  3. Gate de navegación: vistas `dashboard/portafolio/crm/agenda/arquitectura` requieren sesión.
- **Verificación:** sin sesión no se puede mutar datos; con sesión los datos mostrados corresponden al tenant del usuario.

### 1.4 Restringir acceso a la vista de documentación de desarrollador
- **Archivo:** `src/App.tsx` + Navbar
- **Acción:** la vista `arquitectura` (expone esquema SQL completo) solo visible para sesión autenticada con rol admin (columna `role` en `tenants` o lista allowlist de email).

---

## 🟠 FASE 2 — Fiabilidad de datos (silencio de errores)

### 2.1 Eliminar fallback silencioso a mockData
- **Archivos:** `src/lib/supabase.ts` (`loadDataFromSupabase`), `src/App.tsx`
- **Problema:** cuando Supabase falla o devuelve tablas vacías, la app muestra `INITIAL_PROPERTIES/LEADS/APPOINTMENTS` sin avisar → el usuario cree que edita datos reales y pierde cambios.
- **Acción:** separar tres estados explícitos:
  ```ts
  return { tenants, properties, leads, appointments, source: 'supabase' | 'empty-db' | 'error' };
  ```
  En `App.tsx` guardar `dataMode` en estado y mostrar un banner persistente: ⚠️ "Sin conexión con Supabase — datos de demostración (los cambios NO se guardan)".
- **Verificación:** con credenciales inválidas aparece el banner; nunca se confunde demo con datos vivos.

### 2.2 Propagar errores de escritura (no solo `console.error`)
- **Archivos:** `src/App.tsx` (≈12 bloques `catch (e) { console.error(...) }`, líneas 152–404)
- **Problema:** `insert/update/delete` que fallan dejan el estado optimista local inconsistente con la BD.
- **Acción:** patrón uniforme:
  ```ts
  const { error } = await client.from('properties').insert(propRecord);
  if (error) { setToast({ type: 'error', msg: `No se pudo guardar: ${error.message}` }); revertirUpdateOptimista(); return; }
  ```
  Crear un componente `Toast` mínimo (o usar el existente) y revertir el `setState` optimista en caso de error.
- **Verificación:** desconectar red/intentar slug duplicado → mensaje visible y UI coherente con la BD.

### 2.3 Unificar nombre de tabla de leads
- **Archivos:** `src/lib/supabase.ts`, `src/App.tsx`, `src/data/schemaAndCode.ts`
- **Problema:** dualidad `leads` vs `crm_leads` con detección en runtime (fragilidad y dobles consultas).
- **Acción:** fijar un único nombre (`crm_leads`), actualizar esquema SQL seed, queries y eliminar los intentos encadenados. Dejar una migración documentada si la BD actual usa `leads`.

---

## 🟡 FASE 3 — Dependencias y build

### 3.1 Resolver conflicto esbuild ↔ vite 8
- **Archivo:** `package.json`
- **Problema:** `esbuild ^0.25.0` en devDependencies choca con el peer de Vite 8 (obligó `--legacy-peer-deps`).
- **Acción:** eliminar `esbuild` de devDependencies (Vite lo trae internamente) o alinear a la versión que exige `vite@8`. Luego:
  ```bash
  rm -rf node_modules package-lock.json && npm install   # SIN --legacy-peer-deps
  ```
- **Verificación:** `npm install` limpio sin flags ni warnings de peer deps; `npm run build` OK.

### 3.2 Eliminar dependencias sin uso
- **Archivos:** `package.json`
- **Acción:** desinstalar `express`, `@types/express`, `@google/genai`, `motion`, `dotenv` (no hay imports en `src/`; verificar antes con `grep -rn "from 'motion'\|@google/genai\|express" src/`). Mantener solo si se planea un servidor real.
- **Verificación:** tras `npm install`, `npm run build` sigue exitoso y baja el tamaño de `node_modules`.

### 3.3 Higiene de entorno
- **Acción:** crear `.env` local desde `.env.example` con credenciales propias; confirmar que `.gitignore` incluya `.env*` (hoy solo tiene `package-lock.json`) y agregar `dist/`, `node_modules/`.
- **Verificación:** `git check-ignore .env` responde positivo.

---

## 🟢 FASE 4 — Rendimiento (bundle)

### 4.1 Code-splitting por vista con React.lazy
- **Archivo:** `src/App.tsx` (imports de línea 9–16)
- **Problema:** chunk único de ~704 KB JS.
- **Acción:**
  ```tsx
  const DashboardView = lazy(() => import('./components/DashboardView'));
  // idem PortfolioView, CrmKanbanView, CrmCanvasView, AgendaCalendarView, DeveloperDocsView
  // envolver el render en <Suspense fallback={<Spinner/>}>
  ```
  `DeveloperDocsView` (contiene `schemaAndCode.ts`, un string de ~1,000 líneas) debe ser lazy prioritariamente.
- **Verificación:** `npm run build` genera múltiples chunks; el chunk inicial baja de 700 KB a < 300 KB.

### 4.2 Optimizar imágenes locales
- **Acción:** comprimir los JPG de `src/assets/images/` (o servir vía `import` con plugin de assets) y añadir atributos `loading="lazy"`/`width`/`height` en `<img>` de Portfolio y Landing.

---

## 🔵 FASE 5 — Calidad de código

### 5.1 Extraer lógica de negocio de App.tsx
- **Archivo:** `src/App.tsx` (534 líneas con 10 handlers CRUD inline)
- **Acción:** crear hooks `useProperties()`, `useLeads()`, `useAppointments()` en `src/hooks/` que encapsulen estado + sincronización Supabase + toasts de error. `App.tsx` queda como composición de vistas.

### 5.2 Tipar respuestas de Supabase
- **Acción:** definir interfaces de fila (`PropertyRow`, `LeadRow`...) o generar tipos con `supabase gen types typescript`; eliminar `any` en mapeos de `loadDataFromSupabase`.

### 5.3 Validaciones de entrada
- **Acción:** validar campos obligatorios y numéricos (`price_pen > 0`, teléfono con formato PE `+51 9XX XXX XXX`) antes de insertar; reutilizar en los 3 formularios.

---

## ⚪ FASE 6 — UX mínima

1. Indicador de estado de conexión (punto verde/rojo en Navbar: conectado / demo / error).
2. Estados de carga (spinner/skeleton) mientras `fetchLiveSupabaseData` resuelve — hoy la app arranca mostrando mocks como si fueran reales.
3. Confirmación antes de `handleDeleteProperty/DeleteLead` (hay borrado inmediato sin diálogo).

---

## Verificación final integral (Definition of Done)

```bash
npm install                 # sin --legacy-peer-deps
npm run lint                # 0 errores TS
npm run build               # chunks separados, sin credenciales en dist:
grep -r "imospkeubutacrluepfa\|eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" dist/ && echo "FAIL" || echo "OK"
```

Pruebas manuales:
- [ ] Sin `.env` → banner "modo demo", login bloqueado, ninguna mutación silenciosa.
- [ ] Con credenciales válidas → login funciona, CRUD persiste tras recargar página.
- [ ] Usuario tenant A no ve ni modifica datos de tenant B (verificar contra la BD real).
- [ ] Error de red durante un update → toast visible + UI revertida.

---

## Orden y esfuerzo estimado

| Fase | Prioridad | Esfuerzo | Riesgo si se omite |
|------|-----------|----------|--------------------|
| 1. Seguridad | P0 | 1–2 días | Fuga/exposición total de datos de todos los clientes |
| 2. Fiabilidad datos | P0 | 1 día | Pérdida silenciosa de información de usuarios |
| 3. Dependencias | P1 | 0.5 día | Build frágil, instalaciones rotas |
| 4. Rendimiento | P2 | 0.5 día | Carga lenta en móvil (mercado principal inmobiliario) |
| 5. Calidad | P2 | 1 día | Deuda creciente, App.tsx inmantenible |
| 6. UX | P3 | 0.5 día | Confusión del usuario final |

**Total estimado: 4.5–5.5 días de desarrollo.**
