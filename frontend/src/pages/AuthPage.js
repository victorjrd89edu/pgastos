import React, { useState, useContext } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Wallet, TrendingUp, PiggyBank, Eye, EyeOff } from 'lucide-react';

const AuthPage = () => {
  const { login } = useContext(AuthContext);
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/register';
      const payload = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;
      
      const response = await axios.post(`${API}${endpoint}`, payload);
      
      if (!isLogin) {
        toast.success('¡Cuenta creada! Revisa tu email para verificar tu cuenta.');
        // Clear form
        setFormData({ username: '', email: '', password: '' });
        setIsLogin(true);
      } else {
        login(response.data.access_token, response.data.user);
        toast.success('¡Bienvenido!');
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Error en la autenticación';
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-8 items-center">
        {/* Left side - Hero section */}
        <div className="text-left space-y-6 p-8">
          <div className="space-y-4">
            <h1 className="text-5xl lg:text-6xl font-bold text-slate-900 leading-tight">
              Controla tus
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"> Finanzas</span>
            </h1>
            <p className="text-lg text-slate-600">
              Gestiona tus ingresos, gastos y ahorros de manera inteligente. Toma el control de tu futuro financiero hoy.
            </p>
          </div>
          
          <div className="grid gap-4 pt-4">
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Seguimiento en tiempo real</h3>
                <p className="text-sm text-slate-600">Visualiza tus finanzas al instante</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Wallet className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Categorías personalizadas</h3>
                <p className="text-sm text-slate-600">Organiza tus transacciones a tu manera</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-slate-200">
              <div className="p-2 bg-purple-100 rounded-lg">
                <PiggyBank className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">Metas de ahorro</h3>
                <p className="text-sm text-slate-600">Alcanza tus objetivos financieros</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Auth form */}
        <Card className="p-8 bg-white/80 backdrop-blur-sm border-slate-200 shadow-xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-bold text-slate-900">
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </h2>
              <p className="text-slate-600">
                {isLogin ? '¡Bienvenido de nuevo!' : 'Comienza tu viaje financiero'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="username" data-testid="username-label">Nombre de usuario</Label>
                  <Input
                    id="username"
                    data-testid="username-input"
                    type="text"
                    placeholder="Tu nombre"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    required={!isLogin}
                    className="border-slate-300"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" data-testid="email-label">Correo electrónico</Label>
                <Input
                  id="email"
                  data-testid="email-input"
                  type="email"
                  placeholder="tu@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" data-testid="password-label">Contraseña</Label>
                <div className="relative">
                  <Input
                    id="password"
                    data-testid="password-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    className="border-slate-300 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                data-testid="auth-submit-button"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-6 rounded-xl"
              >
                {loading ? 'Procesando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
              </Button>
            </form>

            <div className="text-center">
              <button
                type="button"
                data-testid="toggle-auth-mode"
                onClick={() => setIsLogin(!isLogin)}
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                {isLogin ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
              </button>
              
              {isLogin && (
                <>
                  <div className="my-2 text-slate-400">•</div>
                  <a
                    href="/forgot-password"
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </a>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;