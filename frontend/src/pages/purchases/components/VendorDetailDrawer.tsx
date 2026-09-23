import React, { useState, useMemo } from 'react';
import { Drawer } from '../../../components/shared';
import { type VendorDataRow, getVendorByVendorId, getVendorAnalytics } from '../../../api/vendors';
import { formatCurrency } from '../../../api/formatters';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  Phone, Mail, MapPin, Smartphone,
  MessageCircle, ExternalLink, Building2,
  Wallet, AlertTriangle, Globe, CreditCard, Clock, Truck, ShieldAlert,
  TrendingUp, Package, ShoppingCart, Search, Calendar
} from 'lucide-react';

interface VendorDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: VendorDataRow | null;
  vendorCode?: string | null;
}

type DrawerTab = 'general' | 'evolution' | 'products' | 'orders';

export const VendorDetailDrawer: React.FC<VendorDetailDrawerProps> = ({
  isOpen,
  onClose,
  vendor: propVendor,
  vendorCode
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('general');
  const [productSearch, setProductSearch] = useState('');

  const targetVendorId = propVendor?.vendor_id || vendorCode;

  const { data: fetchedVendor, isLoading: isVendorLoading } = useQuery({
    queryKey: ['vendorDetail', targetVendorId],
    queryFn: () => targetVendorId ? getVendorByVendorId(targetVendorId) : null,
    enabled: isOpen && !!targetVendorId && !propVendor,
  });

  const vendor = propVendor || fetchedVendor;

  // Carga analíticas de compras y productos suministrados
  const { data: analytics, isLoading: isAnalyticsLoading } = useQuery({
    queryKey: ['vendorAnalytics', targetVendorId],
    queryFn: () => targetVendorId ? getVendorAnalytics(targetVendorId) : null,
    enabled: isOpen && !!targetVendorId,
    staleTime: 5 * 60 * 1000,
  });

  const whatsappLink = vendor?.mobile_no
    ? `https://wa.me/${vendor.mobile_no.replace(/\s+/g, '')}`
    : null;

  const filteredProducts = useMemo(() => {
    if (!analytics?.products) return [];
    if (!productSearch.trim()) return analytics.products;
    const term = productSearch.toLowerCase();
    return analytics.products.filter(p =>
      p.item_no.toLowerCase().includes(term) ||
      p.description.toLowerCase().includes(term)
    );
  }, [analytics?.products, productSearch]);

  if (!isOpen) return null;

  const isBlocked = vendor?.blocked && vendor.blocked.trim() !== '' && vendor.blocked !== 'FALSE';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Ficha del Proveedor" size="xl">
      {isVendorLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-dts-secondary border-t-transparent animate-spin" />
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Cargando detalles...</p>
        </div>
      ) : !vendor ? (
        <div className="text-center py-20 text-gray-400 italic">No se pudo encontrar la información del proveedor.</div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Header Summary Card */}
          <div className="relative overflow-hidden p-6 rounded-2xl bg-linear-to-br from-[#003E51]/10 via-[#003E51]/5 to-transparent dark:from-[#003E51]/40 dark:via-[#003E51]/20 border border-[#003E51]/15 dark:border-white/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-[#003E51] text-white flex items-center justify-center shadow-lg shadow-[#003E51]/20 shrink-0">
                  <Building2 size={28} />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{vendor.name}</h2>
                    {vendor.abc_class && vendor.abc_class !== '-' && (
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider ${
                        vendor.abc_class === 'A'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                          : vendor.abc_class === 'B'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/70 dark:text-blue-300 border border-blue-300 dark:border-blue-700'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 dark:border-gray-700'
                      }`}>
                        Tipo {vendor.abc_class}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span className="text-xs font-mono font-bold text-[#003E51] dark:text-[#00B0B9] bg-white dark:bg-black/30 px-2.5 py-0.5 rounded-md border border-[#003E51]/20">
                      {vendor.vendor_id}
                    </span>
                    {vendor.vat_no && (
                      <span className="text-xs text-gray-600 dark:text-gray-300 font-mono bg-white dark:bg-black/20 px-2 py-0.5 rounded-md border border-gray-200 dark:border-white/10">
                        {vendor.vat_no}
                      </span>
                    )}
                    {vendor.city && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                        <MapPin size={12} className="text-[#00B0B9]" />
                        {vendor.city} {vendor.county ? `(${vendor.county})` : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {isBlocked && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-300 text-xs font-semibold rounded-full border border-red-300 dark:border-red-800">
                  <ShieldAlert size={14} />
                  <span>Bloqueado ({vendor.blocked})</span>
                </div>
              )}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-gray-200 dark:border-white/10 gap-1 overflow-x-auto">
            <button
              onClick={() => setActiveTab('general')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'general'
                  ? 'border-[#003E51] text-[#003E51] dark:border-[#00B0B9] dark:text-[#00B0B9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <Building2 size={15} />
              Información General
            </button>
            <button
              onClick={() => setActiveTab('evolution')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'evolution'
                  ? 'border-[#003E51] text-[#003E51] dark:border-[#00B0B9] dark:text-[#00B0B9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <TrendingUp size={15} />
              Evolución de Compras
            </button>
            <button
              onClick={() => setActiveTab('products')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'products'
                  ? 'border-[#003E51] text-[#003E51] dark:border-[#00B0B9] dark:text-[#00B0B9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <Package size={15} />
              Productos Suministrados
              {analytics?.products && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-[#003E51]/10 dark:bg-[#00B0B9]/20 text-[#003E51] dark:text-[#00B0B9] font-bold">
                  {analytics.products.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'orders'
                  ? 'border-[#003E51] text-[#003E51] dark:border-[#00B0B9] dark:text-[#00B0B9]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <ShoppingCart size={15} />
              Pedidos en Curso
              {analytics?.openOrders && analytics.openOrders.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-700 dark:text-amber-300 font-bold">
                  {analytics.openOrders.length}
                </span>
              )}
            </button>
          </div>

          {/* TAB 1: INFORMACIÓN GENERAL */}
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="grid grid-cols-2 gap-3">
                {vendor.phone_no && (
                  <a
                    href={`tel:${vendor.phone_no}`}
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#003E51] dark:bg-[#003E51]/80 hover:bg-[#003E51]/90 text-white rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-sm"
                  >
                    <Phone size={14} /> Llamar ({vendor.phone_no})
                  </a>
                )}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 px-4 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-xl font-bold text-xs transition-transform active:scale-95 shadow-sm"
                  >
                    <MessageCircle size={14} /> WhatsApp
                  </a>
                )}
              </div>

              {/* Financial KPI Grid */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen Financiero y Compras</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-4 bg-linear-to-br from-[#003E51]/5 to-[#003E51]/10 dark:from-white/5 dark:to-white/2 rounded-xl border border-[#003E51]/15 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Volumen Total Compras</p>
                      <p className="text-xl font-extrabold text-[#003E51] dark:text-[#00B0B9]">
                        {formatCurrency(analytics?.totalPurchases ?? vendor.purchase_volume ?? vendor.payments_lcy ?? 0)}
                      </p>
                      {analytics?.products && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          {analytics.products.length} productos suministrados
                        </p>
                      )}
                    </div>
                    <div className="p-3 bg-[#003E51]/10 text-[#003E51] dark:text-[#00B0B9] rounded-xl">
                      <TrendingUp size={22} />
                    </div>
                  </div>

                  <div className="p-4 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-white/5 dark:to-white/2 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Saldo Pendiente</p>
                      <p className="text-xl font-bold text-gray-900 dark:text-white">{formatCurrency(vendor.balance_lcy || 0)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">Facturas vivas por pagar</p>
                    </div>
                    <div className="p-3 bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-200 rounded-xl">
                      <Wallet size={22} />
                    </div>
                  </div>

                  <div className="p-4 bg-linear-to-br from-red-50/60 to-red-100/40 dark:from-red-950/30 dark:to-red-900/15 rounded-xl border border-red-200/60 dark:border-red-900/30 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">Saldo Vencido</p>
                      <p className={`text-xl font-bold ${Number(vendor.balance_due_lcy) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                        {formatCurrency(vendor.balance_due_lcy || 0)}
                      </p>
                      <p className="text-[10px] text-red-500/80 mt-0.5">Pendiente fuera de plazo</p>
                    </div>
                    <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-xl">
                      <AlertTriangle size={22} />
                    </div>
                  </div>

                  <div className="p-4 bg-linear-to-br from-[#00B0B9]/10 to-[#00B0B9]/5 dark:from-[#00B0B9]/20 dark:to-[#00B0B9]/5 rounded-xl border border-[#00B0B9]/20 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-[#003E51] dark:text-[#00B0B9] font-medium">Cartera de Pedidos Abiertos</p>
                      <p className="text-xl font-bold text-[#003E51] dark:text-white">
                        {formatCurrency(analytics?.totalOpenOrdersAmount || 0)}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {analytics?.openOrders?.length || 0} pedidos en curso
                      </p>
                    </div>
                    <div className="p-3 bg-[#00B0B9]/20 text-[#003E51] dark:text-[#00B0B9] rounded-xl">
                      <ShoppingCart size={22} />
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact Information */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Contacto y Comunicación</h3>
                <div className="space-y-2">
                  {vendor.contact && <ContactItem icon={Building2} label="Persona de Contacto" value={vendor.contact} />}
                  <ContactItem icon={Mail} label="Email" value={vendor.email} isEmail />
                  <ContactItem icon={Phone} label="Teléfono Fijo" value={vendor.phone_no} isTel />
                  <ContactItem icon={Smartphone} label="Móvil" value={vendor.mobile_no} isTel />
                  {vendor.home_page && (
                    <ContactItem
                      icon={Globe}
                      label="Sitio Web"
                      value={vendor.home_page.startsWith('http') ? vendor.home_page : `https://${vendor.home_page}`}
                      isUrl
                    />
                  )}
                </div>
              </section>

              {/* Address */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Ubicación y Logística</h3>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                  <div className="flex gap-3">
                    <MapPin className="text-[#00B0B9] shrink-0 mt-0.5" size={18} />
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900 dark:text-white">{vendor.address || 'Sin dirección registrada'}</p>
                      {vendor.address_2 && <p className="text-gray-600 dark:text-gray-400 text-xs">{vendor.address_2}</p>}
                      <p className="text-gray-700 dark:text-gray-300 text-xs mt-0.5">{vendor.post_code} {vendor.city}</p>
                      <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] mt-1 tracking-wider">
                        {vendor.county || 'ESPAÑA'}
                      </p>
                    </div>
                  </div>
                  {vendor.address && (
                    <button
                      onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.name} ${vendor.address} ${vendor.city}`)}`, '_blank')}
                      className="w-full mt-3 flex items-center justify-center gap-2 py-2 text-xs font-bold text-[#003E51] dark:text-[#00B0B9] hover:bg-[#003E51]/5 dark:hover:bg-white/5 rounded-lg transition-colors border border-gray-200 dark:border-white/10"
                    >
                      <ExternalLink size={14} /> Ver ubicación en Google Maps
                    </button>
                  )}
                </div>
              </section>

              {/* Commercial Terms */}
              <section className="space-y-3">
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condiciones Comerciales y de Pago</h3>
                <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Clock size={14} /> Términos de Pago:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{vendor.payment_terms_code || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200/50 dark:border-white/5 pt-2">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <CreditCard size={14} /> Forma de Pago:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{vendor.payment_method_code || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-200/50 dark:border-white/5 pt-2">
                    <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                      <Truck size={14} /> Método de Envío:
                    </span>
                    <span className="font-semibold text-gray-900 dark:text-white">{vendor.shipment_method_code || '-'}</span>
                  </div>
                  {Number(vendor.prepayment_percent) > 0 && (
                    <div className="flex justify-between items-center border-t border-gray-200/50 dark:border-white/5 pt-2">
                      <span className="text-gray-500 dark:text-gray-400">% Prepago Requerido:</span>
                      <span className="font-bold text-[#00B0B9]">{vendor.prepayment_percent}%</span>
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}

          {/* TAB 2: EVOLUCIÓN EN EL TIEMPO */}
          {activeTab === 'evolution' && (
            <div className="space-y-6">
              {isAnalyticsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <div className="w-6 h-6 border-2 border-[#00B0B9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Calculando histórico de compras...</p>
                </div>
              ) : !analytics || analytics.yearlyEvolution.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                  <Calendar size={36} className="mx-auto text-gray-400 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Sin compras registradas</p>
                  <p className="text-xs text-gray-400 mt-1">No constan facturas o abonos registrados para este proveedor.</p>
                </div>
              ) : (
                <>
                  {/* KPIs evolución */}
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    const currentYearAmount = analytics.yearlyEvolution.find(y => y.year === currentYear)?.amount || 0;
                    const prevYearAmount = analytics.yearlyEvolution.find(y => y.year === currentYear - 1)?.amount || 0;
                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Compras {currentYear}</p>
                          <p className="text-lg font-black text-[#003E51] dark:text-[#00B0B9] mt-0.5">
                            {formatCurrency(currentYearAmount)}
                          </p>
                        </div>
                        <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Compras {currentYear - 1}</p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200 mt-0.5">
                            {formatCurrency(prevYearAmount)}
                          </p>
                        </div>
                        <div className="p-3.5 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">Gasto Histórico Total</p>
                          <p className="text-lg font-black text-gray-900 dark:text-white mt-0.5">
                            {formatCurrency(analytics.totalPurchases)}
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Gráfico de Evolución Anual */}
                  <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                        <TrendingUp size={14} className="text-[#00B0B9]" />
                        Evolución Anual de Gasto (€)
                      </h4>
                      <span className="text-[11px] text-gray-400">Por ejercicio fiscal</span>
                    </div>

                    <div className="h-56 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.yearlyEvolution} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                          <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                          <YAxis
                            tick={{ fontSize: 11 }}
                            tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`}
                          />
                          <Tooltip
                            formatter={(value: any) => [formatCurrency(Number(value)), 'Gasto Total']}
                            labelFormatter={(label) => `Año ${label}`}
                            contentStyle={{
                              backgroundColor: '#003E51',
                              color: '#fff',
                              borderRadius: '8px',
                              border: 'none',
                              fontSize: '12px'
                            }}
                          />
                          <Bar dataKey="amount" fill="#003E51" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Gráfico de Evolución Mensual (últimos meses) */}
                  {analytics.monthlyEvolution.length > 0 && (
                    <div className="p-4 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Calendar size={14} className="text-[#00B0B9]" />
                          Evolución Mensual de Compras (€)
                        </h4>
                        <span className="text-[11px] text-gray-400">Mes a mes</span>
                      </div>

                      <div className="h-56 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart
                            data={analytics.monthlyEvolution.map(m => ({
                              ...m,
                              name: m.month ? `${m.month}/${m.year}` : `${m.year}`
                            }))}
                            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                          >
                            <defs>
                              <linearGradient id="vendorPurchasesGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#00B0B9" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#00B0B9" stopOpacity={0.0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              tickFormatter={(val) => `${(val / 1000).toFixed(0)}k€`}
                            />
                            <Tooltip
                              formatter={(value: any) => [formatCurrency(Number(value)), 'Compras']}
                              contentStyle={{
                                backgroundColor: '#003E51',
                                color: '#fff',
                                borderRadius: '8px',
                                border: 'none',
                                fontSize: '12px'
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="amount"
                              stroke="#00B0B9"
                              strokeWidth={2}
                              fillOpacity={1}
                              fill="url(#vendorPurchasesGrad)"
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tabla resumen anual */}
                  <div className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-gray-50 dark:bg-white/5 text-gray-500 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-2.5">Año</th>
                          <th className="px-4 py-2.5 text-center">Nº Facturas / Docs</th>
                          <th className="px-4 py-2.5 text-right">Volumen (€)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
                        {analytics.yearlyEvolution.map((row) => (
                          <tr key={row.year} className="hover:bg-gray-50/50 dark:hover:bg-white/2">
                            <td className="px-4 py-2 text-gray-900 dark:text-white font-bold">{row.year}</td>
                            <td className="px-4 py-2 text-center text-gray-500">{row.count}</td>
                            <td className="px-4 py-2 text-right font-semibold text-[#003E51] dark:text-[#00B0B9]">
                              {formatCurrency(row.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: PRODUCTOS QUE SUMINISTRA */}
          {activeTab === 'products' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Catálogo de Productos Suministrados
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    {analytics?.products?.length || 0} referencias adquiridas a este proveedor
                  </p>
                </div>

                <div className="relative w-full sm:w-64">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar referencia o descripción..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#00B0B9]"
                  />
                </div>
              </div>

              {isAnalyticsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <div className="w-6 h-6 border-2 border-[#00B0B9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Cargando productos suministrados...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                  <Package size={36} className="mx-auto text-gray-400 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    {productSearch ? 'No se encontraron referencias para la búsqueda' : 'Sin productos suministrados'}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    {productSearch ? 'Prueba con otro término de búsqueda' : 'No hay líneas de producto registradas para este proveedor.'}
                  </p>
                </div>
              ) : (
                <div className="border border-gray-100 dark:border-white/5 rounded-xl overflow-hidden">
                  <div className="max-h-96 overflow-y-auto">
                    <table className="w-full text-xs text-left">
                      <thead className="sticky top-0 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-bold uppercase text-[10px] tracking-wider z-10 border-b border-gray-200 dark:border-white/10">
                        <tr>
                          <th className="px-3.5 py-2.5">Referencia</th>
                          <th className="px-3.5 py-2.5">Descripción</th>
                          <th className="px-3 py-2.5 text-center">Unidades</th>
                          <th className="px-3.5 py-2.5 text-right">Gasto Total</th>
                          <th className="px-3 py-2.5 text-right">Último Coste</th>
                          <th className="px-3 py-2.5 text-center">Stock</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-white/5 font-medium">
                        {filteredProducts.map((p) => (
                          <tr key={p.item_no} className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors">
                            <td className="px-3.5 py-2">
                              <span className="font-mono font-bold text-[#003E51] dark:text-[#00B0B9] bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded text-[11px]">
                                {p.item_no}
                              </span>
                            </td>
                            <td className="px-3.5 py-2 max-w-[220px]">
                              <p className="text-gray-800 dark:text-gray-200 font-medium truncate" title={p.description}>
                                {p.description || 'Sin descripción'}
                              </p>
                              {p.last_purchase_date && (
                                <p className="text-[10px] text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Clock size={10} /> Última compra: {new Date(p.last_purchase_date).toLocaleDateString('es-ES')}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-center text-gray-700 dark:text-gray-300">
                              {p.total_qty.toLocaleString('es-ES')}
                            </td>
                            <td className="px-3.5 py-2 text-right font-bold text-[#003E51] dark:text-white">
                              {formatCurrency(p.total_amount)}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 dark:text-gray-300">
                              {formatCurrency(p.last_purchase_price)}
                            </td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                p.inventory_qty > 0
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400'
                              }`}>
                                {p.inventory_qty}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PEDIDOS EN CURSO */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800 dark:text-gray-200">
                    Pedidos de Compra Abiertos
                  </h4>
                  <p className="text-[11px] text-gray-400">
                    Órdenes de compra vivas pendientes de entrega o facturación
                  </p>
                </div>
                {analytics?.openOrders && analytics.openOrders.length > 0 && (
                  <span className="text-xs font-bold text-[#003E51] dark:text-[#00B0B9] bg-[#003E51]/10 dark:bg-[#00B0B9]/20 px-2.5 py-1 rounded-lg">
                    Total: {formatCurrency(analytics.totalOpenOrdersAmount)}
                  </span>
                )}
              </div>

              {isAnalyticsLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <div className="w-6 h-6 border-2 border-[#00B0B9] border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">Consultando pedidos de compra...</p>
                </div>
              ) : !analytics?.openOrders || analytics.openOrders.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 dark:bg-white/5 rounded-xl border border-dashed border-gray-200 dark:border-white/10">
                  <ShoppingCart size={36} className="mx-auto text-gray-400 mb-2 opacity-50" />
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">No hay pedidos abiertos</p>
                  <p className="text-xs text-gray-400 mt-1">Este proveedor no tiene pedidos de compra en estado pendiente actualmente.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {analytics.openOrders.map((order: any) => (
                    <div key={order.order_no || order.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#003E51] dark:text-[#00B0B9]">
                              {order.order_no || order.id}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold">
                              {order.status || 'Abierto'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-[11px] text-gray-500 mt-1">
                            {order.document_date && (
                              <span>Fecha: {new Date(order.document_date).toLocaleDateString('es-ES')}</span>
                            )}
                            {order.expected_receipt_date && (
                              <span>Recepción prev.: {new Date(order.expected_receipt_date).toLocaleDateString('es-ES')}</span>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-gray-400">Importe Pedido</p>
                          <p className="text-sm font-black text-[#003E51] dark:text-white">
                            {formatCurrency(Number(order.amount || 0))}
                          </p>
                        </div>
                      </div>

                      {/* Líneas del pedido si existen */}
                      {order.lines && order.lines.length > 0 && (
                        <div className="border-t border-gray-200/50 dark:border-white/5 pt-2">
                          <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400 mb-1.5">
                            Líneas del Pedido ({order.lines.length})
                          </p>
                          <div className="space-y-1.5 max-h-40 overflow-y-auto">
                            {order.lines.map((line: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded bg-white/60 dark:bg-black/20">
                                <div className="truncate max-w-[240px]">
                                  <span className="font-mono font-bold text-[11px] mr-1.5 text-gray-700 dark:text-gray-300">
                                    {line.item_code}
                                  </span>
                                  <span className="text-gray-500 dark:text-gray-400 text-[11px]">
                                    {line.description}
                                  </span>
                                </div>
                                <div className="text-right shrink-0">
                                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                                    {line.quantity} uds · {formatCurrency(Number(line.line_amount || 0))}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Drawer>
  );
};

interface ContactItemProps {
  icon: any;
  label: string;
  value?: string | null;
  isEmail?: boolean;
  isTel?: boolean;
  isUrl?: boolean;
}

const ContactItem: React.FC<ContactItemProps> = ({ icon: Icon, label, value, isEmail, isTel, isUrl }) => {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
      <div className="p-2 bg-white dark:bg-white/5 rounded-lg text-[#00B0B9] shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {isEmail ? (
          <a href={`mailto:${value}`} className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-[#00B0B9] truncate block">
            {value}
          </a>
        ) : isTel ? (
          <a href={`tel:${value}`} className="text-xs font-medium text-gray-800 dark:text-gray-200 hover:text-[#00B0B9] truncate block">
            {value}
          </a>
        ) : isUrl ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#00B0B9] hover:underline truncate flex items-center gap-1">
            {value} <ExternalLink size={10} />
          </a>
        ) : (
          <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{value}</p>
        )}
      </div>
    </div>
  );
};
