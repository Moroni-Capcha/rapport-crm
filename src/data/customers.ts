import type { CustomerMeta } from '../types';

/**
 * Metadatos de empresa. Incluye clientes históricos (con proyectos y facturas)
 * y las empresas que hoy están en el pipeline.
 */
export const CUSTOMERS: CustomerMeta[] = [
  // ── Clientes con proyectos ─────────────────────────────────────
  { company: 'Inca Pay', industry: 'Fintech', city: 'Lima', website: 'incapay.pe', since: 2023, segment: 'enterprise',
    contact: { name: 'Fernando Arce', role: 'CTO', email: 'fernando@incapay.pe', phone: '+51 987 210 445' } },
  { company: 'Tambo Hoteles', industry: 'Hotelería', city: 'Cusco', website: 'tambohoteles.com', since: 2024, segment: 'smb',
    contact: { name: 'Lucía Huamán', role: 'Gerente Comercial', email: 'lucia@tambohoteles.com', phone: '+51 984 332 118' } },
  { company: 'EduPlus', industry: 'Educación', city: 'Lima', website: 'eduplus.edu.pe', since: 2025, segment: 'smb',
    contact: { name: 'Martín Cornejo', role: 'Director Académico', email: 'martin@eduplus.edu.pe', phone: '+51 991 450 223' } },
  { company: 'Farmacia Vital', industry: 'Retail · Salud', city: 'Arequipa', website: 'farmaciavital.pe', since: 2024, segment: 'ecommerce',
    contact: { name: 'Rocío Velarde', role: 'Jefa de E-commerce', email: 'rocio@farmaciavital.pe', phone: '+51 959 870 334' } },
  { company: 'Constructora Norte', industry: 'Construcción', city: 'Trujillo', website: 'cnorte.com.pe', since: 2023, segment: 'enterprise',
    contact: { name: 'Hugo Saavedra', role: 'Gerente de Postventa', email: 'hugo@cnorte.com.pe', phone: '+51 949 112 870' } },
  { company: 'Kallpa Gym', industry: 'Fitness', city: 'Lima', website: 'kallpagym.pe', since: 2025, segment: 'ios',
    contact: { name: 'Natalia Flores', role: 'Fundadora', email: 'natalia@kallpagym.pe', phone: '+51 976 554 019' } },
  { company: 'Agro Export Sur', industry: 'Agroindustria', city: 'Ica', website: 'agroexportsur.com', since: 2026, segment: 'enterprise',
    contact: { name: 'Óscar Medina', role: 'Gerente de TI', email: 'oscar@agroexportsur.com', phone: '+51 956 223 901' } },
  { company: 'Sabor Peruano', industry: 'Food delivery', city: 'Lima', website: 'saborperuano.app', since: 2024, segment: 'ios',
    contact: { name: 'Andrés Vílchez', role: 'COO', email: 'andres@saborperuano.app', phone: '+51 981 776 540' } },
  { company: 'Textil Pacífico', industry: 'Moda · Retail', city: 'Lima', website: 'textilpacifico.pe', since: 2023, segment: 'ecommerce',
    contact: { name: 'Patricia Luna', role: 'Gerente Digital', email: 'patricia@textilpacifico.pe', phone: '+51 994 018 662' } },
  // ── Empresas del pipeline actual ───────────────────────────────
  { company: 'Nómada Travel', industry: 'Turismo', city: 'Lima', website: 'nomadatravel.io', since: 2026, segment: 'smb' },
  { company: 'Grupo Andino Seguros', industry: 'Seguros', city: 'Lima', website: 'andinoseguros.com', since: 2026, segment: 'enterprise' },
  { company: 'Kumo Coffee', industry: 'Alimentos', city: 'Lima', website: 'kumocoffee.pe', since: 2026, segment: 'ecommerce' },
  { company: 'Fintrek', industry: 'Fintech', city: 'Bogotá', website: 'fintrek.co', since: 2026, segment: 'ios' },
  { company: 'Clínica San Gabriel', industry: 'Salud', city: 'Lima', website: 'clinicasangabriel.pe', since: 2026, segment: 'enterprise' },
  { company: 'Ludo Labs', industry: 'EdTech', city: 'Santiago', website: 'ludolabs.cl', since: 2026, segment: 'smb' },
  { company: 'Altura Inmobiliaria', industry: 'Inmobiliaria', city: 'Lima', website: 'alturainmobiliaria.pe', since: 2026, segment: 'web' },
  { company: 'LogiTrack Cargo', industry: 'Logística', city: 'Callao', website: 'logitrack.com.pe', since: 2026, segment: 'enterprise' },
  { company: 'Moda Urbana', industry: 'Moda · Retail', city: 'Lima', website: 'modaurbana.pe', since: 2026, segment: 'ecommerce' },
  { company: 'Pulso Health', industry: 'HealthTech', city: 'Ciudad de México', website: 'pulso.health', since: 2026, segment: 'ios' },
  { company: 'Banco Ribera', industry: 'Banca', city: 'Lima', website: 'bancoribera.pe', since: 2026, segment: 'enterprise' },
  { company: 'Verde Market', industry: 'Marketplace B2B', city: 'Arequipa', website: 'verdemarket.pe', since: 2026, segment: 'ecommerce' },
  { company: 'Orbe Energía', industry: 'Energía', city: 'Lima', website: 'orbeenergia.com', since: 2026, segment: 'enterprise' },
  { company: 'Studio Caleta', industry: 'Arquitectura', city: 'Lima', website: 'studiocaleta.pe', since: 2026, segment: 'web' },
  { company: 'Rutas Express', industry: 'Logística', city: 'Lima', website: 'rutasexpress.pe', since: 2026, segment: 'ios' },
  { company: 'Andes Retail Group', industry: 'Retail', city: 'Lima', website: 'andesretail.com', since: 2026, segment: 'enterprise' },
];

export const CUSTOMER_BY_NAME = Object.fromEntries(CUSTOMERS.map((c) => [c.company, c])) as Record<string, CustomerMeta>;
