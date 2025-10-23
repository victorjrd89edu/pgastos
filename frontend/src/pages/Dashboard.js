import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Wallet, TrendingUp, TrendingDown, PiggyBank, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { toast } from 'sonner';

const Dashboard = () => {
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

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Cargando...</div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  return (
    <Layout>
      <div className="space-y-6" data-testid="dashboard-container">
        <div>
          <h1 className="text-4xl font-bold text-slate-900">Panel de Control</h1>
          <p className="text-slate-600 mt-2">Resumen de tus finanzas</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200 card-hover" data-testid="income-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Ingresos Totales</p>
                <p className="text-3xl font-bold text-green-900 mt-2" data-testid="total-income">
                  {formatCurrency(stats?.total_income || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-200 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-red-50 to-rose-50 border-red-200 card-hover" data-testid="expenses-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700 font-medium">Gastos Totales</p>
                <p className="text-3xl font-bold text-red-900 mt-2" data-testid="total-expenses">
                  {formatCurrency(stats?.total_expenses || 0)}
                </p>
              </div>
              <div className="p-3 bg-red-200 rounded-xl">
                <TrendingDown className="w-6 h-6 text-red-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200 card-hover" data-testid="savings-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Ahorros Totales</p>
                <p className="text-3xl font-bold text-blue-900 mt-2" data-testid="total-savings">
                  {formatCurrency(stats?.total_savings || 0)}
                </p>
              </div>
              <div className="p-3 bg-blue-200 rounded-xl">
                <PiggyBank className="w-6 h-6 text-blue-700" />
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200 card-hover" data-testid="balance-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Balance</p>
                <p className="text-3xl font-bold text-purple-900 mt-2" data-testid="balance">
                  {formatCurrency(stats?.balance || 0)}
                </p>
              </div>
              <div className="p-3 bg-purple-200 rounded-xl">
                <Wallet className="w-6 h-6 text-purple-700" />
              </div>
            </div>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Transacciones Recientes</h2>
          <div className="space-y-3">
            {stats?.recent_transactions && stats.recent_transactions.length > 0 ? (
              stats.recent_transactions.map((transaction) => (
                <div
                  key={transaction.id}
                  data-testid={`recent-transaction-${transaction.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${
                      transaction.type === 'income' ? 'bg-green-100' :
                      transaction.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className={`w-5 h-5 text-green-600`} />
                      ) : transaction.type === 'expense' ? (
                        <ArrowDownRight className={`w-5 h-5 text-red-600`} />
                      ) : (
                        <PiggyBank className={`w-5 h-5 text-blue-600`} />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{transaction.description}</p>
                      <p className="text-sm text-slate-600">{new Date(transaction.date).toLocaleDateString('es-MX')}</p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    transaction.type === 'income' ? 'text-green-600' :
                    transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-600 py-8">No hay transacciones recientes</p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;