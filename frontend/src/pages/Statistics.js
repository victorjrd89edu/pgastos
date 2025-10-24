import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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

  // Prepare data for summary bar chart
  const summaryData = [
    { name: 'Ingresos', value: stats?.total_income || 0, fill: '#10b981' },
    { name: 'Gastos', value: stats?.total_expenses || 0, fill: '#ef4444' },
    { name: 'Ahorros', value: stats?.total_savings || 0, fill: '#3b82f6' }
  ].filter(item => item.value > 0);

  // Prepare category data
  const categoryData = Object.entries(stats?.by_category || {}).map(([id, data]) => ({
    id,
    name: data.name,
    value: data.total,
    fill: data.color,
    count: data.count,
    type: data.type
  }));

  const incomeCategories = categoryData.filter(c => c.type === 'income' && c.value > 0);
  const expenseCategories = categoryData.filter(c => c.type === 'expense' && c.value > 0);
  const savingCategories = categoryData.filter(c => c.type === 'saving' && c.value > 0);

  const hasData = summaryData.length > 0;

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-200">
          <p className="font-semibold text-slate-900">{payload[0].name}</p>
          <p className="text-sm text-slate-600 font-bold">
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

            {/* Summary Bar Chart */}
            {summaryData.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Resumen General</h2>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={summaryData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#64748b" style={{ fontSize: '14px' }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '14px' }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Income Categories */}
            {incomeCategories.length > 0 && (
              <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
                <h2 className="text-2xl font-bold text-slate-900 mb-6">Ingresos por Categoría</h2>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={incomeCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          dataKey="value"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {incomeCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
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
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={expenseCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          dataKey="value"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {expenseCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-red-50 rounded-lg border border-red-200">
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
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={savingCategories}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={renderCustomizedLabel}
                          outerRadius={100}
                          dataKey="value"
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {savingCategories.map((category, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
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