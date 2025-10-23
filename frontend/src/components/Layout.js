import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthContext } from '@/App';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Receipt, Tag, BarChart3, LogOut, Wallet, Shield } from 'lucide-react';
import { toast } from 'sonner';

const Layout = ({ children }) => {
  const { user, logout } = useContext(AuthContext);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
    toast.success('¡Hasta pronto!');
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/transactions', label: 'Transacciones', icon: Receipt },
    { path: '/categories', label: 'Categorías', icon: Tag },
    { path: '/statistics', label: 'Estadísticas', icon: BarChart3 }
  ];
  
  // Add admin panel if user is admin
  if (user?.role === 'admin') {
    navItems.push({ path: '/admin', label: 'Admin', icon: LogOut });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navigation Bar */}
      <nav className="bg-white/80 backdrop-blur-lg border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                <Wallet className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">FinanzasApp</span>
            </div>

            <div className="hidden md:flex items-center gap-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link key={item.path} to={item.path}>
                    <Button
                      variant={isActive ? 'default' : 'ghost'}
                      data-testid={`nav-${item.label.toLowerCase()}`}
                      className={isActive ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white' : 'text-slate-700 hover:bg-slate-100'}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.label}
                    </Button>
                  </Link>
                );
              })}
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-900">{user?.username}</p>
                <p className="text-xs text-slate-600">{user?.email}</p>
              </div>
              <Button
                onClick={handleLogout}
                data-testid="logout-button"
                variant="outline"
                className="border-slate-300 hover:bg-red-50 hover:border-red-300 hover:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Salir
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-lg border-t border-slate-200 z-50">
        <div className="grid grid-cols-4 gap-1 p-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path}>
                <button
                  className={`flex flex-col items-center justify-center p-2 rounded-lg ${
                    isActive
                      ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs mt-1">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mb-20 md:mb-8">
        {children}
      </main>
    </div>
  );
};

export default Layout;