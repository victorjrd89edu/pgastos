import React, { useContext, useState, useRef } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { User as UserIcon, Mail, Shield, Camera, Eye, EyeOff } from 'lucide-react';

const Profile = () => {
  const { user, token, login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    username: user?.username || '',
    current_password: '',
    new_password: '',
    confirm_password: '',
    profile_image: user?.profile_image || ''
  });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, profile_image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Validate password change if attempting to change
    if (formData.new_password) {
      if (!formData.current_password) {
        toast.error('Ingresa tu contraseña actual para cambiarla');
        setLoading(false);
        return;
      }
      if (formData.new_password !== formData.confirm_password) {
        toast.error('Las contraseñas nuevas no coinciden');
        setLoading(false);
        return;
      }
      if (formData.new_password.length < 6) {
        toast.error('La nueva contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }
    }

    try {
      const updateData = {
        username: formData.username
      };

      if (formData.profile_image !== user?.profile_image) {
        updateData.profile_image = formData.profile_image;
      }

      if (formData.new_password) {
        updateData.current_password = formData.current_password;
        updateData.new_password = formData.new_password;
      }

      const response = await axios.put(`${API}/profile`, updateData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Update user context
      login(token, response.data);
      
      toast.success('Perfil actualizado exitosamente');
      
      // Clear password fields
      setFormData({
        ...formData,
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al actualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6" data-testid="profile-container">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Mi Perfil</h1>
          <p className="text-slate-600 mt-2">Administra tu información personal</p>
        </div>

        <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Profile Image */}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  {formData.profile_image ? (
                    <img 
                      src={formData.profile_image} 
                      alt="Profile" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <UserIcon className="w-16 h-16 text-white" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full text-white hover:bg-blue-700 shadow-lg"
                >
                  <Camera className="w-5 h-5" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>
              <p className="text-sm text-slate-500">Haz clic en la cámara para cambiar tu foto</p>
            </div>

            {/* Account Info */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Información de la Cuenta</h3>
              
              <div className="space-y-2">
                <Label htmlFor="username">Nombre de Usuario</Label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    id="username"
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="pl-10"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="pl-10 bg-slate-100"
                  />
                </div>
                <p className="text-xs text-slate-500">El email no se puede cambiar</p>
              </div>

              <div className="space-y-2">
                <Label>Rol</Label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={user?.role === 'admin' ? 'Administrador' : 'Usuario'}
                    disabled
                    className="pl-10 bg-slate-100"
                  />
                </div>
              </div>
            </div>

            {/* Change Password */}
            <div className="space-y-4 pt-4 border-t border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Cambiar Contraseña</h3>
              
              <div className="space-y-2">
                <Label htmlFor="current_password">Contraseña Actual</Label>
                <div className="relative">
                  <Input
                    id="current_password"
                    type={showCurrentPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.current_password}
                    onChange={(e) => setFormData({ ...formData, current_password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showCurrentPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nueva Contraseña</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.new_password}
                    onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-xs text-slate-500">Mínimo 6 caracteres</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirm_password}
                  onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
                />
              </div>

              <p className="text-sm text-slate-600">
                Deja estos campos vacíos si no deseas cambiar tu contraseña
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-6 rounded-xl"
            >
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </Button>
          </form>
        </Card>
      </div>
    </Layout>
  );
};

export default Profile;
