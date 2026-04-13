import { Drawer } from '../../../components/shared';
import { type CustomerDataRow, getCustomerByClientId } from '../../../api';
import { formatCurrency } from '../../../api/formatters';
import { useQuery } from '@tanstack/react-query';
import { 
  Phone, Mail, MapPin, Smartphone, 
  MessageCircle, ExternalLink, User,
  Wallet, TrendingUp, Calendar, Loader2
} from 'lucide-react';

interface CustomerDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  customer?: CustomerDataRow | null;
  customerCode?: string | null;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({ 
  isOpen, 
  onClose, 
  customer: propCustomer,
  customerCode
}) => {
  // If we have a code but no full customer object, fetch it
  const { data: fetchedCustomer, isLoading } = useQuery({
    queryKey: ['customerDetail', customerCode],
    queryFn: () => customerCode ? getCustomerByClientId(customerCode) : null,
    enabled: isOpen && !!customerCode && !propCustomer,
  });

  const customer = propCustomer || fetchedCustomer;

  const whatsappLink = customer?.mobile_no 
    ? `https://wa.me/${customer.mobile_no.replace(/\s+/g, '')}` 
    : null;

  if (!isOpen) return null;

  return (
    <Drawer isOpen={isOpen} onClose={onClose} title="Ficha del Cliente">
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-dts-secondary" />
          <p className="text-xs text-gray-400 font-medium uppercase tracking-widest">Cargando detalles...</p>
        </div>
      ) : !customer ? (
        <div className="text-center py-20 text-gray-400 italic">No se pudo encontrar la información del cliente.</div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
          {/* Header Summary */}
          <div className="flex flex-col items-center text-center pb-6 border-b border-gray-100 dark:border-white/5">
            <div className="w-16 h-16 rounded-full bg-dts-secondary/10 flex items-center justify-center text-dts-secondary mb-3">
              <User size={32} />
            </div>
            <h2 className="text-xl font-bold text-dts-primary dark:text-white">{customer.name}</h2>
            <span className="text-xs font-mono text-gray-400 bg-gray-100 dark:bg-white/5 px-2 py-0.5 rounded mt-1">
              {customer.client_id}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {customer.phone_no && (
              <a 
                href={`tel:${customer.phone_no}`}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-dts-primary dark:bg-dts-secondary/20 text-white dark:text-dts-secondary rounded-xl font-bold text-sm transition-transform active:scale-95"
              >
                <Phone size={16} /> Llamar
              </a>
            )}
            {whatsappLink && (
              <a 
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3 px-4 bg-[#25D366] text-white rounded-xl font-bold text-sm transition-transform active:scale-95"
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
          </div>

          {/* Contact Information */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Información de Contacto</h3>
            <div className="space-y-3">
              <ContactItem icon={Mail} label="Email" value={customer.email} isEmail />
              <ContactItem icon={Phone} label="Teléfono Fijo" value={customer.phone_no} isTel />
              <ContactItem icon={Smartphone} label="Móvil" value={customer.mobile_no} isTel />
            </div>
          </section>

          {/* Address */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Localización</h3>
            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
              <div className="flex gap-3">
                <MapPin className="text-dts-secondary shrink-0" size={18} />
                <div className="text-sm">
                  <p className="font-medium text-dts-primary dark:text-gray-200">{customer.address}</p>
                  {customer.address_2 && <p className="text-gray-500">{customer.address_2}</p>}
                  <p className="text-gray-500">{customer.post_code} {customer.city}</p>
                  <p className="text-gray-500 uppercase text-xs mt-1">{customer.country}</p>
                </div>
              </div>
              <button 
                onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${customer.name} ${customer.address} ${customer.city}`)}`, '_blank')}
                className="w-full mt-4 flex items-center justify-center gap-2 py-2 text-xs font-bold text-dts-secondary hover:bg-dts-secondary/5 rounded-lg transition-colors border border-dts-secondary/20"
              >
                <ExternalLink size={14} /> Ver en Google Maps
              </button>
            </div>
          </section>

          {/* Financial Summary */}
          <section className="space-y-4">
            <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Resumen de Cuenta</h3>
            <div className="grid grid-cols-2 gap-4">
              <FinancialBox 
                icon={Wallet} 
                label="Deuda Pendiente" 
                value={formatCurrency(customer.balance_due_lcy, 0)} 
                isWarning={Number(customer.balance_due_lcy) > 0}
              />
              <FinancialBox 
                icon={TrendingUp} 
                label="Ventas Anuales" 
                value={formatCurrency(customer.total_sales, 0)} 
              />
            </div>
            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium">
               <Calendar size={12}/> Cliente desde: {customer.customer_since ? new Date(customer.customer_since).toLocaleDateString() : 'N/A'}
            </div>
          </section>
        </div>
      )}
    </Drawer>
  );
};

const ContactItem = ({ icon: Icon, label, value, isEmail, isTel }: any) => {
  if (!value) return null;
  const href = isEmail ? `mailto:${value}` : isTel ? `tel:${value}` : null;

  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-white/5 flex items-center justify-center text-gray-400">
        <Icon size={16} />
      </div>
      <div className="flex flex-col truncate">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{label}</span>
        {href ? (
          <a href={href} className="text-sm font-medium text-dts-primary dark:text-white hover:text-dts-secondary transition-colors truncate">
            {value}
          </a>
        ) : (
          <span className="text-sm font-medium text-dts-primary dark:text-white truncate">{value}</span>
        )}
      </div>
    </div>
  );
};

const FinancialBox = ({ icon: Icon, label, value, isWarning }: any) => (
  <div className="p-3 bg-white dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
    <div className="flex items-center gap-2 text-gray-400 mb-1">
      <Icon size={14} />
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </div>
    <div className={`text-lg font-black font-mono ${isWarning ? 'text-amber-500' : 'text-dts-primary dark:text-white'}`}>
      {value}
    </div>
  </div>
);
