import React, { useState } from 'react';
import { Tenant, Lead, LeadStatus, Property } from '../types';
import { formatPEN, formatWhatsAppLink, formatDateSpanish } from '../utils/formatters';
import { 
  Users, 
  Plus, 
  Search, 
  X, 
  Phone, 
  MessageCircle, 
  Calendar, 
  Building2, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  ArrowRight, 
  Filter, 
  DollarSign, 
  MapPin, 
  CheckCircle2, 
  Sparkles,
  Columns3,
  Network,
  ChevronRight,
  GripVertical
} from 'lucide-react';

interface CrmKanbanViewProps {
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
  onSwitchToCanvas?: () => void;
}

const COLUMNS: {
  status: LeadStatus;
  title: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  lightBg: string;
}[] = [
  {
    status: 'nuevo',
    title: 'Nuevo Lead',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    borderColor: 'border-blue-500/30',
    lightBg: 'hover:border-blue-400/50',
  },
  {
    status: 'contactado',
    title: 'Contactado',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-[#FFCD00]',
    borderColor: 'border-[#FFCD00]/40',
    lightBg: 'hover:border-[#FFCD00]/60',
  },
  {
    status: 'visita',
    title: 'Visita Programada',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    borderColor: 'border-purple-500/40',
    lightBg: 'hover:border-purple-400/60',
  },
  {
    status: 'cerrado',
    title: 'Cerrado / Ganado',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    borderColor: 'border-emerald-500/40',
    lightBg: 'hover:border-emerald-400/60',
  },
];

const AREQUIPA_DISTRICTS = [
  'Todos',
  'Cayma',
  'Yanahuara',
  'Cerro Colorado',
  'José Luis Bustamante y Rivero',
  'Paucarpata',
  'Selva Alegre',
];

const BUDGET_RANGES = [
  { id: 'all', label: 'Todos los montos' },
  { id: 'low', label: '< S/. 400,000', max: 400000 },
  { id: 'mid', label: 'S/. 400k - S/. 800k', min: 400000, max: 800000 },
  { id: 'high', label: '> S/. 800,000', min: 800000 },
];

export const CrmKanbanView: React.FC<CrmKanbanViewProps> = ({
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
  onSwitchToCanvas,
}) => {
  // Filtros
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('Todos');
  const [selectedBudgetRange, setSelectedBudgetRange] = useState('all');

  // Drag and Drop state
  const [draggedLeadId, setDraggedLeadId] = useState<string | null>(null);
  const [activeDropColumn, setActiveDropColumn] = useState<LeadStatus | null>(null);

  // Modal para editar lead
  const [editingLead, setEditingLead] = useState<Lead | null>(null);

  // Formulario nuevo lead
  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    email: '',
    status: 'nuevo' as LeadStatus,
    budget_pen: 450000,
    interested_property_id: '',
    notes: '',
    source: 'Manual / Agente',
  });

  const tenantLeads = leads.filter((l) => l.tenant_id === tenant.id);

  // Aplicar filtros
  const filteredLeads = tenantLeads.filter((lead) => {
    // 1. Búsqueda de texto
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      const matchName = lead.full_name.toLowerCase().includes(q);
      const matchPhone = lead.phone.includes(q);
      const matchEmail = lead.email.toLowerCase().includes(q);
      const matchNotes = lead.notes.toLowerCase().includes(q);
      if (!matchName && !matchPhone && !matchEmail && !matchNotes) return false;
    }

    // 2. Filtro por Distrito de Arequipa (asociado a la propiedad de interés o notas)
    if (selectedDistrict !== 'Todos') {
      const prop = properties.find((p) => p.id === lead.interested_property_id);
      const propDistrict = prop ? prop.district.toLowerCase() : '';
      const notesLower = lead.notes.toLowerCase();
      const targetLower = selectedDistrict.toLowerCase();

      const matchesDistrict = propDistrict.includes(targetLower) || notesLower.includes(targetLower);
      if (!matchesDistrict) return false;
    }

    // 3. Filtro por rango de Presupuesto en Soles (PEN)
    if (selectedBudgetRange !== 'all') {
      const range = BUDGET_RANGES.find((r) => r.id === selectedBudgetRange);
      if (range) {
        if (range.min !== undefined && lead.budget_pen < range.min) return false;
        if (range.max !== undefined && lead.budget_pen > range.max) return false;
      }
    }

    return true;
  });

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, leadId: string) => {
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedLeadId(leadId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (activeDropColumn !== status) {
      setActiveDropColumn(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>, status: LeadStatus) => {
    e.preventDefault();
    if (activeDropColumn === status) {
      setActiveDropColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetStatus: LeadStatus) => {
    e.preventDefault();
    const leadId = e.dataTransfer.getData('text/plain') || draggedLeadId;
    if (leadId) {
      onUpdateLeadStatus(leadId, targetStatus);
    }
    setDraggedLeadId(null);
    setActiveDropColumn(null);
  };

  const handleDragEnd = () => {
    setDraggedLeadId(null);
    setActiveDropColumn(null);
  };

  // Crear lead submit
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddLead({
      tenant_id: tenant.id,
      full_name: formData.full_name,
      phone: formData.phone,
      email: formData.email,
      status: formData.status,
      budget_pen: Number(formData.budget_pen),
      interested_property_id: formData.interested_property_id || undefined,
      notes: formData.notes,
      source: formData.source,
    });
    setIsNewLeadModalOpen(false);
    setFormData({
      full_name: '',
      phone: '',
      email: '',
      status: 'nuevo',
      budget_pen: 450000,
      interested_property_id: '',
      notes: '',
      source: 'Manual / Agente',
    });
  };

  // Guardar edición
  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLead) return;
    onUpdateLead(editingLead.id, {
      full_name: editingLead.full_name,
      phone: editingLead.phone,
      email: editingLead.email,
      budget_pen: Number(editingLead.budget_pen),
      interested_property_id: editingLead.interested_property_id || undefined,
      notes: editingLead.notes,
    });
    setEditingLead(null);
  };

  const hasActiveFilters = searchQuery !== '' || selectedDistrict !== 'Todos' || selectedBudgetRange !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDistrict('Todos');
    setSelectedBudgetRange('all');
  };

  // Mover al siguiente estado con un clic
  const getNextStatus = (current: LeadStatus): LeadStatus | null => {
    if (current === 'nuevo') return 'contactado';
    if (current === 'contactado') return 'visita';
    if (current === 'visita') return 'cerrado';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Encabezado Principal y Selector de Vistas */}
      <div className="glass-presidential rounded-3xl p-6 border border-white/10 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#FFCD00] mb-1">
              <Sparkles className="w-4 h-4 text-[#FFCD00]" />
              <span>CRM Multi-Tenant · Embudo Inmobiliario</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>Gestión de Leads & Negociaciones</span>
              <span className="text-sm font-normal text-slate-300">({tenant.agent_name})</span>
            </h1>
            <p className="text-xs text-slate-300 mt-1">
              Arrastra y suelta tarjetas entre columnas para actualizar el estado del prospecto en tiempo real.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Alternador de vista Kanban / Canvas */}
            <div className="flex items-center bg-white/10 p-1 rounded-2xl border border-white/15">
              <button
                type="button"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-[#FFCD00] text-[#0A192F] font-bold text-xs shadow-md"
              >
                <Columns3 className="w-3.5 h-3.5" />
                <span>Columnas Kanban</span>
              </button>
              {onSwitchToCanvas && (
                <button
                  type="button"
                  onClick={onSwitchToCanvas}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/10 text-xs font-semibold transition cursor-pointer"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Canvas Espacial</span>
                </button>
              )}
            </div>

            {/* Botón Crear Lead */}
            <button
              onClick={() => setIsNewLeadModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] font-black text-xs rounded-xl shadow-lg transition transform hover:scale-102 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Lead</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros Rápidos */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Buscador */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por cliente, teléfono, correo o notas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-xl text-xs text-white placeholder-slate-400 focus:outline-none focus:border-[#FFCD00] focus:ring-1 focus:ring-[#FFCD00] transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filtro por Rango de Presupuesto en Soles */}
            <div className="md:col-span-4 flex items-center gap-2 bg-white/5 p-1 rounded-xl border border-white/10">
              <DollarSign className="w-3.5 h-3.5 text-[#FFCD00] ml-2 shrink-0" />
              <select
                value={selectedBudgetRange}
                onChange={(e) => setSelectedBudgetRange(e.target.value)}
                className="w-full bg-transparent text-xs text-white border-none focus:outline-none cursor-pointer pr-3"
              >
                {BUDGET_RANGES.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#0A192F] text-white">
                    Presupuesto: {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Contador y Reset de filtros */}
            <div className="md:col-span-3 flex items-center justify-between md:justify-end gap-3 text-xs">
              <span className="text-slate-300">
                Mostrando <strong className="text-[#FFCD00] font-mono">{filteredLeads.length}</strong> de {tenantLeads.length} leads
              </span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-amber-400 hover:text-amber-300 underline font-medium cursor-pointer"
                >
                  Limpiar filtros
                </button>
              )}
            </div>
          </div>

          {/* Filtros Rápidos por Distritos de Arequipa (Botones segmentados) */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-slate-300 font-semibold flex items-center gap-1 shrink-0 mr-1">
              <MapPin className="w-3.5 h-3.5 text-[#FFCD00]" />
              <span>Distrito Arequipa:</span>
            </span>
            {AREQUIPA_DISTRICTS.map((dist) => {
              const active = selectedDistrict === dist;
              return (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setSelectedDistrict(dist)}
                  className={`px-3 py-1 rounded-lg transition whitespace-nowrap cursor-pointer text-xs font-medium ${
                    active
                      ? 'bg-[#FFCD00] text-[#0A192F] font-bold shadow-xs'
                      : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  {dist}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tablero Kanban de 4 Columnas con Drag & Drop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colLeads = filteredLeads.filter((l) => l.status === col.status);
          const colTotalBudget = colLeads.reduce((acc, curr) => acc + curr.budget_pen, 0);
          const isOver = activeDropColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`rounded-2xl transition-all duration-200 border flex flex-col min-h-[580px] ${
                isOver
                  ? 'border-2 border-dashed border-[#FFCD00] bg-[#FFCD00]/10 scale-[1.01] shadow-xl'
                  : 'bg-white/70 backdrop-blur-md border-slate-200 shadow-sm'
              }`}
            >
              {/* Encabezado de la Columna */}
              <div className="p-4 border-b border-slate-200/80 bg-white/90 rounded-t-2xl">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      col.status === 'nuevo' ? 'bg-blue-500' :
                      col.status === 'contactado' ? 'bg-[#FFCD00]' :
                      col.status === 'visita' ? 'bg-purple-500' : 'bg-emerald-500'
                    }`} />
                    <h3 className="font-black text-sm text-[#0A192F]">{col.title}</h3>
                  </div>
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                    {colLeads.length}
                  </span>
                </div>

                {/* Subtotal en Soles (PEN) */}
                <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium">
                  <span>Cartera potencial:</span>
                  <span className="font-mono font-bold text-[#0A192F] tabular-nums">
                    {formatPEN(colTotalBudget)}
                  </span>
                </div>
              </div>

              {/* Lista de Tarjetas Arrastrables */}
              <div className="p-3 space-y-3 flex-1 flex flex-col">
                {colLeads.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center border-2 border-dashed border-slate-200 rounded-xl text-slate-400">
                    <p className="text-xs font-medium">No hay prospectos en esta etapa</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {isOver ? '¡Suelta la tarjeta aquí!' : 'Arrastra un lead a esta columna'}
                    </p>
                  </div>
                ) : (
                  colLeads.map((lead) => {
                    const interestedProp = properties.find((p) => p.id === lead.interested_property_id);
                    const isBeingDragged = draggedLeadId === lead.id;
                    const nextStage = getNextStatus(lead.status);

                    return (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, lead.id)}
                        onDragEnd={handleDragEnd}
                        className={`group bg-white rounded-xl p-3.5 border border-slate-200 shadow-xs hover:shadow-md transition-all cursor-grab active:cursor-grabbing relative ${
                          isBeingDragged ? 'opacity-40 scale-95 ring-2 ring-[#FFCD00]' : 'hover:-translate-y-0.5'
                        }`}
                      >
                        {/* Drag Handle & Titular */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 shrink-0" />
                            <h4 className="font-bold text-sm text-[#0A192F] truncate">
                              {lead.full_name}
                            </h4>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditingLead(lead)}
                              title="Editar Lead"
                              className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`¿Eliminar al lead ${lead.full_name}?`)) {
                                  onDeleteLead(lead.id);
                                }
                              }}
                              title="Eliminar Lead"
                              className="p-1 text-slate-400 hover:text-red-600 rounded-md hover:bg-slate-100 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Presupuesto en Soles */}
                        <div className="flex items-center justify-between text-xs py-1 border-y border-slate-100 my-2">
                          <span className="text-slate-500 text-[11px]">Presupuesto PEN:</span>
                          <span className="font-mono font-bold text-[#0A192F] tabular-nums">
                            {formatPEN(lead.budget_pen)}
                          </span>
                        </div>

                        {/* Propiedad de interés (si tiene) */}
                        {interestedProp && (
                          <div className="mb-2.5 p-2 rounded-lg bg-slate-50 border border-slate-100 flex items-center gap-2">
                            <img
                              src={interestedProp.image_url}
                              alt={interestedProp.title}
                              className="w-10 h-10 rounded-md object-cover shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold text-[#0A192F] truncate">
                                {interestedProp.title}
                              </p>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-[#FFCD00]" />
                                <span className="truncate">{interestedProp.district}</span>
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Notas breves */}
                        {lead.notes && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 mb-3 bg-amber-50/60 p-2 rounded-lg border border-amber-100/80">
                            {lead.notes}
                          </p>
                        )}

                        {/* Barra de Acciones Rápidas */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5">
                          {/* Botón WhatsApp */}
                          <a
                            href={formatWhatsAppLink(
                              lead.phone,
                              `Hola ${lead.full_name}, te saluda ${tenant.agent_name} de InmoTenant Arequipa. Te contacto respecto a tu consulta inmobiliaria.`
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold transition"
                            title="Conversar por WhatsApp"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>

                          {/* Botón Agendar Visita */}
                          <button
                            onClick={() => onScheduleAppointment(lead.id, lead.interested_property_id)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#0A192F] hover:bg-slate-800 text-white text-[11px] font-medium transition cursor-pointer"
                            title="Agendar cita de visita en Arequipa"
                          >
                            <Calendar className="w-3 h-3 text-[#FFCD00]" />
                            <span>Agendar</span>
                          </button>

                          {/* Avanzar de etapa rápido */}
                          {nextStage && (
                            <button
                              onClick={() => onUpdateLeadStatus(lead.id, nextStage)}
                              title={`Avanzar a ${nextStage}`}
                              className="p-1 rounded-lg bg-slate-100 hover:bg-[#FFCD00] hover:text-[#0A192F] text-slate-600 transition cursor-pointer"
                            >
                              <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Crear Nuevo Lead */}
      {isNewLeadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-white max-w-lg w-full rounded-2xl shadow-2xl border border-white/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0A192F] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#FFCD00]" />
                <h3 className="font-bold text-sm">Registrar Nuevo Lead (Arequipa)</h3>
              </div>
              <button
                onClick={() => setIsNewLeadModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Rodrigo Pacheco Salazar"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="+51 954 112 233"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="cliente@ejemplo.pe"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Presupuesto (PEN S/.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={10000}
                    step={10000}
                    value={formData.budget_pen}
                    onChange={(e) => setFormData({ ...formData, budget_pen: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Etapa Inicial
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as LeadStatus })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                  >
                    <option value="nuevo">Nuevo Lead</option>
                    <option value="contactado">Contactado</option>
                    <option value="visita">Visita Programada</option>
                    <option value="cerrado">Cerrado / Ganado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Propiedad de Interés (Opcional)
                </label>
                <select
                  value={formData.interested_property_id}
                  onChange={(e) => setFormData({ ...formData, interested_property_id: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                >
                  <option value="">Ninguna / Búsqueda General</option>
                  {properties
                    .filter((p) => p.tenant_id === tenant.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.district} - {formatPEN(p.price_pen)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notas / Requerimientos Específicos
                </label>
                <textarea
                  rows={2}
                  placeholder="Busca departamento cerca a Av. Ejército en Cayma, pago al contado..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsNewLeadModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Guardar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Lead */}
      {editingLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="glass-white max-w-lg w-full rounded-2xl shadow-2xl border border-white/40 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-[#0A192F] text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-[#FFCD00]" />
                <h3 className="font-bold text-sm">Editar Lead: {editingLead.full_name}</h3>
              </div>
              <button
                onClick={() => setEditingLead(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editingLead.full_name}
                  onChange={(e) => setEditingLead({ ...editingLead, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Teléfono / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={editingLead.phone}
                    onChange={(e) => setEditingLead({ ...editingLead, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    value={editingLead.email}
                    onChange={(e) => setEditingLead({ ...editingLead, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Presupuesto (PEN S/.) *
                </label>
                <input
                  type="number"
                  required
                  min={10000}
                  step={10000}
                  value={editingLead.budget_pen}
                  onChange={(e) => setEditingLead({ ...editingLead, budget_pen: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Propiedad de Interés
                </label>
                <select
                  value={editingLead.interested_property_id || ''}
                  onChange={(e) => setEditingLead({ ...editingLead, interested_property_id: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                >
                  <option value="">Ninguna / Búsqueda General</option>
                  {properties
                    .filter((p) => p.tenant_id === tenant.id)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.district} - {formatPEN(p.price_pen)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Notas / Requerimientos
                </label>
                <textarea
                  rows={2}
                  value={editingLead.notes}
                  onChange={(e) => setEditingLead({ ...editingLead, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-[#0A192F] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingLead(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 font-semibold text-xs rounded-xl hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] font-black text-xs rounded-xl shadow-md transition cursor-pointer"
                >
                  Actualizar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
