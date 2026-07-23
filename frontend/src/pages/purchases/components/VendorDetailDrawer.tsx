import React from 'react';
import { Drawer } from '../../../components/shared';
import { type VendorDataRow, getVendorByVendorId } from '../../../api/vendors';
import { formatCurrency } from '../../../api/formatters';
import { useQuery } from '@tanstack/react-query';
import {
  Phone, Mail, MapPin, Smartphone,
  MessageCircle, ExternalLink, Building2,
  Wallet, AlertTriangle, Globe, CreditCard, Clock, Truck, ShieldAlert
} from 'lucide-react';

interface VendorDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendor?: VendorDataRow | null;
  vendorCode?: string | null;
}

export const VendorDetailDrawer: React.FC<VendorDetailDrawerProps> = ({
  isOpen,
  onClose,
  vendor: propVendor,
  vendorCode
}) => {
  const { data: fetchedVendor, isLoading } = useQuery({
    queryKey: ['vendorDetail', vendorCode],
    queryFn: () => vendorCode ? getVendorByVendorId(vendorCode) : null,
    enabled: isOpen && !!vendorCode && !propVendor,
  });

  const vendor = propVendor || fetchedVendor;

  const whatsappLink = vendor?.mobile_no
    ? `https://wa.me/${vendor.mobile_no.replace(/\s+/g, '')}`
    : null;

  if (!isOpen) return null;

  const isBlocked = vendor?.blocked && vendor.blocked.trim() !== '' && vendor.blocked !== 'FALSE';

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Ficha del Proveedor">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-dts-secondary border-t-transparent animate-spin" />
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Cargando detalles...</p>
        </div>
      ) : !vendor ? (
        <div className="text-center py-20 text-gray-400 italic">No se pudo encontrar la información del proveedor.</div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Header Summary */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100 dark:border-white/5">
            <div className="w-16 h-16 rounded-full bg-dts-primary/10 dark:bg-dts-secondary/10 flex items-center justify-center text-dts-primary dark:text-dts-secondary mb-3">
              <Building2 size={32} />
            </div>
            <h2 className="text-xl font-bold text-dts-primary dark:text-white">{vendor.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono text-dts-primary dark:text-dts-secondary font-bold bg-dts-secondary/10 px-2.5 py-0.5 rounded">
                {vendor.vendor_id}
              </span>
              {vendor.vat_no && (
                <span className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded">
                  {vendor.vat_no}
                </span>
              )}
            </div>
            {isBlocked && (
              <div className="mt-3 flex items-center gap-1.5 px-3 py-1 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full border border-red-200 dark:border-red-800">
                <ShieldAlert size={14} />
                <span>Bloqueado ({vendor.blocked})</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {vendor.phone_no && (
              <a
                href={`tel:${vendor.phone_no}`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-dts-primary dark:bg-dts-secondary/20 text-white dark:text-dts-secondary rounded-xl font-bold text-sm transition-transform active:scale-95 hover:opacity-90"
              >
                <Phone size={16} /> Llamar
              </a>
            )}
            {whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] text-white rounded-xl font-bold text-sm transition-transform active:scale-95 hover:opacity-90"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>

          {/* Financial Summary */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen Financiero</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="p-4 bg-linear-to-br from-gray-50 to-gray-100/50 dark:from-white/5 dark:to-white/2 rounded-xl border border-gray-100 dark:border-white/5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Saldo Pendiente</p>
                  <p className="text-lg font-bold text-dts-primary dark:text-white">{formatCurrency(vendor.balance_lcy || 0)}</p>
                </div>
                <div className="p-3 bg-dts-primary/10 text-dts-primary dark:text-dts-secondary rounded-lg">
                  <Wallet size={20} />
                </div>
              </div>

              <div className="p-4 bg-linear-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10 rounded-xl border border-red-100 dark:border-red-900/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-red-600 dark:text-red-400 font-medium">Saldo Vencido</p>
                  <p className={`text-lg font-bold ${Number(vendor.balance_due_lcy) > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
                    {formatCurrency(vendor.balance_due_lcy || 0)}
                  </p>
                </div>
                <div className="p-3 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-lg">
                  <AlertTriangle size={20} />
                </div>
              </div>

              <div className="p-4 bg-linear-to-br from-cyan-50/50 to-cyan-100/30 dark:from-cyan-950/20 dark:to-cyan-900/10 rounded-xl border border-cyan-100 dark:border-cyan-900/20 flex items-center justify-between">
                <div>
                  <p className="text-xs text-dts-secondary font-medium">Pagos / Compras Acumuladas</p>
                  <p className="text-lg font-bold text-dts-secondary">{formatCurrency(vendor.payments_lcy || 0)}</p>
                </div>
                <div className="p-3 bg-dts-secondary/10 text-dts-secondary rounded-lg">
                  <CreditCard size={20} />
                </div>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Información de Contacto</h3>
            <div className="space-y-3">
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
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localización</h3>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
              <div className="flex gap-3">
                <MapPin className="text-dts-secondary shrink-0" size={18} />
                <div className="text-sm">
                  <p className="font-medium text-dts-primary dark:text-gray-200">{vendor.address || 'Sin dirección'}</p>
                  {vendor.address_2 && <p className="text-gray-600 dark:text-gray-400">{vendor.address_2}</p>}
                  <p className="text-gray-700 dark:text-gray-300">{vendor.post_code} {vendor.city}</p>
                  <p className="text-gray-500 dark:text-gray-400 font-bold uppercase text-[10px] mt-1 tracking-wider">{vendor.county}</p>
                </div>
              </div>
              {vendor.address && (
                <button
                  onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${vendor.name} ${vendor.address} ${vendor.city}`)}`, '_blank')}
                  className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-bold text-dts-secondary hover:bg-dts-secondary/5 rounded-lg transition-colors border border-dts-secondary/20"
                >
                  <ExternalLink size={14} /> Ver en Google Maps
                </button>
              )}
            </div>
          </section>

          {/* Commercial Terms */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Condiciones Comerciales y Pago</h3>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Clock size={14} /> Términos de Pago:
                </span>
                <span className="font-semibold text-dts-primary dark:text-white">{vendor.payment_terms_code || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-200/50 dark:border-white/5 pt-2">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <CreditCard size={14} /> Forma de Pago:
                </span>
                <span className="font-semibold text-dts-primary dark:text-white">{vendor.payment_method_code || '-'}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-gray-200/50 dark:border-white/5 pt-2">
                <span className="text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                  <Truck size={14} /> Método de Envío:
                </span>
                <span className="font-semibold text-dts-primary dark:text-white">{vendor.shipment_method_code || '-'}</span>
              </div>
              {Number(vendor.prepayment_percent) > 0 && (
                <div className="flex justify-between items-center text-sm border-t border-gray-200/50 dark:border-white/5 pt-2">
                  <span className="text-gray-500 dark:text-gray-400">% Prepago Requerido:</span>
                  <span className="font-bold text-dts-secondary">{vendor.prepayment_percent}%</span>
                </div>
              )}
            </div>
          </section>
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
      <div className="p-2 bg-white dark:bg-white/5 rounded-lg text-dts-secondary shrink-0">
        <Icon size={16} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        {isEmail ? (
          <a href={`mailto:${value}`} className="text-xs font-medium text-dts-primary dark:text-gray-200 hover:text-dts-secondary truncate block">
            {value}
          </a>
        ) : isTel ? (
          <a href={`tel:${value}`} className="text-xs font-medium text-dts-primary dark:text-gray-200 hover:text-dts-secondary truncate block">
            {value}
          </a>
        ) : isUrl ? (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-dts-secondary hover:underline truncate flex items-center gap-1">
            {value} <ExternalLink size={10} />
          </a>
        ) : (
          <p className="text-xs font-medium text-dts-primary dark:text-gray-200 truncate">{value}</p>
        )}
      </div>
    </div>
  );
};
