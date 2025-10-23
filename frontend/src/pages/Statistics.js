import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

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
      console.log('Statistics data:', response.data);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
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

  // Prepare data for charts
  const summaryData = [
    { name: 'Ingresos', value: stats?.total_income || 0, fill: '#10b981' },
    { name: 'Gastos', value: stats?.total_expenses || 0, fill: '#ef4444' },
    { name: 'Ahorros', value: stats?.total_savings || 0, fill: '#3b82f6' }
  ];

  const categoryData = Object.entries(stats?.by_category || {}).map(([id, data]) => ({
    id,
    name: data.name,
    value: data.total,
    fill: data.color,
    count: data.count,
    type: data.type
  }));

  const incomeCategories = categoryData.filter(c => c.type === 'income');
  const expenseCategories = categoryData.filter(c => c.type === 'expense');
  const savingCategories = categoryData.filter(c => c.type === 'saving');

  const hasData = stats?.total_income > 0 || stats?.total_expenses > 0 || stats?.total_savings > 0;

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900">{payload[0].name}</p>
          <p className="text-sm text-slate-600">
            {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.count && (
            <p className="text-xs text-slate-500 mt-1">
              {payload[0].payload.count} transacciones
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = (entry) => {
    const percent = entry.percent ? (entry.percent * 100).toFixed(0) : 0;
    return `${entry.name} ${percent}%`;
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="statistics-container">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Estadísticas</h1>
          <p className="text-slate-600 mt-2">Análisis detallado de tus finanzas</p>
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
            {/* Summary Overview */}
            <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Resumen General</h2>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-green-50 rounded-xl">
                  <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">{formatCurrency(stats?.total_income)}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl">
                  <p className="text-sm text-red-700 font-medium">Gastos Totales</p>
                  <p className="text-3xl font-bold text-red-900 mt-2">{formatCurrency(stats?.total_expenses)}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl">
                  <p className="text-sm text-blue-700 font-medium">Ahorros Totales</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">{formatCurrency(stats?.total_savings)}</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={summaryData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" />
                  <YAxis stroke="#64748b" tickFormatter={(value) => `$${value.toLocaleString()}`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Ingresos por Categoría</h2>
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={incomeCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {incomeCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {incomeCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.fill }} />
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
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={expenseCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {expenseCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {expenseCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.fill }} />
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
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="flex items-center justify-center">
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={savingCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomLabel}
                          outerRadius={100}
                          dataKey="value"
                        >
                          {savingCategories.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {savingCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: category.fill }} />
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