# CRM Kanban con Arrastrar y Soltar (Drag & Drop) y Filtros Avanzados para Arequipa

Tablero CRM interactivo en columnas por etapas del embudo inmobiliario con capacidad de arrastrar y soltar (*drag & drop*) tarjetas de prospectos entre estados, filtros rápidos por distrito y presupuesto en PEN (S/.), y sincronización en tiempo real con Supabase.

## User Review & Critical Decisions

> [!IMPORTANT]
> Se incorpora el modo de columnas Kanban con drag-and-drop como vista prioritaria del CRM, complementada con un selector para alternar hacia el Canvas espacial cuando se desee visualizar conexiones y redes de propiedades.

- **Filtros Rápidos Confirmados**: Selector por distrito de Arequipa (Cayma, Yanahuara, Cerro Colorado, J.L.B. y Rivero) y segmentación por rangos de presupuesto en Soles (PEN).
- **Métricas por Columna**: Cada columna mostrará el conteo de leads y el subtotal acumulado de presupuesto potencial en `S/.` (PEN) con formato `tabular-nums`.
- **Persistencia en Supabase**: Al soltar una tarjeta en una nueva columna, el cambio de estado se actualiza en memoria y se envía inmediatamente a la tabla `crm_leads` en PostgreSQL.

---

## 1. Overview & Core Concept

- **Qué hace**: Proporciona a los agentes inmobiliarios un tablero Kanban fluido donde cada columna representa una etapa clave de la negociación inmobiliaria:
  1. **Nuevo** (Leads recién capturados de la web pública o portales).
  2. **Contactado** (En conversación activa por WhatsApp / teléfono).
  3. **Visita** (Con cita agendada o recorrido de inmueble en Arequipa).
  4. **Cerrado** (Operación concretada con éxito).
- **Público Objetivo**: Asesores y brokers inmobiliarios en Arequipa que necesitan mover rápidamente prospectos en su embudo de ventas sin perder de vista los montos acumulados por etapa.
- **Valor Principal**: Reducción de fricción mediante interacción táctil/ratón de arrastrar y soltar, visibilidad inmediata del valor en cartera por etapa y filtrado instantáneo por distritos arequipeños.

---

## 2. User Experience & Visual Design

### Flujo de Interacción
1. **Arrastre Visual**: Al sostener una tarjeta de lead, se atenúa su opacidad (`opacity-50`) y la columna receptora resalta su borde en **Amarillo CAT** (`#FFCD00`) con un fondo suave de vidrio.
2. **Soltar y Transicionar**: Al soltar la tarjeta sobre la columna destino, el lead actualiza su etapa instantáneamente con feedback visual y actualiza el subtotal de la columna.
3. **Filtros Rápidos**: Barra superior con:
   - Buscador de texto (nombre, teléfono, correo o propiedad).
   - Botones segmentados de Distrito: *Todos*, *Cayma*, *Yanahuara*, *Cerro Colorado*, *J.L. Bustamante*.
   - Selector de Presupuesto: *Todos los montos*, *Hasta S/. 350,000*, *S/. 350,000 - S/. 750,000*, *Más de S/. 750,000*.
4. **Acceso Rápido a Citas**: Botón directo en la tarjeta para agendar visita en la Agenda con el lead y propiedad preseleccionados.

### Identidad Visual & Paleta
- **Azul Presidente (`#0A192F`)**: Encabezados de columnas, fondos estructurados y paneles de control.
- **Amarillo CAT (`#FFCD00`)**: Acentos de soltado activo, etiquetas numéricas destacadas y botones principales.
- **Superficies Glass**: Tarjetas con `backdrop-blur-md`, bordes sutiles `border-white/10` o `border-slate-200` y sombras al elevarse en arrastre.
- **Tipografía**: `Plus Jakarta Sans` para títulos y controles; `font-mono` con `tabular-nums` para montos en Soles (`S/.`).

---

## 3. Key Product Decisions & Trade-Offs

- **Mecanismo Drag & Drop**: Se implementa utilizando la API nativa HTML5 Drag and Drop combinada con manejadores de eventos optimizados (`onDragStart`, `onDragOver`, `onDragLeave`, `onDrop`), garantizando rendimiento a 60 FPS sin dependencias pesadas de terceros que inflen el bundle.
- **Coexistencia con Canvas**: Se agrega una barra de alternancia en el encabezado del CRM:
  - `[Tablero Kanban]` (vista por columnas drag & drop).
  - `[Canvas Espacial]` (vista en grafo 2D interactivo con cables SVG Bézier).
- **Sincronización Dual**: Si Supabase está conectado, el cambio de estado se envía a través de `supabase.from('crm_leads').update({ status }).eq('id', leadId)`, manteniendo la reactividad local inmediata para el usuario.

---

## 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CRM Header & Controls                         │
│  [Buscador] | [Filtro Distrito] | [Filtro Presupuesto PEN] | [Kanban/Canvas] │
└────────────────────────────────────────────────────────────────────────┘
                                    │
       ┌────────────────────────────┼────────────────────────────┐
       ▼                            ▼                            ▼
┌──────────────┐             ┌──────────────┐             ┌──────────────┐
│ Columna:     │             │ Columna:     │             │ Columna:     │
│ NUEVO        │             │ CONTACTADO   │             │ VISITA       │
│ Cantidad: 4  │ ──drag──>   │ Cantidad: 3  │ ──drag──>   │ Cantidad: 2  │
│ S/. 1,850,000│             │ S/. 1,220,000│             │ S/. 940,000  │
├──────────────┤             ├──────────────┤             ├──────────────┤
│ [Tarjeta 1]  │             │ [Tarjeta 3]  │             │ [Tarjeta 5]  │
│ [Tarjeta 2]  │             │ [Tarjeta 4]  │             │              │
└──────────────┘             └──────────────┘             └──────────────┘
                                    │
                         onDrop(leadId, newStatus)
                                    │
                 ┌──────────────────┴──────────────────┐
                 ▼                                     ▼
        React Local State                      Supabase PostgreSQL
  setLeads(prev => update(...))            supabase.from('crm_leads')
                                             .update({ status: newStatus })
```

### Componentes y Rutas de Datos:
1. `CrmKanbanView.tsx`: Tablero de 4 columnas horizontales con scroll responsivo, zona de drop destacada y cálculo de subtotales por columna.
2. `KanbanCard.tsx`: Tarjeta arrastrable (`draggable={true}`) con detalles del lead, distrito de interés, presupuesto en Soles y botones de acción rápida.
3. Integración en `App.tsx`: Enlace con `handleUpdateLeadStatus` para reflejar cambios en Dashboard, Agenda y base de datos Supabase.
