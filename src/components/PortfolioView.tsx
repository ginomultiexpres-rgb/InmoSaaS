import React, { useState } from 'react';
import { Tenant, Property, PropertyType, PropertyStatus } from '../types';
import { formatPEN } from '../utils/formatters';
import { 
  Building2, 
  MapPin, 
  Bed, 
  Bath, 
  Maximize, 
  Plus, 
  Search, 
  ExternalLink, 
  Copy, 
  Check, 
  Edit, 
  Trash2, 
  Star,
  Upload,
  X
} from 'lucide-react';

interface PortfolioViewProps {
  tenant: Tenant;
  properties: Property[];
  onAddProperty: (property: Omit<Property, 'id' | 'created_at'>) => void;
  onUpdateProperty: (id: string, updates: Partial<Property>) => void;
  onDeleteProperty: (id: string) => void;
  onNavigateToPublic: () => void;
  isNewModalOpen: boolean;
  setIsNewModalOpen: (open: boolean) => void;
}

const AREQUIPA_DISTRICTS = [
  'Cayma',
  'Yanahuara',
  'Cerro Colorado',
  'José Luis Bustamante y Rivero',
  'Sachaca',
  'Cercado',
  'Vallecito',
  'Miraflores',
];

const PRESET_IMAGES = [
  { label: 'Torre Cayma (Vista al Misti)', url: '/src/assets/images/prop_cayma_departamento_1793163597170.jpg' },
  { label: 'Casona Sillar Yanahuara', url: '/src/assets/images/prop_yanahuara_casa_1793163597657.jpg' },
  { label: 'Villa Cerro Colorado (Piscina)', url: '/src/assets/images/prop_cerro_colorado_residencia_1793163598104.jpg' },
];

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  tenant,
  properties,
  onAddProperty,
  onUpdateProperty,
  onDeleteProperty,
  onNavigateToPublic,
  isNewModalOpen,
  setIsNewModalOpen,
}) => {
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [filterDistrict, setFilterDistrict] = useState<string>('todos');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Editing state
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    property_type: 'departamento' as PropertyType,
    status: 'activa' as PropertyStatus,
    price_pen: 650000,
    bedrooms: 3,
    bathrooms: 2,
    area_m2: 120,
    district: 'Cayma',
    address: '',
    image_url: PRESET_IMAGES[0].url,
    featured: false,
  });

  const tenantProperties = properties.filter((p) => p.tenant_id === tenant.id);

  // Filtered properties
  const filteredProperties = tenantProperties.filter((p) => {
    if (filterType !== 'todos' && p.property_type !== filterType) return false;
    if (filterStatus !== 'todos' && p.status !== filterStatus) return false;
    if (filterDistrict !== 'todos' && p.district !== filterDistrict) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = p.title.toLowerCase().includes(q);
      const matchAddress = p.address.toLowerCase().includes(q);
      const matchDistrict = p.district.toLowerCase().includes(q);
      if (!matchTitle && !matchAddress && !matchDistrict) return false;
    }
    return true;
  });

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(`https://miapp.com/p/${tenant.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenCreateModal = () => {
    setEditingProperty(null);
    setFormData({
      title: '',
      slug: '',
      description: '',
      property_type: 'departamento',
      status: 'activa',
      price_pen: 650000,
      bedrooms: 3,
      bathrooms: 2,
      area_m2: 120,
      district: 'Cayma',
      address: '',
      image_url: PRESET_IMAGES[0].url,
      featured: false,
    });
    setIsNewModalOpen(true);
  };

  const handleOpenEditModal = (prop: Property) => {
    setEditingProperty(prop);
    setFormData({
      title: prop.title,
      slug: prop.slug,
      description: prop.description,
      property_type: prop.property_type,
      status: prop.status,
      price_pen: prop.price_pen,
      bedrooms: prop.bedrooms,
      bathrooms: prop.bathrooms,
      area_m2: prop.area_m2,
      district: prop.district,
      address: prop.address,
      image_url: prop.image_url,
      featured: prop.featured,
    });
    setIsNewModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.address.trim()) return;

    const autoSlug = formData.slug.trim() || formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    if (editingProperty) {
      onUpdateProperty(editingProperty.id, {
        ...formData,
        slug: autoSlug,
      });
    } else {
      onAddProperty({
        tenant_id: tenant.id,
        ...formData,
        slug: autoSlug,
        currency: 'PEN',
        gallery_urls: [formData.image_url],
      });
    }

    setIsNewModalOpen(false);
  };

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setFormData((prev) => ({ ...prev, image_url: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header con enlace público generado */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Portafolio Inmobiliario de {tenant.agent_name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestión completa de inmuebles en Arequipa aislados bajo <span className="font-mono text-slate-700">tenant_id: {tenant.id}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-mono text-slate-700">
            <span className="text-slate-400">Link público:</span>
            <span className="font-semibold text-blue-600">miapp.com/p/{tenant.slug}</span>
            <button
              onClick={handleCopyPublicLink}
              className="p-1 hover:bg-slate-200 rounded transition text-slate-500 hover:text-slate-800 cursor-pointer ml-1"
              title="Copiar enlace"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <button
            onClick={onNavigateToPublic}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 rounded-lg transition cursor-pointer"
          >
            <span>Ver Sitio Web</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Propiedad</span>
          </button>
        </div>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por título, dirección o distrito en Arequipa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tipo */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize cursor-pointer"
          >
            <option value="todos">Todos los tipos</option>
            <option value="departamento">Departamento</option>
            <option value="casa">Casa</option>
            <option value="terreno">Terreno</option>
            <option value="oficina">Oficina</option>
            <option value="local">Local Comercial</option>
          </select>

          {/* Distrito */}
          <select
            value={filterDistrict}
            onChange={(e) => setFilterDistrict(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
          >
            <option value="todos">Todos los distritos</option>
            {AREQUIPA_DISTRICTS.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>

          {/* Estado */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 capitalize cursor-pointer"
          >
            <option value="todos">Todos los estados</option>
            <option value="activa">Activa</option>
            <option value="reservada">Reservada</option>
            <option value="vendida">Vendida</option>
          </select>
        </div>
      </div>

      {/* Grid de Propiedades */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-500 space-y-3">
          <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm">No se encontraron propiedades para los filtros seleccionados.</p>
          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
          >
            Publicar primera propiedad
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((prop) => (
            <div
              key={prop.id}
              className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-xs hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group"
            >
              <div>
                {/* Imagen y badges de estado */}
                <div className="relative aspect-16/9 bg-slate-100 overflow-hidden">
                  <img
                    src={prop.image_url}
                    alt={prop.title}
                    className="w-full h-full object-cover group-hover:scale-104 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-slate-800 text-xs font-semibold px-2.5 py-0.5 rounded-lg shadow-xs capitalize">
                    {prop.property_type}
                  </div>
                  
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    {prop.featured && (
                      <span className="bg-amber-500 text-white text-xs font-medium px-2 py-0.5 rounded shadow-xs flex items-center gap-1">
                        <Star className="w-3 h-3 fill-white" />
                        Destacada
                      </span>
                    )}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded shadow-xs capitalize ${
                        prop.status === 'activa'
                          ? 'bg-emerald-600 text-white'
                          : prop.status === 'reservada'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-600 text-white'
                      }`}
                    >
                      {prop.status}
                    </span>
                  </div>
                </div>

                {/* Detalles */}
                <div className="p-5 space-y-3">
                  <div className="text-xl font-bold text-slate-900 tabular-nums">
                    {formatPEN(prop.price_pen)}
                  </div>

                  <h3 className="font-semibold text-slate-900 text-sm leading-snug line-clamp-2">
                    {prop.title}
                  </h3>

                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{prop.address}, {prop.district}</span>
                  </p>

                  <p className="text-xs text-slate-600 line-clamp-2">
                    {prop.description}
                  </p>

                  {/* Ficha técnica compacta */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    {prop.bedrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bed className="w-3.5 h-3.5 text-slate-400" />
                        {prop.bedrooms} dorms.
                      </span>
                    )}
                    {prop.bathrooms > 0 && (
                      <span className="flex items-center gap-1">
                        <Bath className="w-3.5 h-3.5 text-slate-400" />
                        {prop.bathrooms} baños
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Maximize className="w-3.5 h-3.5 text-slate-400" />
                      {prop.area_m2} m²
                    </span>
                  </div>
                </div>
              </div>

              {/* Botones de acción CRUD */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditModal(prop)}
                    className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-slate-200 rounded transition cursor-pointer"
                    title="Editar propiedad"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`¿Estás seguro de eliminar "${prop.title}"?`)) {
                        onDeleteProperty(prop.id);
                      }
                    }}
                    className="p-1.5 text-slate-600 hover:text-red-600 hover:bg-slate-200 rounded transition cursor-pointer"
                    title="Eliminar propiedad"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  {/* Selector rápido de estado */}
                  <select
                    value={prop.status}
                    onChange={(e) => onUpdateProperty(prop.id, { status: e.target.value as PropertyStatus })}
                    className="text-[11px] bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 cursor-pointer"
                  >
                    <option value="activa">Activa</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Creación / Edición */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-xl overflow-hidden my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  {editingProperty ? 'Editar Propiedad' : 'Publicar Nueva Propiedad'}
                </h2>
                <p className="text-xs text-slate-500">
                  Asociada al tenant <span className="font-semibold text-slate-700">{tenant.name}</span>
                </p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-5">
              {/* Título y Slug */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Título del Inmueble</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Penthouse con Terraza y Vista al Misti en Cayma"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              {/* Tipo, Distrito y Precio en PEN */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Tipo de Inmueble</label>
                  <select
                    value={formData.property_type}
                    onChange={(e) => setFormData({ ...formData, property_type: e.target.value as PropertyType })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="departamento">Departamento</option>
                    <option value="casa">Casa</option>
                    <option value="terreno">Terreno</option>
                    <option value="oficina">Oficina</option>
                    <option value="local">Local Comercial</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Distrito en Arequipa</label>
                  <select
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white"
                  >
                    {AREQUIPA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Precio en Soles (PEN S/.)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={1000}
                    value={formData.price_pen}
                    onChange={(e) => setFormData({ ...formData, price_pen: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg tabular-nums"
                  />
                </div>
              </div>

              {/* Dirección */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Dirección o Referencia</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Av. Cayma 620, Residencial Torre Cayma"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              {/* Especificaciones: Dormitorios, Baños, Área */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Dormitorios</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bedrooms}
                    onChange={(e) => setFormData({ ...formData, bedrooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Baños</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.bathrooms}
                    onChange={(e) => setFormData({ ...formData, bathrooms: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Área (m²)</label>
                  <input
                    type="number"
                    min={1}
                    value={formData.area_m2}
                    onChange={(e) => setFormData({ ...formData, area_m2: Number(e.target.value) })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Subida o selección de Fotografía */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Imagen Principal del Inmueble</label>
                
                {/* Presets de fotografía de Arequipa */}
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_IMAGES.map((img) => (
                    <button
                      key={img.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: img.url })}
                      className={`relative aspect-16/9 rounded-lg overflow-hidden border-2 transition cursor-pointer text-left ${
                        formData.image_url === img.url ? 'border-blue-600 ring-2 ring-blue-100' : 'border-slate-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 right-1 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded truncate">
                        {img.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Subir archivo local */}
                <div className="flex items-center gap-3 pt-2">
                  <label className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer transition border border-slate-200">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Subir foto desde dispositivo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileUpload}
                      className="hidden"
                    />
                  </label>
                  <span className="text-[11px] text-slate-400">
                    O ingresa URL de imagen en el campo
                  </span>
                </div>

                <input
                  type="text"
                  placeholder="URL de imagen"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-600 font-mono"
                />
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Descripción detallada</label>
                <textarea
                  rows={3}
                  placeholder="Describe acabados, vista, iluminación, áreas comunes y estado legal en Registros Públicos..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Checkboxes: Destacada & Estado */}
              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.featured}
                    onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Destacar en portada del catálogo público</span>
                </label>

                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <span>Estado:</span>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PropertyStatus })}
                    className="border border-slate-200 rounded px-2 py-1 text-xs"
                  >
                    <option value="activa">Activa</option>
                    <option value="reservada">Reservada</option>
                    <option value="vendida">Vendida</option>
                  </select>
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition cursor-pointer shadow-xs"
                >
                  {editingProperty ? 'Guardar Cambios' : 'Crear y Publicar Inmueble'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
