import React, { useEffect, useState } from 'react';
import { Tenant, Lead, Property, Appointment, AppointmentStatus, VisitType } from '../types';
import { formatPEN, formatWhatsAppLink, formatDateSpanish } from '../utils/formatters';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  MessageCircle, 
  Building2, 
  User, 
  X,
  CalendarDays
} from 'lucide-react';

interface AgendaCalendarViewProps {
  tenant: Tenant;
  appointments: Appointment[];
  leads: Lead[];
  properties: Property[];
  onAddAppointment: (appointment: Omit<Appointment, 'id' | 'created_at'>) => void;
  onUpdateAppointmentStatus: (id: string, status: AppointmentStatus) => void;
  onDeleteAppointment: (id: string) => void;
  preselectedLeadId?: string;
  preselectedPropertyId?: string;
}

export const AgendaCalendarView: React.FC<AgendaCalendarViewProps> = ({
  tenant,
  appointments,
  leads,
  properties,
  onAddAppointment,
  onUpdateAppointmentStatus,
  onDeleteAppointment,
  preselectedLeadId,
  preselectedPropertyId,
}) => {
  const todayIso = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayIso);
  const [isModalOpen, setIsModalOpen] = useState(Boolean(preselectedLeadId));

  // Form State
  const [formLeadId, setFormLeadId] = useState(preselectedLeadId || '');
  const [formPropertyId, setFormPropertyId] = useState(preselectedPropertyId || '');
  const [formDate, setFormDate] = useState(todayIso);
  const [formTimeSlot, setFormTimeSlot] = useState('10:30 AM');
  const [formVisitType, setFormVisitType] = useState<VisitType>('presencial');
  const [formNotes, setFormNotes] = useState('');

  // Re-sincronizar el formulario cuando llega una nueva selección desde el CRM
  // (el componente ya está montado, por lo que los initial state no se aplican solos).
  useEffect(() => {
    if (preselectedLeadId) {
      setFormLeadId(preselectedLeadId);
      setFormPropertyId(preselectedPropertyId || '');
      setIsModalOpen(true);
    }
  }, [preselectedLeadId, preselectedPropertyId]);

  const rawTenantAppointments = appointments.filter((a) => a.tenant_id === tenant.id);
  const tenantAppointments = rawTenantAppointments.length > 0 ? rawTenantAppointments : appointments;
  const rawTenantLeads = leads.filter((l) => l.tenant_id === tenant.id);
  const tenantLeads = rawTenantLeads.length > 0 ? rawTenantLeads : leads;
  const rawTenantProperties = properties.filter((p) => p.tenant_id === tenant.id);
  const tenantProperties = rawTenantProperties.length > 0 ? rawTenantProperties : properties;

  // Group appointments by date
  const appointmentsForSelectedDate = tenantAppointments
    .filter((a) => a.scheduled_at === selectedDate || (!tenantAppointments.some(x => x.scheduled_at === selectedDate) && a.status === 'programada'))
    .sort((a, b) => a.time_slot.localeCompare(b.time_slot));

  // Generar la barra de calendario: 7 días a partir del día seleccionado
  const calendarDays = (() => {
    const base = new Date(`${selectedDate}T12:00:00`);
    const todayStr = new Date().toISOString().split('T')[0];
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = new Intl.DateTimeFormat('es-PE', { weekday: 'short', day: '2-digit' }).format(d);
      return { date: iso, label: label.charAt(0).toUpperCase() + label.slice(1) + (iso === todayStr ? ' (Hoy)' : '') };
    });
  })();

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formLeadId || !formPropertyId) {
      alert('Por favor selecciona un lead y una propiedad');
      return;
    }

    onAddAppointment({
      tenant_id: tenant.id,
      lead_id: formLeadId,
      property_id: formPropertyId,
      scheduled_at: formDate,
      time_slot: formTimeSlot,
      status: 'programada',
      visit_type: formVisitType,
      notes: formNotes,
    });

    setSelectedDate(formDate);
    setIsModalOpen(false);
    setFormNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Agenda Inmobiliaria · Visitas y Recorridos
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Programación de visitas para los inmuebles de <span className="font-semibold text-slate-700">{tenant.agent_name}</span> en Arequipa
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-xl transition cursor-pointer shadow-xs whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>Programar Nueva Visita</span>
        </button>
      </div>

      {/* Selector de Días de la Semana */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-3 shadow-xs">
        <div className="flex items-center justify-between gap-2 overflow-x-auto pb-1">
          {calendarDays.map((d) => {
            const countForDay = tenantAppointments.filter((a) => a.scheduled_at === d.date && a.status === 'programada').length;
            const isSelected = selectedDate === d.date;

            return (
              <button
                key={d.date}
                onClick={() => setSelectedDate(d.date)}
                className={`flex-1 min-w-[110px] py-2.5 px-3 rounded-xl text-center transition cursor-pointer border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-md scale-102'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200/80'
                }`}
              >
                <div className="text-xs font-bold whitespace-nowrap">{d.label}</div>
                <div className={`text-[11px] mt-0.5 ${isSelected ? 'text-slate-300 font-semibold' : 'text-slate-500'}`}>
                  {countForDay > 0 ? `${countForDay} ${countForDay === 1 ? 'cita' : 'citas'}` : 'Sin citas'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista de Visitas del Día Seleccionado */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">
              Visitas para {formatDateSpanish(selectedDate)}
            </h2>
            <span className="text-xs font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
              {appointmentsForSelectedDate.length} visitas
            </span>
          </div>

          <span className="text-xs text-slate-400">
            Arequipa (Zona Horaria GMT-5)
          </span>
        </div>

        {appointmentsForSelectedDate.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-2">
            <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm">No hay citas programadas para este día.</p>
            <button
              onClick={() => {
                setFormDate(selectedDate);
                setIsModalOpen(true);
              }}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              + Programar visita para el {formatDateSpanish(selectedDate)}
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {appointmentsForSelectedDate.map((app) => {
              const lead = tenantLeads.find((l) => l.id === app.lead_id);
              const prop = tenantProperties.find((p) => p.id === app.property_id);
              const waMsg = `Hola ${lead?.full_name || 'estimado cliente'}, le saluda ${tenant.agent_name}. Le recordamos su visita programada para hoy a las ${app.time_slot} hrs en ${prop?.address || 'la propiedad'} (${prop?.district || 'Arequipa'}). ¿Nos confirma su puntual asistencia?`;

              return (
                <div key={app.id} className="py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Bloque Horario */}
                    <div className="bg-slate-100 rounded-lg p-2.5 text-center min-w-[70px] shrink-0 border border-slate-200">
                      <Clock className="w-3.5 h-3.5 text-slate-500 mx-auto mb-0.5" />
                      <span className="text-xs font-bold font-mono text-slate-900 block">
                        {app.time_slot}
                      </span>
                      <span className="text-[10px] text-slate-500 capitalize">
                        {app.visit_type}
                      </span>
                    </div>

                    {/* Datos del Prospecto y Propiedad */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {lead?.full_name || 'Cliente sin asignar'}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs font-mono text-slate-600">
                          {lead?.phone}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded capitalize ${
                            app.status === 'programada'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : app.status === 'completada'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-red-50 text-red-700 border border-red-200'
                          }`}
                        >
                          {app.status}
                        </span>
                      </div>

                      <div className="text-xs text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold">{prop?.title}</span>
                        <span className="text-slate-400">({prop?.district})</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{prop?.address}</span>
                      </div>

                      {app.notes && (
                        <p className="text-xs text-slate-500 italic bg-slate-50 p-1.5 rounded">
                          "{app.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-2 shrink-0">
                    {lead?.phone && (
                      <a
                        href={formatWhatsAppLink(lead.phone, waMsg)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>Confirmar WhatsApp</span>
                      </a>
                    )}

                    {app.status === 'programada' && (
                      <>
                        <button
                          onClick={() => onUpdateAppointmentStatus(app.id, 'completada')}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                          title="Marcar como Completada"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onUpdateAppointmentStatus(app.id, 'cancelada')}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Cancelar Cita"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Programar Cita */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Programar Visita Inmobiliaria</h3>
                <p className="text-xs text-slate-500">Agendar cita para {tenant.agent_name}</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="p-5 space-y-4">
              {/* Seleccionar Lead */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Prospecto (Lead)</label>
                <select
                  required
                  value={formLeadId}
                  onChange={(e) => setFormLeadId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Seleccionar Lead del CRM --</option>
                  {tenantLeads.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.full_name} ({l.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seleccionar Propiedad */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Propiedad en Arequipa</label>
                <select
                  required
                  value={formPropertyId}
                  onChange={(e) => setFormPropertyId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                >
                  <option value="">-- Seleccionar Inmueble --</option>
                  {tenantProperties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.district} - {formatPEN(p.price_pen)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Fecha y Hora */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Fecha de Visita</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Hora</label>
                  <select
                    value={formTimeSlot}
                    onChange={(e) => setFormTimeSlot(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white font-mono"
                  >
                    <option value="09:00">09:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="12:00">12:00 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="17:30">05:30 PM</option>
                    <option value="18:30">06:30 PM</option>
                  </select>
                </div>
              </div>

              {/* Modalidad */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Tipo de Visita</label>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="visit_type"
                      checked={formVisitType === 'presencial'}
                      onChange={() => setFormVisitType('presencial')}
                    />
                    <span>Presencial en el inmueble</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="visit_type"
                      checked={formVisitType === 'virtual'}
                      onChange={() => setFormVisitType('virtual')}
                    />
                    <span>Recorrido Virtual / Zoom</span>
                  </label>
                </div>
              </div>

              {/* Notas */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Notas para la Visita</label>
                <textarea
                  rows={2}
                  placeholder="Llevar planos, coordinar con conserjería el pase vehicular..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer"
                >
                  Confirmar y Agendar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
