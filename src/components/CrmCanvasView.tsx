import React, { useState, useRef, useEffect } from 'react';
import { Tenant, Lead, LeadStatus, Property } from '../types';
import { formatPEN, formatWhatsAppLink } from '../utils/formatters';
import { 
  Users, 
  Plus, 
  MessageCircle, 
  Phone, 
  Mail, 
  Building2, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Search, 
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Move,
  LayoutGrid,
  GitBranch,
  StickyNote,
  SlidersHorizontal,
  Clock,
  ExternalLink,
  ChevronRight,
  Filter
} from 'lucide-react';

interface CrmCanvasViewProps {
  tenant: Tenant;
  leads: Lead[];
  properties: Property[];
  onAddLead: (lead: Omit<Lead, 'id' | 'created_at'>) => void;
  onUpdateLeadStatus: (id: string, status: LeadStatus) => void;
  onUpdateLead: (id: string, updates: Partial<Lead>) => void;
  onDeleteLead: (id: string) => void;
  onScheduleAppointment: (leadId: string, propertyId?: string) => void;
  isNewLeadModalOpen: boolean;
  setIsNewLeadModalOpen: (open: boolean) => void;
  onSwitchToKanban?: () => void;
}

interface CanvasNodePosition {
  id: string;
  x: number;
  y: number;
}

interface StickyNoteItem {
  id: string;
  tenant_id: string;
  text: string;
  x: number;
  y: number;
  color: string;
}

const STAGE_CONFIG: Record<LeadStatus, { label: string; color: string; border: string; bg: string; dot: string }> = {
  nuevo: { label: 'Nuevo', color: 'text-[#0A192F]', border: 'border-slate-300', bg: 'bg-white/95', dot: 'bg-slate-400' },
  contactado: { label: 'Contactado', color: 'text-[#0A192F]', border: 'border-[#FFCD00]', bg: 'bg-[#FFF9E6]', dot: 'bg-[#FFCD00]' },
  visita: { label: 'Visita Programada', color: 'text-white', border: 'border-[#FFCD00]', bg: 'bg-[#0A192F]', dot: 'bg-[#FFCD00]' },
  cerrado: { label: 'Cerrado / Venta', color: 'text-[#0A192F]', border: 'border-[#FFCD00]', bg: 'bg-[#FFCD00]', dot: 'bg-[#0A192F]' },
};

export const CrmCanvasView: React.FC<CrmCanvasViewProps> = ({
  tenant,
  leads,
  properties,
  onAddLead,
  onUpdateLeadStatus,
  onUpdateLead,
  onDeleteLead,
  onScheduleAppointment,
  isNewLeadModalOpen,
  setIsNewLeadModalOpen,
  onSwitchToKanban,
}) => {
  // Mode: 'canvas' | 'kanban'
  const [viewMode, setViewMode] = useState<'canvas' | 'kanban'>('canvas');
  const [searchQuery, setSearchQuery] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('todos');

  // Selected Lead for Inspector Drawer
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);

  // Canvas State: Pan & Zoom
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 80, y: 60 });
  const [zoom, setZoom] = useState<number>(1);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Node Dragging State
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Custom Node Positions (Saved in memory for spatial layout)
  const [nodePositions, setNodePositions] = useState<Record<string, { x: number; y: number }>>({});

  // Canvas Sticky Notes
  const [stickyNotes, setStickyNotes] = useState<StickyNoteItem[]>([
    {
      id: 'note-01',
      tenant_id: tenant.id,
      text: '📌 Prioridad: Tasación hipotecaria Banco BCP para Penthouse en Cayma este jueves.',
      x: 480,
      y: 180,
      color: 'bg-amber-100 border-amber-300 text-amber-900',
    },
    {
      id: 'note-02',
      tenant_id: tenant.id,
      text: '⭐ Interesados en Casona Yanahuara buscan estudio de arte colonial y conservación de sillar.',
      x: 780,
      y: 490,
      color: 'bg-yellow-100 border-yellow-300 text-yellow-900',
    },
  ]);

  // Form State
  const [newLeadForm, setNewLeadForm] = useState({
    full_name: '',
    phone: '+51 9',
    email: '',
    status: 'nuevo' as LeadStatus,
    budget_pen: 650000,
    interested_property_id: '',
    notes: '',
    source: 'Registro Canvas',
  });

  const canvasContainerRef = useRef<HTMLDivElement>(null);

  const tenantLeads = leads.filter((l) => l.tenant_id === tenant.id);
  const tenantProperties = properties.filter((p) => p.tenant_id === tenant.id);

  // Initialize initial default positions for nodes if not set
  useEffect(() => {
    const newPos: Record<string, { x: number; y: number }> = { ...nodePositions };

    // Arrange Properties on the Left Column
    tenantProperties.forEach((prop, index) => {
      if (!newPos[`prop-${prop.id}`]) {
        newPos[`prop-${prop.id}`] = {
          x: 120,
          y: 120 + index * 260,
        };
      }
    });

    // Arrange Leads on the Right Columns according to their status
    tenantLeads.forEach((lead, index) => {
      if (!newPos[`lead-${lead.id}`]) {
        const colMap: Record<LeadStatus, number> = {
          nuevo: 520,
          contactado: 860,
          visita: 1200,
          cerrado: 1540,
        };
        const xBase = colMap[lead.status] || 520;
        const countInStage = tenantLeads.filter((l, i) => l.status === lead.status && i < index).length;

        newPos[`lead-${lead.id}`] = {
          x: xBase,
          y: 120 + countInStage * 230,
        };
      }
    });

    setNodePositions(newPos);
  }, [tenant.id, tenantLeads.length, tenantProperties.length]);

  // Canvas Pan Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    // Only pan if clicking on canvas backdrop
    if ((e.target as HTMLElement).closest('.canvas-node')) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
    } else if (draggingNodeId) {
      // Dragging a specific node
      const currentPos = {
        x: (e.clientX - pan.x) / zoom - dragOffset.x,
        y: (e.clientY - pan.y) / zoom - dragOffset.y,
      };
      setNodePositions((prev) => ({
        ...prev,
        [draggingNodeId]: currentPos,
      }));
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDraggingNodeId(null);
  };

  // Node Drag Starter
  const handleStartDragNode = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const pos = nodePositions[id] || { x: 0, y: 0 };
    setDraggingNodeId(id);
    setDragOffset({
      x: (e.clientX - pan.x) / zoom - pos.x,
      y: (e.clientY - pan.y) / zoom - pos.y,
    });
  };

  // Zoom Controls
  const handleZoomIn = () => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)));
  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 80, y: 60 });
  };

  // Add Sticky Note
  const handleAddStickyNote = () => {
    const newNote: StickyNoteItem = {
      id: `note-${Date.now()}`,
      tenant_id: tenant.id,
      text: 'Nueva nota de negociación o requerimiento de cliente en Arequipa...',
      x: 520,
      y: 280,
      color: 'bg-blue-100 border-blue-300 text-blue-900',
    };
    setStickyNotes((prev) => [...prev, newNote]);
    setNodePositions((prev) => ({
      ...prev,
      [newNote.id]: { x: newNote.x, y: newNote.y },
    }));
  };

  // Create Lead
  const handleCreateLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.full_name.trim() || !newLeadForm.phone.trim()) return;

    onAddLead({
      tenant_id: tenant.id,
      full_name: newLeadForm.full_name,
      phone: newLeadForm.phone,
      email: newLeadForm.email,
      status: newLeadForm.status,
      budget_pen: Number(newLeadForm.budget_pen),
      interested_property_id: newLeadForm.interested_property_id || undefined,
      notes: newLeadForm.notes,
      source: newLeadForm.source,
    });

    setIsNewLeadModalOpen(false);
    setNewLeadForm({
      full_name: '',
      phone: '+51 9',
      email: '',
      status: 'nuevo',
      budget_pen: 650000,
      interested_property_id: '',
      notes: '',
      source: 'Registro Canvas',
    });
  };

  // Filtered Leads
  const filteredLeads = tenantLeads.filter((l) => {
    if (stageFilter !== 'todos' && l.status !== stageFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        l.full_name.toLowerCase().includes(q) ||
        l.phone.toLowerCase().includes(q) ||
        l.notes.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
            {viewMode === 'canvas' ? <GitBranch className="w-5 h-5" /> : <LayoutGrid className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-slate-900">
                CRM {viewMode === 'canvas' ? 'Lienzo Interactivo (Canvas Graph)' : 'Tablero Kanban'}
              </h1>
              <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                {tenantLeads.length} leads
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Gestión visual de relaciones entre compradores, presupuestos y propiedades en Arequipa
            </p>
          </div>
        </div>

        {/* View Switcher & Action Tools */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Switcher Canvas / Kanban */}
          <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200/80">
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'canvas'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span>Canvas Espacial</span>
            </button>
            <button
              onClick={() => {
                if (onSwitchToKanban) onSwitchToKanban();
                else setViewMode('kanban');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Kanban Columnas</span>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar prospecto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
            />
          </div>

          {/* Filter Stage */}
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="todos">Todas las etapas</option>
            <option value="nuevo">Nuevo</option>
            <option value="contactado">Contactado</option>
            <option value="visita">Visita</option>
            <option value="cerrado">Cerrado</option>
          </select>

          {/* Add Sticky Note (Only on Canvas) */}
          {viewMode === 'canvas' && (
            <button
              onClick={handleAddStickyNote}
              title="Añadir nota adhesiva"
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition cursor-pointer"
            >
              <StickyNote className="w-3.5 h-3.5 text-amber-600" />
              <span className="hidden sm:inline">+ Nota</span>
            </button>
          )}

          {/* Add Lead Button */}
          <button
            onClick={() => setIsNewLeadModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Lead</span>
          </button>
        </div>
      </div>

      {/* VIEW MODE 1: CANVASS GRAPH */}
      {viewMode === 'canvas' && (
        <div className="relative w-full h-[680px] bg-slate-900/95 rounded-3xl overflow-hidden border border-slate-800 shadow-xl select-none">
          {/* Canvas HUD Controls Floating on Left Bottom */}
          <div className="absolute bottom-5 left-5 z-20 flex items-center gap-1.5 bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 text-slate-300 shadow-lg text-xs">
            <span className="text-[11px] font-mono text-slate-400 mr-1">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-200 hover:text-white cursor-pointer"
              title="Acercar (Zoom In)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomOut}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-200 hover:text-white cursor-pointer"
              title="Alejar (Zoom Out)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1" />
            <button
              onClick={handleResetView}
              className="p-1.5 hover:bg-slate-800 rounded-lg transition text-slate-200 hover:text-white cursor-pointer"
              title="Centrar Vista"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-[10px] text-slate-400 ml-2 hidden md:inline">
              Arrastra el fondo para moverte · Mueve tarjetas libremente
            </span>
          </div>

          {/* Canvas Legend Floating on Top Left */}
          <div className="absolute top-5 left-5 z-20 flex items-center gap-3 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-800 text-xs shadow-md">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
              <span className="text-[11px]">Nuevo</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-500/30" />
              <span className="text-[11px]">Contactado</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 ring-2 ring-purple-500/30" />
              <span className="text-[11px]">Visita</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-500/30" />
              <span className="text-[11px]">Cerrado</span>
            </div>
          </div>

          {/* Interactive Infinite Canvas Board in Azul Presidente */}
          <div
            ref={canvasContainerRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            className={`w-full h-full relative cursor-grab active:cursor-grabbing bg-canvas-dots-presidential ${
              isPanning ? 'cursor-grabbing' : ''
            }`}
            style={{
              backgroundColor: '#071529',
            }}
          >
            {/* Transform Layer for Pan & Zoom */}
            <div
              className="absolute top-0 left-0 transition-transform duration-75 will-change-transform"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                width: '3200px',
                height: '2400px',
              }}
            >
              {/* Dynamic SVG Connection Cables / Curves in Amarillo CAT */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                <defs>
                  <filter id="glow-cat" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {filteredLeads.map((lead) => {
                  if (!lead.interested_property_id) return null;
                  const propPos = nodePositions[`prop-${lead.interested_property_id}`];
                  const leadPos = nodePositions[`lead-${lead.id}`];
                  if (!propPos || !leadPos) return null;

                  // Property center right output
                  const startX = propPos.x + 280;
                  const startY = propPos.y + 65;

                  // Lead center left input
                  const endX = leadPos.x;
                  const endY = leadPos.y + 70;

                  // Bezier control points for smooth curving line
                  const dx = Math.abs(endX - startX) * 0.55;
                  const pathData = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

                  const isHighPriority = lead.status === 'visita' || lead.status === 'cerrado';

                  return (
                    <g key={`wire-${lead.id}`} className="transition-opacity duration-300">
                      {/* Glow backdrop in Amarillo CAT */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FFCD00"
                        strokeWidth="6"
                        strokeOpacity="0.3"
                      />
                      {/* Crisp wire line */}
                      <path
                        d={pathData}
                        fill="none"
                        stroke="#FFCD00"
                        strokeWidth="2.5"
                        strokeDasharray={lead.status === 'nuevo' ? '6 4' : 'none'}
                        className={isHighPriority ? 'animate-cat-glow' : ''}
                      />
                      {/* Animated traveling dot along the line */}
                      <circle r="4" fill="#ffffff" filter="url(#glow-cat)">
                        <animateMotion dur={isHighPriority ? '2s' : '3.5s'} repeatCount="indefinite" path={pathData} />
                      </circle>
                    </g>
                  );
                })}
              </svg>

              {/* 1. PROPERTY NODES (Inventario de Inmuebles en Arequipa) */}
              <div className="absolute top-10 left-10 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                [PORTAFOLIO DE INMUEBLES · ANCLAJES DE INTERÉS]
              </div>

              {tenantProperties.map((prop) => {
                const pos = nodePositions[`prop-${prop.id}`] || { x: 120, y: 120 };
                const interestedCount = tenantLeads.filter((l) => l.interested_property_id === prop.id).length;

                return (
                  <div
                    key={`prop-node-${prop.id}`}
                    onMouseDown={(e) => handleStartDragNode(e, `prop-${prop.id}`)}
                    className="canvas-node absolute w-72 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-700/80 p-3 shadow-2xl hover:border-blue-500/80 transition-shadow cursor-move z-10 text-white group"
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-800 shrink-0 relative border border-slate-700">
                        <img
                          src={prop.image_url}
                          alt={prop.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          referrerPolicy="no-referrer"
                        />
                        <span className="absolute bottom-1 left-1 bg-black/70 text-[9px] font-semibold px-1 rounded capitalize">
                          {prop.property_type}
                        </span>
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">
                          {prop.title}
                        </div>
                        <div className="text-[11px] font-bold text-emerald-400 font-mono mt-0.5">
                          {formatPEN(prop.price_pen)}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{prop.district}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                      <span>{interestedCount} {interestedCount === 1 ? 'prospecto vinculado' : 'prospectos vinculados'}</span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                        {prop.area_m2} m²
                      </span>
                    </div>

                    {/* Connection port circle */}
                    <div
                      title="Salida de enlace"
                      className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform"
                    />
                  </div>
                );
              })}

              {/* 2. LEAD NODES (Clientes potenciales) */}
              {filteredLeads.map((lead) => {
                const pos = nodePositions[`lead-${lead.id}`] || { x: 520, y: 140 };
                const isSelected = selectedLead?.id === lead.id;
                const config = STAGE_CONFIG[lead.status];
                const interestedProp = tenantProperties.find((p) => p.id === lead.interested_property_id);

                return (
                  <div
                    key={`lead-node-${lead.id}`}
                    onMouseDown={(e) => handleStartDragNode(e, `lead-${lead.id}`)}
                    onClick={() => setSelectedLead(lead)}
                    className={`canvas-node absolute w-80 bg-white/95 backdrop-blur-md rounded-2xl border-2 p-4 shadow-xl cursor-pointer z-10 transition-all ${
                      isSelected
                        ? 'border-blue-600 ring-4 ring-blue-500/20 scale-102 z-20'
                        : `${config.border} hover:border-slate-400 hover:shadow-2xl`
                    }`}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }}
                  >
                    {/* Header: Name & Status Pill */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${config.dot} shrink-0 ring-2 ring-slate-200`} />
                        <h4 className="font-bold text-slate-900 text-xs leading-tight">
                          {lead.full_name}
                        </h4>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${config.bg} ${config.color} border border-current/20 whitespace-nowrap`}>
                        {config.label}
                      </span>
                    </div>

                    {/* Presupuesto y Teléfono */}
                    <div className="mt-2.5 flex items-center justify-between text-xs">
                      <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                        {lead.budget_pen ? formatPEN(lead.budget_pen) : 'Sin presupuesto'}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500">
                        {lead.phone}
                      </span>
                    </div>

                    {/* Propiedad Vinculada */}
                    {interestedProp && (
                      <div className="mt-2.5 p-2 bg-slate-50 rounded-xl border border-slate-200/70 text-[11px] text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 truncate">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate font-semibold">{interestedProp.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0 ml-1">({interestedProp.district})</span>
                      </div>
                    )}

                    {/* Notas rápidas */}
                    {lead.notes && (
                      <p className="mt-2 text-[11px] text-slate-500 italic line-clamp-2 bg-slate-50/60 p-1.5 rounded-lg">
                        "{lead.notes}"
                      </p>
                    )}

                    {/* Micro Action Bar */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={formatWhatsAppLink(
                          lead.phone,
                          `Hola ${lead.full_name}, le saluda ${tenant.agent_name} de ${tenant.name}. Deseo conversar sobre su interés inmobiliario en Arequipa.`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition"
                        title="Conversar por WhatsApp"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                      </a>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onScheduleAppointment(lead.id, lead.interested_property_id);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 px-2 py-1 rounded-md hover:bg-blue-50 transition"
                      >
                        + Agendar Visita
                      </button>

                      <div className="flex items-center gap-1">
                        {lead.status !== 'cerrado' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const next: Record<LeadStatus, LeadStatus> = {
                                nuevo: 'contactado',
                                contactado: 'visita',
                                visita: 'cerrado',
                                cerrado: 'cerrado',
                              };
                              onUpdateLeadStatus(lead.id, next[lead.status]);
                            }}
                            className="p-1 bg-slate-100 hover:bg-blue-600 hover:text-white rounded-md text-slate-600 transition"
                            title="Avanzar etapa en embudo"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Connection input port circle */}
                    <div
                      title="Entrada de enlace"
                      className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-emerald-500 border-2 border-white shadow-md cursor-pointer hover:scale-125 transition-transform"
                    />
                  </div>
                );
              })}

              {/* 3. STICKY NOTES ON CANVAS */}
              {stickyNotes.map((note) => {
                const pos = nodePositions[note.id] || { x: note.x, y: note.y };

                return (
                  <div
                    key={`note-node-${note.id}`}
                    onMouseDown={(e) => handleStartDragNode(e, note.id)}
                    className={`canvas-node absolute w-60 p-3.5 rounded-2xl border-2 shadow-lg cursor-move z-10 transition-transform ${note.color}`}
                    style={{
                      transform: `translate(${pos.x}px, ${pos.y}px)`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5 opacity-60 text-[10px] font-bold uppercase tracking-wider">
                      <span>Anotación Rápida</span>
                      <button
                        onClick={() => setStickyNotes((prev) => prev.filter((n) => n.id !== note.id))}
                        className="hover:opacity-100 cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                    <p className="text-xs font-medium leading-relaxed">
                      {note.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* INSPECTOR SLIDING DRAWER ON THE RIGHT (When clicking a lead node) in Glass Presidential */}
          {selectedLead && (
            <div className="absolute top-0 right-0 w-80 sm:w-96 h-full glass-presidential border-l border-white/20 shadow-2xl p-6 z-30 overflow-y-auto animate-in slide-in-from-right duration-200 text-white">
              <div className="flex items-center justify-between pb-4 border-b border-white/15">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-[#FFCD00] text-[#0A192F] flex items-center justify-center font-black text-sm shadow-md">
                    {selectedLead.full_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white leading-tight">
                      {selectedLead.full_name}
                    </h3>
                    <span className="text-[11px] text-[#FFCD00] font-mono">
                      ID: {selectedLead.id}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1.5 text-slate-300 hover:text-white rounded-xl hover:bg-white/15 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Inspector Content */}
              <div className="py-5 space-y-5">
                {/* Etapa actual */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[10px]">Etapa en el Pipeline</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['nuevo', 'contactado', 'visita', 'cerrado'] as LeadStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={() => onUpdateLeadStatus(selectedLead.id, st)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition cursor-pointer ${
                          selectedLead.status === st
                            ? 'bg-[#FFCD00] text-[#0A192F] shadow-md scale-102'
                            : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
                        }`}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Presupuesto */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[10px]">Presupuesto Estimado</label>
                  <div className="p-3 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 flex items-center justify-between">
                    <span className="text-base font-black font-mono text-[#FFCD00]">
                      {selectedLead.budget_pen ? formatPEN(selectedLead.budget_pen) : 'Sin definir'}
                    </span>
                    <span className="text-[11px] text-slate-300">Soles (PEN S/.)</span>
                  </div>
                </div>

                {/* Datos de Contacto */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[10px]">Canales de Comunicación</label>
                  <div className="p-3.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Teléfono (Perú):</span>
                      <span className="font-mono font-bold text-white">{selectedLead.phone}</span>
                    </div>
                    {selectedLead.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-300">Email:</span>
                        <span className="text-white truncate max-w-[170px]">{selectedLead.email}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-300">Fuente:</span>
                      <span className="text-white">{selectedLead.source}</span>
                    </div>
                  </div>
                </div>

                {/* Propiedad de interés */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[10px]">Inmueble Vinculado</label>
                  <select
                    value={selectedLead.interested_property_id || ''}
                    onChange={(e) => onUpdateLead(selectedLead.id, { interested_property_id: e.target.value || undefined })}
                    className="w-full px-3 py-2 text-xs bg-slate-900 border border-white/20 rounded-xl text-white"
                  >
                    <option value="">-- Sin propiedad asignada --</option>
                    {tenantProperties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.district} - {formatPEN(p.price_pen)})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notas */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider text-[10px]">Notas de Seguimiento</label>
                  <textarea
                    rows={3}
                    value={selectedLead.notes}
                    onChange={(e) => onUpdateLead(selectedLead.id, { notes: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-white/10 border border-white/20 rounded-xl text-white focus:ring-1 focus:ring-[#FFCD00] focus:outline-none placeholder:text-slate-400"
                    placeholder="Detalles de la última conversación..."
                  />
                </div>

                {/* Botones de acción del Drawer en Amarillo CAT y Glass */}
                <div className="pt-2 space-y-2.5">
                  <a
                    href={formatWhatsAppLink(
                      selectedLead.phone,
                      `Hola ${selectedLead.full_name}, le saluda ${tenant.agent_name} de ${tenant.name}. Deseo coordinar detalles sobre su búsqueda inmobiliaria en Arequipa.`
                    )}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 text-xs font-black text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-2xl transition flex items-center justify-center gap-2 shadow-lg"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Abrir Chat de WhatsApp</span>
                  </a>

                  <button
                    onClick={() => onScheduleAppointment(selectedLead.id, selectedLead.interested_property_id)}
                    className="w-full py-2.5 px-4 text-xs font-bold text-white bg-white/15 hover:bg-white/25 border border-white/20 rounded-2xl transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Clock className="w-4 h-4 text-[#FFCD00]" />
                    <span>Programar Visita en Agenda</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE 2: KANBAN COLUMN BOARD (4 Columns) */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start animate-in fade-in duration-200">
          {(['nuevo', 'contactado', 'visita', 'cerrado'] as LeadStatus[]).map((stageId) => {
            const config = STAGE_CONFIG[stageId];
            const colLeads = filteredLeads.filter((l) => l.status === stageId);

            return (
              <div
                key={stageId}
                className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 space-y-3 min-h-[520px] flex flex-col shadow-xs"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${config.dot}`} />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                      {config.label}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 bg-slate-100 rounded-full font-bold text-slate-700">
                    {colLeads.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {colLeads.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 text-xs">
                      Sin prospectos en esta etapa.
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const prop = tenantProperties.find((p) => p.id === lead.interested_property_id);

                      return (
                        <div
                          key={`kanban-card-${lead.id}`}
                          onClick={() => setSelectedLead(lead)}
                          className="p-4 bg-slate-50/80 hover:bg-white rounded-xl border border-slate-200/80 hover:border-slate-300 shadow-xs hover:shadow-md transition-all space-y-2.5 cursor-pointer group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-600 transition">
                              {lead.full_name}
                            </h4>
                            {lead.budget_pen && (
                              <span className="text-[10px] font-bold font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                                {formatPEN(lead.budget_pen)}
                              </span>
                            )}
                          </div>

                          {prop && (
                            <div className="text-[11px] text-slate-600 flex items-center gap-1.5 bg-white p-1.5 rounded-lg border border-slate-100">
                              <Building2 className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{prop.title}</span>
                            </div>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                            <span className="font-mono">{lead.phone}</span>
                            <span className="text-[10px] text-slate-400">{lead.source}</span>
                          </div>

                          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                            <a
                              href={formatWhatsAppLink(lead.phone, `Hola ${lead.full_name}`)}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 text-emerald-700 hover:bg-emerald-50 rounded"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>

                            <div className="flex items-center gap-1">
                              {stageId !== 'nuevo' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const prev: Record<LeadStatus, LeadStatus> = {
                                      nuevo: 'nuevo',
                                      contactado: 'nuevo',
                                      visita: 'contactado',
                                      cerrado: 'visita',
                                    };
                                    onUpdateLeadStatus(lead.id, prev[stageId]);
                                  }}
                                  className="p-1 hover:bg-slate-200 rounded text-slate-500"
                                >
                                  <ArrowLeft className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {stageId !== 'cerrado' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const next: Record<LeadStatus, LeadStatus> = {
                                      nuevo: 'contactado',
                                      contactado: 'visita',
                                      visita: 'cerrado',
                                      cerrado: 'cerrado',
                                    };
                                    onUpdateLeadStatus(lead.id, next[stageId]);
                                  }}
                                  className="p-1 hover:bg-blue-100 rounded text-blue-600 font-bold"
                                >
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <button
                  onClick={() => {
                    setNewLeadForm((prev) => ({ ...prev, status: stageId }));
                    setIsNewLeadModalOpen(true);
                  }}
                  className="w-full py-2 text-[11px] font-semibold text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 rounded-xl transition border border-dashed border-slate-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir a {config.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Lead */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Registrar Lead en CRM</h3>
                <p className="text-xs text-slate-500">Añadir al pipeline de {tenant.agent_name}</p>
              </div>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateLead} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Nombre Completo</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Lic. Fernando Corrales"
                  value={newLeadForm.full_name}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teléfono (Perú +51)</label>
                  <input
                    type="text"
                    required
                    placeholder="+51 954 123 456"
                    value={newLeadForm.phone}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Presupuesto (PEN S/.)</label>
                  <input
                    type="number"
                    step={10000}
                    value={newLeadForm.budget_pen}
                    onChange={(e) => setNewLeadForm({ ...newLeadForm, budget_pen: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl tabular-nums"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Propiedad de Interés</label>
                <select
                  value={newLeadForm.interested_property_id}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, interested_property_id: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white"
                >
                  <option value="">-- Sin propiedad asignada --</option>
                  {tenantProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.district} - {formatPEN(p.price_pen)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notas Iniciales</label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre crédito, zona de interés en Arequipa..."
                  value={newLeadForm.notes}
                  onChange={(e) => setNewLeadForm({ ...newLeadForm, notes: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer"
                >
                  Guardar Lead en Canvas
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
