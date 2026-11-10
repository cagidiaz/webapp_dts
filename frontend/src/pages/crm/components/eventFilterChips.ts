import { Calendar, CheckSquare, FileText, MapPin, Phone, Users, Video } from 'lucide-react';

/** Tipologías y colores compartidos entre las fichas de contactos BC y prospectos. */
export const EVENT_FILTER_CHIPS = [
  { id: 'TASK', label: 'Tareas', icon: CheckSquare, color: 'text-blue-600 dark:text-blue-400', pillActiveBg: 'bg-blue-600 text-white' },
  { id: 'NOTE', label: 'Notas', icon: FileText, color: 'text-amber-600 dark:text-amber-400', pillActiveBg: 'bg-amber-600 text-white' },
  { id: 'VISITA', label: 'Visitas Cliente', icon: MapPin, color: 'text-orange-600 dark:text-orange-400', pillActiveBg: 'bg-orange-600 text-white' },
  { id: 'EVENT', label: 'Visitas no prog.', icon: Calendar, color: 'text-amber-600 dark:text-amber-400', pillActiveBg: 'bg-amber-600 text-white' },
  { id: 'VIDEO', label: 'Videollamadas', icon: Video, color: 'text-violet-600 dark:text-violet-400', pillActiveBg: 'bg-violet-600 text-white' },
  { id: 'CALL', label: 'Llamadas', icon: Phone, color: 'text-cyan-600 dark:text-cyan-400', pillActiveBg: 'bg-cyan-600 text-white' },
  { id: 'REUNION', label: 'Reuniones Internas', icon: Users, color: 'text-teal-600 dark:text-teal-400', pillActiveBg: 'bg-teal-600 text-white' },
] as const;
