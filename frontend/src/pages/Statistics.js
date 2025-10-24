import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const Statistics = () => {
  const { token } = useContext(AuthContext);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API}/statistics`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount || 0);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Cargando...</div>
        </div>
      </Layout>
    );
  }

  const categoryData = Object.entries(stats?.by_category || {}).map(([id, data]) => ({
    id,
    name: data.name,
    value: data.total,
    color: data.color,
    count: data.count,
    type: data.type
  }));

  const incomeCategories = categoryData.filter(c => c.type === 'income' && c.value > 0);
  const expenseCategories = categoryData.filter(c => c.type === 'expense' && c.value > 0);
  const savingCategories = categoryData.filter(c => c.type === 'saving' && c.value > 0);

  const hasData = stats?.total_income > 0 || stats?.total_expenses > 0 || stats?.total_savings > 0;

  // Calculate percentages for pie charts
  const calculatePercentages = (categories) => {
    const total = categories.reduce((sum, cat) => sum + cat.value, 0);
    let currentAngle = 0;
    return categories.map(cat => {
      const percentage = (cat.value / total) * 100;
      const angle = (percentage / 100) * 360;
      const result = {
        ...cat,
        percentage,
        startAngle: currentAngle,
        endAngle: currentAngle + angle
      };
      currentAngle += angle;
      return result;
    });
  };

  const PieChart = ({ data, title, bgColor }) => {
    if (!data || data.length === 0) return null;
    
    const dataWithAngles = calculatePercentages(data);
    const centerX = 150;
    const centerY = 150;
    const radius = 100;

    const polarToCartesian = (angle) => {
      const rad = (angle - 90) * Math.PI / 180;
      return {
        x: centerX + radius * Math.cos(rad),
        y: centerY + radius * Math.sin(rad)
      };
    };

    const createArc = (start, end) => {
      const startPoint = polarToCartesian(start);
      const endPoint = polarToCartesian(end);
      const largeArc = end - start > 180 ? 1 : 0;
      
      return `M ${centerX} ${centerY} L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 1 ${endPoint.x} ${endPoint.y} Z`;
    };

    return (
      <div>
        <svg viewBox="0 0 300 300" className="w-full h-auto max-w-sm mx-auto">
          {dataWithAngles.map((item, index) => (
            <g key={index}>
              <path
                d={createArc(item.startAngle, item.endAngle)}
                fill={item.color}
                stroke="white"
                strokeWidth="2"
              />
            </g>
          ))}
        </svg>
        <div className="flex flex-wrap gap-3 justify-center mt-4">
          {dataWithAngles.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: item.color }} />
              <span className="text-sm text-slate-700">
                {item.name} ({item.percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const BarChart = () => {
    const maxValue = Math.max(stats?.total_income || 0, stats?.total_expenses || 0, stats?.total_savings || 0);
    const bars = [
      { label: 'Ingresos', value: stats?.total_income || 0, color: '#10b981' },
      { label: 'Gastos', value: stats?.total_expenses || 0, color: '#ef4444' },
      { label: 'Ahorros', value: stats?.total_savings || 0, color: '#3b82f6' }
    ];

    return (
      <div className="space-y-6">
        {bars.map((bar, index) => {
          const percentage = maxValue > 0 ? (bar.value / maxValue) * 100 : 0;
          return (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-slate-700">{bar.label}</span>
                <span className="text-sm font-bold" style={{ color: bar.color }}>
                  {formatCurrency(bar.value)}
                </span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-8 overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center justify-end px-3 text-white text-sm font-semibold transition-all duration-500"
                  style={{
                    width: `${percentage}%`,
                    backgroundColor: bar.color,
                    minWidth: bar.value > 0 ? '60px' : '0'
                  }}
                >
                  {percentage > 15 && `${percentage.toFixed(0)}%`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="statistics-container">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Estadísticas</h1>
          <p className="text-slate-600 mt-2">Análisis visual de tus finanzas</p>
        </div>

        {!hasData ? (
          <Card className="p-12 bg-white/80 backdrop-blur-sm border-slate-200">
            <div className="text-center">
              <p className="text-lg text-slate-600 mb-4">
                No hay datos suficientes para mostrar estadísticas.
              </p>
              <p className="text-slate-500">
                Comienza agregando transacciones en la sección de Transacciones.
              </p>
            </div>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                <p className="text-4xl font-bold text-green-900 mt-2">{formatCurrency(stats?.total_income)}</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 border-red-200">
                <p className="text-sm text-red-700 font-medium">Gastos Totales</p>
                <p className="text-4xl font-bold text-red-900 mt-2">{formatCurrency(stats?.total_expenses)}</p>
              </Card>
              <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                <p className="text-sm text-blue-700 font-medium">Ahorros Totales</p>
                <p className="text-4xl font-bold text-blue-900 mt-2">{formatCurrency(stats?.total_savings)}</p>
              </Card>
            </div>

            {/* Bar Chart */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Resumen General</h2>
              <BarChart />
            </Card>

            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Ingresos por Categoría</h2>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <PieChart data={incomeCategories} title="Ingresos" bgColor="green" />
                  <div className="space-y-3">
                    {incomeCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                          <span className="font-medium text-slate-900">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-700">{formatCurrency(category.value)}</p>
                          <p className="text-xs text-slate-600">{category.count} transacciones</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Expense Categories */}
            {expenseCategories.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Gastos por Categoría</h2>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <PieChart data={expenseCategories} title="Gastos" bgColor="red" />
                  <div className="space-y-3">
                    {expenseCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                          <span className="font-medium text-slate-900">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-red-700">{formatCurrency(category.value)}</p>
                          <p className="text-xs text-slate-600">{category.count} transacciones</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Saving Categories */}
            {savingCategories.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Ahorros por Categoría</h2>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <PieChart data={savingCategories} title="Ahorros" bgColor="blue" />
                  <div className="space-y-3">
                    {savingCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.color }} />
                          <span className="font-medium text-slate-900">{category.name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-blue-700">{formatCurrency(category.value)}</p>
                          <p className="text-xs text-slate-600">{category.count} transacciones</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
};

export default Statistics;