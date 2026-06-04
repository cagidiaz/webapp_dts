import React, { useState, useEffect, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  UserCheck, 
  UserX,
  Shield,
  ChevronDown,
  Check
} from 'lucide-react';
import { 
  Listbox, 
  ListboxButton, 
  ListboxOption, 
  ListboxOptions,
  Transition
} from '@headlessui/react';
import apiClient from '../../api/apiClient';
import { useUIStore } from '../../store/uiStore';

interface Role {
  id: string;
  name: string;
}

interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  roles?: Role;
}

export const UsersPage: React.FC = () => {
  const { setPageInfo } = useUIStore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'users' | 'permissions'>('users');
  
  // Permissions State
  const [selectedPermissionRoleId, setSelectedPermissionRoleId] = useState<string>('');
  const [allModules, setAllModules] = useState<any[]>([]);
  const [rolePermissions, setRolePermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');
  const [isActive, setIsActive] = useState(true);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Validation State
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setPageInfo({
      title: 'Administración de Usuarios',
      subtitle: 'Panel centralizado de control y perfiles de sistema',
      icon: <Shield size={20} />,
      infoProps: {
        title: 'Administración de Usuarios',
        description: 'Vista para gestionar el acceso a la aplicación, asignar roles y controlar la actividad de los miembros del equipo.',
        objective: 'Garantizar un control de acceso centralizado para todos los módulos.'
      }
    });
    fetchUsers();
    fetchRoles();
    return () => setPageInfo({ title: '', subtitle: '', icon: null });
  }, [setPageInfo]);

  useEffect(() => {
    if (selectedPermissionRoleId) {
      fetchRolePermissions(selectedPermissionRoleId);
    }
  }, [selectedPermissionRoleId]);

  useEffect(() => {
    if (activeTab === 'permissions') {
      fetchAllModules();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (error) {
      console.error("Error al cargar los usuarios", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiClient.get('/users/roles');
      setRoles(response.data);
      if (response.data.length > 0) {
        if (!roleId) setRoleId(response.data[0].id);
        setSelectedPermissionRoleId(response.data[0].id);
      }
    } catch (error) {
      console.error("Error al cargar los roles", error);
    }
  };

  const fetchAllModules = async () => {
    try {
      const response = await apiClient.get('/users/modules');
      setAllModules(response.data);
    } catch (error) {
      console.error("Error al cargar módulos:", error);
    }
  };

  const fetchRolePermissions = async (roleId: string) => {
    try {
      const response = await apiClient.get(`/users/roles/${roleId}/modules`);
      const mapping: Record<string, boolean> = {};
      response.data.forEach((p: any) => {
        mapping[p.moduleId] = p.canView;
      });
      setRolePermissions(mapping);
    } catch (error) {
      console.error("Error al cargar permisos del rol:", error);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedPermissionRoleId) return;
    setSavingPermissions(true);
    try {
      const permissionsPayload = allModules.map(m => ({
        moduleId: m.id,
        canView: !!rolePermissions[m.id]
      }));
      await apiClient.post(`/users/roles/${selectedPermissionRoleId}/modules`, {
        permissions: permissionsPayload
      });
      alert("Permisos guardados correctamente. Los cambios se aplicarán en la próxima recarga.");
    } catch (error: any) {
      alert("Error al guardar permisos: " + (error.response?.data?.message || error.message));
    } finally {
      setSavingPermissions(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setIsActive(true);
    setErrors({});
    if (roles.length > 0) setRoleId(roles[0].id);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
    if (!lastName.trim()) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'El formato del email no es válido';
    }
    
    if (!editingId && !password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (password && password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }

    if (!roleId) newErrors.roleId = 'Debe seleccionar un rol';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEdit = (user: UserProfile) => {
    setEditingId(user.id);
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setEmail(user.email || '');
    setPassword(''); // No cargar password por seguridad
    setRoleId(user.roles?.id || roles[0]?.id || '');
    setIsActive(user.isActive);
    // Scroll to top to see the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    
    try {
      // FIX: Only send isActive if we are editing. Create handled as true by backend.
      const payload: any = { 
        email, 
        firstName, 
        lastName,
        ...(roleId ? { roleId } : {}) 
      };
      if (password) payload.password = password;
      if (editingId) {
        payload.isActive = isActive;
        await apiClient.patch(`/users/${editingId}`, payload);
      } else {
        await apiClient.post('/users', payload);
      }
      
      resetForm();
      fetchUsers();
    } catch (error: any) {
      alert("Error: " + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este usuario?")) return;
    
    try {
      await apiClient.delete(`/users/${id}`);
      fetchUsers();
    } catch (error: any) {
      alert("Error al eliminar: " + (error.response?.data?.message || error.message));
    }
  };

  const toggleStatus = async (user: UserProfile) => {
     try {
       await apiClient.patch(`/users/${user.id}`, { isActive: !user.isActive });
       fetchUsers();
     } catch (error: any) {
       alert("Error al cambiar estado: " + (error.response?.data?.message || error.message));
     }
  };

  // Filtered Users
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      const matchesSearch = 
        (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.email || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesRole = filterRole === 'all' || user.roles?.id === filterRole;
      
      return matchesSearch && matchesRole;
    });
  }, [users, searchTerm, filterRole]);

  // Stats
  const stats = {
    total: users.length,
    active: users.filter(u => u.isActive).length,
    admins: users.filter(u => u.roles?.name?.toLowerCase()?.includes('admin')).length
  };

  const selectedRole = roles.find(r => r.id === roleId) || roles[0];

  const groupedModules = useMemo(() => {
    const parents = allModules.filter(m => 
      m.route_path === '/dashboard' || 
      m.route_path === '/finance' || 
      m.route_path === '/sales' || 
      m.route_path === '/config'
    );

    return parents.map(parent => {
      let children = [];
      if (parent.route_path === '/config') {
        children = allModules.filter(m => m.route_path === '/users' || m.route_path === '/settings');
      } else {
        children = allModules.filter(m => m.route_path.startsWith(parent.route_path + '/'));
      }
      return { parent, children };
    });
  }, [allModules]);

  return (
    <div className="min-h-screen bg-transparent p-4 md:p-8 animate-in fade-in duration-500">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 dark:border-white/5 gap-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'users'
                ? 'border-dts-secondary text-dts-secondary font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white'
            }`}
          >
            Usuarios
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${
              activeTab === 'permissions'
                ? 'border-dts-secondary text-dts-secondary font-black'
                : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-white'
            }`}
          >
            Permisos de Rol
          </button>
        </div>
        
        {activeTab === 'permissions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Roles List */}
            <div className="lg:col-span-1">
              <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl space-y-6 sticky top-8">
                <h2 className="text-lg font-bold text-dts-secondary uppercase tracking-wider">
                  Roles de Usuario
                </h2>
                <div className="flex flex-col gap-2">
                  {roles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => setSelectedPermissionRoleId(role.id)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-all text-sm font-bold flex items-center justify-between ${
                        selectedPermissionRoleId === role.id
                          ? 'bg-dts-primary text-white border-dts-primary shadow-md'
                          : 'bg-gray-50 dark:bg-dts-primary-dark/40 border-gray-200 dark:border-white/5 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/5'
                      }`}
                    >
                      <span>{role.name}</span>
                      <Shield size={16} className={selectedPermissionRoleId === role.id ? 'text-dts-secondary' : 'text-gray-400'} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modules / Permissions Checkboxes */}
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-surface-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden p-6 space-y-6">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-4">
                  <div>
                    <h3 className="text-lg font-bold text-dts-primary dark:text-white uppercase tracking-wider">
                      Vistas y Módulos Accesibles
                    </h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Habilita o deshabilita los accesos de navegación para el rol seleccionado
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  {groupedModules.map((group) => {
                    if (!group.parent) return null;
                    const isParentChecked = !!rolePermissions[group.parent.id];
                    return (
                      <div key={group.parent.id} className="bg-gray-50/50 dark:bg-dts-primary-dark/10 rounded-2xl p-4 border border-gray-100 dark:border-white/5 space-y-4 shadow-sm">
                        {/* Parent Row */}
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/5 pb-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-gray-900 dark:text-white text-sm flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-dts-secondary animate-pulse" />
                              {group.parent.name.replace('Módulo: ', '').replace(' (General)', '')}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400">
                              Ruta Base: {group.parent.route_path}
                            </span>
                          </div>
                          <div>
                            <label className="relative inline-flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={isParentChecked}
                                onChange={(e) => {
                                  const updated = {
                                    ...rolePermissions,
                                    [group.parent.id]: e.target.checked
                                  };
                                  if (!e.target.checked) {
                                    group.children.forEach(child => {
                                      updated[child.id] = false;
                                    });
                                  } else {
                                    group.children.forEach(child => {
                                      updated[child.id] = true;
                                    });
                                  }
                                  setRolePermissions(updated);
                                }}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-dts-secondary"></div>
                            </label>
                          </div>
                        </div>

                        {/* Children Submenu List */}
                        {group.children.length > 0 && (
                          <div className="pl-6 space-y-3 border-l-2 border-dashed border-gray-200 dark:border-white/10 ml-1.5">
                            {group.children.map((child) => {
                              const isChildChecked = !!rolePermissions[child.id];
                              return (
                                <div key={child.id} className="flex items-center justify-between py-1 hover:bg-gray-100/50 dark:hover:bg-white/5 px-2 rounded-lg transition-colors">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs">
                                      {child.name.includes(':') ? child.name.substring(child.name.indexOf(':') + 1).trim() : child.name}
                                    </span>
                                    <span className="text-[9px] font-mono text-gray-400">
                                      {child.route_path}
                                    </span>
                                  </div>
                                  <div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isChildChecked}
                                        disabled={!isParentChecked}
                                        onChange={(e) => {
                                          setRolePermissions({
                                            ...rolePermissions,
                                            [child.id]: e.target.checked
                                          });
                                        }}
                                        className="sr-only peer"
                                      />
                                      <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-dts-secondary opacity-80 peer-disabled:opacity-40"></div>
                                    </label>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100 dark:border-white/5">
                  <button
                    onClick={handleSavePermissions}
                    disabled={savingPermissions || !selectedPermissionRoleId}
                    className="px-6 py-3 bg-linear-to-r from-dts-secondary-dark to-dts-secondary hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingPermissions ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      'GUARDAR PERMISOS'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Compact Stats Banner */}
            <div className="flex justify-end bg-white dark:bg-white/5 p-2 rounded-xl border border-gray-100 dark:border-white/5 shadow-sm">
              <div className="flex items-center gap-6 px-4">
                 <div className="text-center border-r border-gray-100 dark:border-white/5 pr-6 py-1">
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                    <p className="text-lg font-black text-dts-primary dark:text-white">{stats.total}</p>
                 </div>
                 <div className="text-center border-r border-gray-100 dark:border-white/5 pr-6 py-1">
                    <p className="text-[9px] font-bold text-status-success uppercase tracking-widest">Activos</p>
                    <p className="text-lg font-black text-dts-primary dark:text-white">{stats.active}</p>
                 </div>
                 <div className="text-center py-1">
                    <p className="text-[9px] font-bold text-dts-secondary uppercase tracking-widest">Admins</p>
                    <p className="text-lg font-black text-dts-primary dark:text-white">{stats.admins}</p>
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-surface-card-dark p-6 rounded-2xl border border-gray-100 dark:border-white/5 shadow-2xl space-y-6 sticky top-8">
              <h2 className="text-lg font-bold flex items-center gap-2 text-dts-secondary uppercase tracking-wider">
                {editingId ? <Edit2 size={18} /> : <UserPlus size={18} />}
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h2>

              <form onSubmit={handleCreateOrUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 tracking-wider">Nombre</label>
                    <input 
                      type="text" value={firstName} onChange={e => { setFirstName(e.target.value); if(errors.firstName) setErrors({...errors, firstName: ''}); }} 
                      className={`w-full px-4 py-2 bg-gray-50 dark:bg-dts-primary-dark/40 border ${errors.firstName ? 'border-status-danger' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-dts-secondary/50 focus:border-dts-secondary outline-none transition-all text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5`}
                    />
                    {errors.firstName && <p className="text-[10px] text-status-danger mt-1 font-medium italic">{errors.firstName}</p>}
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Apellidos</label>
                    <input 
                      type="text" value={lastName} onChange={e => { setLastName(e.target.value); if(errors.lastName) setErrors({...errors, lastName: ''}); }} 
                      className={`w-full px-4 py-2 bg-gray-50 dark:bg-dts-primary-dark/40 border ${errors.lastName ? 'border-status-danger' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-dts-secondary/50 focus:border-dts-secondary outline-none transition-all text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5`}
                    />
                    {errors.lastName && <p className="text-[10px] text-status-danger mt-1 font-medium italic">{errors.lastName}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Email</label>
                  <input 
                    type="email" value={email} onChange={e => { setEmail(e.target.value); if(errors.email) setErrors({...errors, email: ''}); }} 
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-dts-primary-dark/40 border ${errors.email ? 'border-status-danger' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-dts-secondary/50 focus:border-dts-secondary outline-none transition-all text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5`}
                  />
                  {errors.email && <p className="text-[10px] text-status-danger mt-1 font-medium italic">{errors.email}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">Perfil / Rol</label>
                  <Listbox value={roleId} onChange={setRoleId}>
                    <div className="relative">
                      <ListboxButton className="relative w-full cursor-default rounded-lg bg-gray-50 dark:bg-dts-primary-dark/60 py-2.5 pl-4 pr-10 text-left text-sm border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-dts-secondary/75 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors">
                        <span className="block truncate font-medium">{selectedRole?.name || 'Seleccionar...'}</span>
                        <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2 text-gray-400">
                          <ChevronDown size={18} aria-hidden="true" />
                        </span>
                      </ListboxButton>
                      <Transition leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
                        <ListboxOptions className="absolute z-50 mt-1 max-height-60 w-full overflow-auto rounded-xl bg-white dark:bg-surface-card-dark border border-gray-200 dark:border-white/10 py-1 text-sm shadow-2xl ring-1 ring-black ring-opacity-5 focus:outline-none">
                          {roles.map((role) => (
                            <ListboxOption
                              key={role.id}
                              value={role.id}
                              className={({ focus }) =>
                                `relative cursor-pointer select-none py-2.5 pl-10 pr-4 transition-colors ${
                                  focus ? 'bg-gray-50 dark:bg-white/10 text-dts-secondary' : 'text-gray-700 dark:text-gray-300'
                                }`
                              }
                            >
                              {({ selected }) => (
                                <>
                                  <span className={`block truncate ${selected ? 'font-bold text-dts-primary dark:text-white' : 'font-normal'}`}>
                                    {role.name}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-dts-secondary">
                                      <Check size={16} aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </ListboxOption>
                          ))}
                        </ListboxOptions>
                      </Transition>
                    </div>
                  </Listbox>
                  {errors.roleId && <p className="text-[10px] text-status-danger mt-1 font-medium italic">{errors.roleId}</p>}
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase mb-1 tracking-wider">
                    {editingId ? 'Cambiar Contraseña (Opcional)' : 'Contraseña Temporal'}
                  </label>
                  <input 
                    type="password" value={password} onChange={e => { setPassword(e.target.value); if(errors.password) setErrors({...errors, password: ''}); }} 
                    className={`w-full px-4 py-2 bg-gray-50 dark:bg-dts-primary-dark/40 border ${errors.password ? 'border-status-danger' : 'border-gray-200 dark:border-white/10'} rounded-lg focus:ring-2 focus:ring-dts-secondary/50 focus:border-dts-secondary outline-none transition-all text-sm text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-white/5`}
                    placeholder={editingId ? '••••••••' : 'Requerida (min 6 carac.)'}
                  />
                  {errors.password && <p className="text-[10px] text-status-danger mt-1 font-medium italic">{errors.password}</p>}
                </div>

                {editingId && (
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                    <input 
                      type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} 
                      id="isActiveCheck" className="w-5 h-5 accent-dts-secondary rounded border-gray-300 dark:border-white/20"
                    />
                    <label htmlFor="isActiveCheck" className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase cursor-pointer">Usuario Activo</label>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                   {editingId && (
                     <button type="button" onClick={resetForm} className="flex-1 py-3 bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-700 dark:text-white font-bold rounded-xl transition-all border border-gray-200 dark:border-white/5">
                        Cancelar
                     </button>
                   )}
                   <button 
                    type="submit" disabled={loading}
                    className={`flex-2 py-3 px-4 bg-linear-to-r ${editingId ? 'from-dts-primary to-dts-primary-light' : 'from-dts-secondary-dark to-dts-secondary'} hover:brightness-110 text-white font-bold rounded-xl shadow-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        {editingId ? <Edit2 size={18} /> : <UserPlus size={18} />}
                        <span>{editingId ? 'ACTUALIZAR' : 'CREAR USUARIO'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-surface-card-dark p-4 rounded-2xl border border-gray-100 dark:border-white/5 shadow-xl flex flex-col md:flex-row gap-4 items-center">
               <div className="relative flex-1 group">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 group-focus-within:text-dts-secondary transition-colors" size={16} />
                  <input 
                    type="text" 
                    placeholder="Búsqueda global dTS..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-dts-primary-dark/40 border border-gray-100 dark:border-white/5 rounded-xl outline-none focus:ring-2 focus:ring-dts-secondary/20 text-sm text-gray-900 dark:text-white transition-all"
                  />
               </div>
               
               <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 min-w-[200px]">
                  <Filter size={14} className="text-gray-400 dark:text-gray-500" />
                  <select 
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="bg-transparent border-none outline-none text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest cursor-pointer w-full"
                  >
                    <option value="all" className="bg-white dark:bg-surface-card-dark text-gray-900 dark:text-white">TODOS LOS ROLES</option>
                    {roles.map(r => <option key={r.id} value={r.id} className="bg-white dark:bg-surface-card-dark text-gray-900 dark:text-white">{r.name.toUpperCase()}</option>)}
                  </select>
               </div>
            </div>

            <div className="bg-white dark:bg-surface-card-dark rounded-2xl shadow-2xl border border-gray-100 dark:border-white/5 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#002A38] dark:bg-dts-primary-dark/80 text-white border-b border-gray-100 dark:border-white/5">
                    <tr>
                      <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-gray-100 dark:text-gray-400">Miembro</th>
                      <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-gray-100 dark:text-gray-400">Rol</th>
                      <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-gray-100 dark:text-gray-400 text-center">Estado</th>
                      <th className="px-6 py-5 font-black uppercase tracking-widest text-[10px] text-gray-100 dark:text-gray-400 text-right">Gestión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-gray-400 dark:text-gray-500 italic">
                          No se encontraron usuarios que coincidan con los criterios
                        </td>
                      </tr>
                    ) : (
                      filteredUsers.map((user) => (
                        <tr key={user.id} className="group hover:bg-gray-50 dark:hover:bg-white/2 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${user.isActive ? 'bg-linear-to-br from-dts-primary to-dts-secondary' : 'bg-gray-200 dark:bg-gray-800'}`}>
                                 {(user.firstName?.[0] || 'U')}{(user.lastName?.[0] || '')}
                              </div>
                              <div className="flex flex-col">
                                <span className="font-bold text-dts-primary dark:text-white group-hover:text-dts-secondary transition-colors uppercase tracking-tight">
                                  {user.firstName} {user.lastName}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-500 font-medium">{user.email}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                              user.roles?.name?.toLowerCase()?.includes('admin')
                                ? 'bg-dts-secondary/10 text-dts-secondary border-dts-secondary/20'
                                : 'bg-gray-100 dark:bg-gray-400/5 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-400/10'
                            }`}>
                              <Shield size={10} className="mr-1.5" />
                              {user.roles?.name || 'Invitado'}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                             <div className="flex justify-center">
                               {user.isActive ? (
                                 <span className="flex items-center gap-1.5 text-[10px] font-black text-status-success uppercase bg-status-success/5 px-2 py-1 rounded-full border border-status-success/20">
                                   <UserCheck size={12} /> ACTIVO
                                 </span>
                               ) : (
                                 <span className="flex items-center gap-1.5 text-[10px] font-black text-status-danger uppercase bg-status-danger/5 px-2 py-1 rounded-full border border-status-danger/20">
                                   <UserX size={12} /> INACTIVO
                                 </span>
                               )}
                             </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-end gap-1.5">
                              <button 
                                onClick={() => handleEdit(user)}
                                className="p-2 text-gray-400 hover:text-dts-primary dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                                title="Editar"
                              >
                                <Edit2 size={16} />
                              </button>
                              <button 
                                onClick={() => toggleStatus(user)}
                                className={`p-2 transition-all rounded-lg ${user.isActive ? 'text-gray-400 hover:text-status-warning hover:bg-gray-100 dark:hover:bg-white/5' : 'text-status-success hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                title={user.isActive ? "Desactivar" : "Activar"}
                              >
                                {user.isActive ? <UserX size={16} /> : <UserCheck size={16} />}
                              </button>
                              <button 
                                onClick={() => handleDelete(user.id)}
                                className="p-2 text-gray-400 hover:text-status-danger hover:bg-gray-100 dark:hover:bg-white/5 rounded-lg transition-all"
                                title="Eliminar"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

