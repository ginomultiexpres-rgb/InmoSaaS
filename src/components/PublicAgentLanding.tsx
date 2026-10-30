import React, { useState } from 'react';
import { Tenant, Property, PropertyType } from '../types';
import { formatPEN, formatWhatsAppLink } from '../utils/formatters';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  MessageCircle, 
  Phone, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  ExternalLink,
  Search,
  Filter,
  Calendar,
  X,
  Send,
  Star
} from 'lucide-react';

interface PublicAgentLandingProps {
  tenant: Tenant;
  properties: Property[];
  tenants: Tenant[];
  onSelectTenant: (tenant: Tenant) => void;
  onBackToDashboard: () => void;
  onPublicLeadSubmit: (leadData: {
    tenant_id: string;
    full_name: string;
    phone: string;
    email: string;
    budget_pen: number;
    interested_property_id?: string;
    notes: string;
    source: string;
  }) => void;
}

export const PublicAgentLanding: React.FC<PublicAgentLandingProps> = ({
  tenant,
  properties,
  tenants,
  onSelectTenant,
  onBackToDashboard,
  onPublicLeadSubmit,
}) => {
  // Public Filters
  const [selectedType, setSelectedType] = useState<string>('todos');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('todos');
  const [maxPrice, setMaxPrice] = useState<number>(2000000);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected Property for Modal
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [leadFormSubmitted, setLeadFormSubmitted] = useState(false);

  // Lead Form State
  const [visitorName, setVisitorName] = useState('');
  const [visitorPhone, setVisitorPhone] = useState('+51 9');
  const [visitorEmail, setVisitorEmail] = useState('');
  const [visitorNotes, setVisitorNotes] = useState('');

  // Only active properties of this tenant
  const activeProperties = properties.filter(
    (p) => p.tenant_id === tenant.id && p.status === 'activa'
  );

  const filteredProperties = activeProperties.filter((p) => {
    if (selectedType !== 'todos' && p.property_type !== selectedType) return false;
    if (selectedDistrict !== 'todos' && p.district !== selectedDistrict) return false;
    if (p.price_pen > maxPrice) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        p.title.toLowerCase().includes(q) ||
        p.district.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitorName.trim() || !visitorPhone.trim()) return;

    onPublicLeadSubmit({
      tenant_id: tenant.id,
      full_name: visitorName,
      phone: visitorPhone,
      email: visitorEmail,
      budget_pen: selectedProperty ? selectedProperty.price_pen : maxPrice,
      interested_property_id: selectedProperty?.id,
      notes: visitorNotes || (selectedProperty ? `Interesado en visitar: ${selectedProperty.title}` : 'Contacto desde landing pública'),
      source: `Landing /p/${tenant.slug}`,
    });

    setLeadFormSubmitted(true);
    setTimeout(() => {
      setLeadFormSubmitted(false);
      setIsContactModalOpen(false);
      setVisitorName('');
      setVisitorPhone('+51 9');
      setVisitorEmail('');
      setVisitorNotes('');
    }, 2200);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Barra de Simulación del Navegador / URL */}
      <div className="bg-slate-900 text-white px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 text-slate-300 hover:text-white px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Volver al Dashboard</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-md text-slate-300 font-mono text-[11px] border border-slate-800">
            <span className="text-emerald-400">🔒 https://</span>
            <span>miapp.com/p/</span>
            <span className="text-white font-bold">{tenant.slug}</span>
          </div>
        </div>

        {/* Selector de slug / tenant en tiempo real */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 text-[11px]">Probar con otro agente:</span>
          <select
            value={tenant.id}
            onChange={(e) => {
              const found = tenants.find((t) => t.id === e.target.value);
              if (found) onSelectTenant(found);
            }}
            className="bg-slate-800 text-white border border-slate-700 rounded px-2 py-1 text-xs cursor-pointer"
          >
            {tenants.map((t) => (
              <option key={t.id} value={t.id}>
                {t.agent_name} (/p/{t.slug})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header Público de la Marca del Agente en Glass Presidential */}
      <header className="sticky top-0 z-30 glass-presidential border-b border-white/15 text-white">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-black text-lg text-white tracking-tight">
              {tenant.name}
            </span>
            <span className="hidden sm:inline-block text-[11px] font-bold bg-[#FFCD00] text-[#0A192F] px-2 py-0.5 rounded-md">
              {tenant.location}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <a
              href={formatWhatsAppLink(
                tenant.phone,
                `Hola ${tenant.agent_name}, vi su portal web de propiedades en Arequipa y deseo asesoría personalizada.`
              )}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-black text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-xl transition shadow-md hover:scale-102"
            >
              <MessageCircle className="w-3.5 h-3.5 text-[#0A192F]" />
              <span>WhatsApp Directo</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero del Agente Inmobiliario en Glass White con Acentos Amarillo CAT */}
      <section className="glass-white border-b border-slate-200/80 py-10 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
          <div className="md:col-span-1 flex justify-center">
            <div className="relative w-36 h-36 rounded-3xl overflow-hidden border-4 border-[#FFCD00] shadow-2xl ring-4 ring-[#FFCD00]/20">
              <img
                src={tenant.avatar_url}
                alt={tenant.agent_name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="md:col-span-3 space-y-3 text-center md:text-left">
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#0A192F] bg-[#FFCD00] px-3 py-1 rounded-full shadow-xs">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0A192F]" />
              <span>Agente Inmobiliario Certificado en {tenant.location}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-[#0A192F]">
              {tenant.agent_name}
            </h1>

            <p className="text-slate-600 text-sm max-w-2xl leading-relaxed">
              {tenant.bio}
            </p>

            <div className="pt-2 flex flex-wrap justify-center md:justify-start gap-5 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#0A192F]" />
                {tenant.location}
              </span>
              <span className="flex items-center gap-1.5 font-mono">
                <Phone className="w-3.5 h-3.5 text-[#0A192F]" />
                {tenant.phone}
              </span>
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#0A192F]" />
                {tenant.email}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Contenido Principal: Filtros y Catálogo de Propiedades */}
      <main className="max-w-6xl mx-auto px-4 py-8 space-y-6 flex-1 w-full">
        {/* Barra de Filtros Interactivas */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            {/* Buscador */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Buscar por departamento, casa o zona en Arequipa..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Selectores */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 capitalize cursor-pointer"
              >
                <option value="todos">Todos los inmuebles</option>
                <option value="departamento">Departamentos</option>
                <option value="casa">Casas</option>
                <option value="terreno">Terrenos</option>
                <option value="oficina">Oficinas</option>
              </select>

              <select
                value={selectedDistrict}
                onChange={(e) => setSelectedDistrict(e.target.value)}
                className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 cursor-pointer"
              >
                <option value="todos">Todos los distritos</option>
                <option value="Cayma">Cayma</option>
                <option value="Yanahuara">Yanahuara</option>
                <option value="Cerro Colorado">Cerro Colorado</option>
                <option value="José Luis Bustamante y Rivero">Bustamante y Rivero</option>
                <option value="Sachaca">Sachaca</option>
                <option value="Cercado">Cercado</option>
              </select>
            </div>
          </div>

          {/* Rango de precio en Soles (PEN S/.) */}
          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
            <span className="flex items-center gap-1 font-medium">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              Presupuesto máximo: <strong className="text-slate-900 font-mono">{formatPEN(maxPrice)}</strong>
            </span>
            <input
              type="range"
              min={300000}
              max={2000000}
              step={50000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full sm:w-64 accent-blue-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Encabezado del Catálogo */}
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">
            Propiedades Disponibles ({filteredProperties.length})
          </h2>
          <span className="text-xs text-slate-500">
            Precios expresados en Soles (PEN)
          </span>
        </div>

        {/* Grid de Propiedades */}
        {filteredProperties.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-medium">No hay propiedades disponibles con estos filtros.</p>
            <p className="text-xs text-slate-400">Intenta ampliar el presupuesto o seleccionar "Todos los distritos".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((prop) => {
              const waPropMsg = `Hola ${tenant.agent_name}, estoy interesado(a) en la propiedad "${prop.title}" (${formatPEN(prop.price_pen)}) en ${prop.district}. Deseo coordinar una visita.`;

              return (
                <div
                  key={prop.id}
                  className="glass-card rounded-3xl overflow-hidden shadow-xs hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
                >
                  <div>
                    {/* Imagen */}
                    <div 
                      onClick={() => setSelectedProperty(prop)}
                      className="relative aspect-16/9 bg-slate-100 overflow-hidden cursor-pointer"
                    >
                      <img
                        src={prop.image_url}
                        alt={prop.title}
                        className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-[#0A192F] text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs capitalize">
                        {prop.property_type}
                      </div>
                      {prop.featured && (
                        <div className="absolute top-3 right-3 bg-[#FFCD00] text-[#0A192F] text-[11px] font-black px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                          <Star className="w-3 h-3 fill-[#0A192F]" />
                          Destacada
                        </div>
                      )}
                    </div>

                    {/* Contenido */}
                    <div className="p-5 space-y-3">
                      <div className="text-2xl font-black text-[#0A192F] tabular-nums">
                        {formatPEN(prop.price_pen)}
                      </div>

                      <h3
                        onClick={() => setSelectedProperty(prop)}
                        className="font-bold text-[#0A192F] text-sm hover:text-[#FFCD00] transition cursor-pointer line-clamp-1"
                      >
                        {prop.title}
                      </h3>

                      <p className="text-xs text-slate-500 flex items-center gap-1 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-[#0A192F] shrink-0" />
                        <span className="truncate">{prop.address}, {prop.district}</span>
                      </p>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {prop.description}
                      </p>

                      {/* Specs */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
                        {prop.bedrooms > 0 && (
                          <span className="flex items-center gap-1">
                            <Bed className="w-3.5 h-3.5 text-[#0A192F]" />
                            {prop.bedrooms} dorms.
                          </span>
                        )}
                        {prop.bathrooms > 0 && (
                          <span className="flex items-center gap-1">
                            <Bath className="w-3.5 h-3.5 text-[#0A192F]" />
                            {prop.bathrooms} baños
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Maximize className="w-3.5 h-3.5 text-[#0A192F]" />
                          {prop.area_m2} m²
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Botones de acción */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-100 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setSelectedProperty(prop);
                        setIsContactModalOpen(true);
                      }}
                      className="flex-1 py-2 px-3 text-xs font-bold text-[#0A192F] bg-white hover:bg-slate-100 border border-slate-200/80 rounded-2xl transition cursor-pointer text-center"
                    >
                      Agendar Visita
                    </button>

                    <a
                      href={formatWhatsAppLink(tenant.phone, waPropMsg)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 py-2 px-3 text-xs font-black text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-2xl transition flex items-center justify-center gap-1.5 shadow-md"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 bg-white border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500">
        <p className="font-semibold text-slate-700">{tenant.name} · {tenant.location}</p>
        <p className="mt-1">Página pública generada por el SaaS inmobiliario multi-tenant InmoTenant.</p>
        <p className="mt-2 text-[11px] text-slate-400">
          Ruta Next.js: <span className="font-mono">app/p/[slug]/page.tsx</span> · Filtrado aislado por <span className="font-mono">tenant.slug = "{tenant.slug}"</span>
        </p>
      </footer>

      {/* Modal / Ficha Técnica Detallada de la Propiedad */}
      {selectedProperty && !isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
            <div className="relative aspect-16/9 bg-slate-900">
              <img
                src={selectedProperty.image_url}
                alt={selectedProperty.title}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
              <button
                onClick={() => setSelectedProperty(null)}
                className="absolute top-4 right-4 p-2 bg-black/60 hover:bg-black/80 text-white rounded-full transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur px-3 py-1 rounded-lg text-slate-900 font-bold text-lg tabular-nums shadow-md">
                {formatPEN(selectedProperty.price_pen)}
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-blue-600 block">
                  {selectedProperty.property_type} en {selectedProperty.district}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">
                  {selectedProperty.title}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {selectedProperty.address}, {selectedProperty.district}, Arequipa
                </p>
              </div>

              {/* Ficha técnica */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                <div>
                  <span className="text-xs text-slate-400 block">Dormitorios</span>
                  <span className="text-base font-bold text-slate-800">{selectedProperty.bedrooms}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Baños</span>
                  <span className="text-base font-bold text-slate-800">{selectedProperty.bathrooms}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-400 block">Área Construida</span>
                  <span className="text-base font-bold text-slate-800">{selectedProperty.area_m2} m²</span>
                </div>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-900 uppercase">Descripción de la Propiedad</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {selectedProperty.description}
                </p>
              </div>

              {/* Botones de acción modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
                <button
                  onClick={() => setIsContactModalOpen(true)}
                  className="flex-1 py-2.5 px-4 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <span>Solicitar Visita Guiada</span>
                </button>

                <a
                  href={formatWhatsAppLink(
                    tenant.phone,
                    `Hola ${tenant.agent_name}, deseo información y ficha técnica de la propiedad: "${selectedProperty.title}" (${formatPEN(selectedProperty.price_pen)}) en ${selectedProperty.district}.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-2.5 px-4 text-xs font-black text-[#0A192F] bg-[#FFCD00] hover:bg-[#E6B800] rounded-2xl transition flex items-center justify-center gap-2 shadow-md"
                >
                  <MessageCircle className="w-4 h-4 text-[#0A192F]" />
                  <span>Conversar por WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Solicitud de Visita / Captura de Lead */}
      {isContactModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Agendar Visita con {tenant.agent_name}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedProperty ? selectedProperty.title : 'Consulta de inmuebles en Arequipa'}
                </p>
              </div>
              <button
                onClick={() => setIsContactModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {leadFormSubmitted ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">¡Solicitud Enviada con Éxito!</h4>
                <p className="text-xs text-slate-600">
                  {tenant.agent_name} ha recibido tus datos y te contactará a la brevedad por WhatsApp.
                </p>
                <p className="text-[11px] text-blue-600 font-medium">
                  El prospecto ya se registró automáticamente en la columna "Nuevo" del CRM de este tenant.
                </p>
              </div>
            ) : (
              <form onSubmit={handleLeadSubmit} className="p-5 space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tu Nombre Completo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Gabriela Zúñiga"
                    value={visitorName}
                    onChange={(e) => setVisitorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Teléfono / WhatsApp (Perú)</label>
                  <input
                    type="text"
                    required
                    placeholder="+51 954 123 456"
                    value={visitorPhone}
                    onChange={(e) => setVisitorPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Correo Electrónico (Opcional)</label>
                  <input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={visitorEmail}
                    onChange={(e) => setVisitorEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Preferencia de Horario o Consulta</label>
                  <textarea
                    rows={2}
                    placeholder="Prefiero sábado por la tarde, tengo crédito hipotecario pre-aprobado..."
                    value={visitorNotes}
                    onChange={(e) => setVisitorNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsContactModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-black bg-[#FFCD00] hover:bg-[#E6B800] text-[#0A192F] rounded-2xl transition cursor-pointer flex items-center gap-1.5 shadow-md hover:scale-102"
                  >
                    <Send className="w-3.5 h-3.5 text-[#0A192F]" />
                    <span>Enviar Solicitud</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
