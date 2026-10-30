export type PropertyType = 'departamento' | 'casa' | 'terreno' | 'oficina' | 'local';
export type PropertyStatus = 'activa' | 'reservada' | 'vendida';
export type LeadStatus = 'nuevo' | 'contactado' | 'visita' | 'cerrado';
export type AppointmentStatus = 'programada' | 'completada' | 'cancelada';
export type VisitType = 'presencial' | 'virtual';

export interface Tenant {
  id: string;
  name: string; // e.g. "Valeria Mendoza Inmobiliaria"
  slug: string; // e.g. "valeria-mendoza"
  agent_name: string;
  email: string;
  phone: string;
  avatar_url: string;
  bio: string;
  location: string; // "Arequipa, Perú"
  created_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  role: 'admin' | 'agent' | 'assistant';
  full_name: string;
  created_at: string;
}

export interface Property {
  id: string;
  tenant_id: string;
  title: string;
  slug: string;
  description: string;
  property_type: PropertyType;
  status: PropertyStatus;
  price_pen: number; // Moneda en Soles (PEN S/.)
  currency?: string;
  bedrooms: number;
  bathrooms: number;
  area_m2: number;
  district: string; // "Yanahuara", "Cayma", "Cerro Colorado", etc.
  address: string;
  image_url: string;
  gallery_urls: string[];
  featured: boolean;
  created_at: string;
}

export interface Lead {
  id: string;
  tenant_id: string;
  full_name: string;
  phone: string;
  email: string;
  status: LeadStatus;
  budget_pen: number;
  interested_property_id?: string;
  notes: string;
  source: string;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  property_id: string;
  scheduled_at: string; // ISO date string
  time_slot: string; // "10:30 AM"
  status: AppointmentStatus;
  visit_type: VisitType;
  notes: string;
  created_at: string;
}
