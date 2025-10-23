import React, { useContext, useEffect, useState } from 'react';
import { AuthContext, API } from '@/App';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Edit, Trash2, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';

const Transactions = () => {
  const { token } = useContext(AuthContext);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [filterType, setFilterType] = useState('all');
  const [formData, setFormData] = useState({
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category_id: '',
    type: 'expense'
  });

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await axios.get(`${API}/transactions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransactions(response.data);
    } catch (error) {
      toast.error('Error al cargar transacciones');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTransaction) {
        await axios.put(`${API}/transactions/${editingTransaction.id}`, {
          amount: parseFloat(formData.amount),
          description: formData.description,
          date: formData.date,
          category_id: formData.category_id
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Transacción actualizada');
      } else {
        await axios.post(`${API}/transactions`, {
          ...formData,
          amount: parseFloat(formData.amount)
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Transacción creada');
      }
      setIsDialogOpen(false);
      setEditingTransaction(null);
      resetForm();
      fetchTransactions();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar transacción');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta transacción?')) return;
    try {
      await axios.delete(`${API}/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Transacción eliminada');
      fetchTransactions();
    } catch (error) {
      toast.error('Error al eliminar transacción');
    }
  };

  const resetForm = () => {
    setFormData({
      amount: '',
      description: '',
      date: new Date().toISOString().split('T')[0],
      category_id: '',
      type: 'expense'
    });
  };

  const openEditDialog = (transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      description: transaction.description,
      date: transaction.date,
      category_id: transaction.category_id,
      type: transaction.type
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingTransaction(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || 'Sin categoría';
  };

  const filteredTransactions = filterType === 'all' 
    ? transactions 
    : transactions.filter(t => t.type === filterType);

  const availableCategories = categories.filter(c => c.type === formData.type);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-600">Cargando...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6" data-testid="transactions-container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Transacciones</h1>
            <p className="text-slate-600 mt-2">Gestiona tus ingresos, gastos y ahorros</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                data-testid="create-transaction-button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Transacción
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {editingTransaction ? 'Editar Transacción' : 'Nueva Transacción'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value, category_id: '' })}
                    disabled={!!editingTransaction}
                  >
                    <SelectTrigger data-testid="type-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Ingreso</SelectItem>
                      <SelectItem value="expense">Gasto</SelectItem>
                      <SelectItem value="saving">Ahorro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Monto</Label>
                  <Input
                    id="amount"
                    data-testid="amount-input"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    data-testid="description-input"
                    placeholder="Descripción de la transacción"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Fecha</Label>
                  <Input
                    id="date"
                    data-testid="date-input"
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoría</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger data-testid="category-select">
                      <SelectValue placeholder="Selecciona una categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  type="submit"
                  data-testid="submit-transaction-button"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {editingTransaction ? 'Actualizar' : 'Crear'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Filter buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => setFilterType('all')}
            data-testid="filter-all"
            variant={filterType === 'all' ? 'default' : 'outline'}
            className={filterType === 'all' ? 'bg-slate-900' : ''}
          >
            Todas
          </Button>
          <Button
            onClick={() => setFilterType('income')}
            data-testid="filter-income"
            variant={filterType === 'income' ? 'default' : 'outline'}
            className={filterType === 'income' ? 'bg-green-600 hover:bg-green-700' : ''}
          >
            Ingresos
          </Button>
          <Button
            onClick={() => setFilterType('expense')}
            data-testid="filter-expense"
            variant={filterType === 'expense' ? 'default' : 'outline'}
            className={filterType === 'expense' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            Gastos
          </Button>
          <Button
            onClick={() => setFilterType('saving')}
            data-testid="filter-saving"
            variant={filterType === 'saving' ? 'default' : 'outline'}
            className={filterType === 'saving' ? 'bg-blue-600 hover:bg-blue-700' : ''}
          >
            Ahorros
          </Button>
        </div>

        {/* Transactions list */}
        <Card className="p-6 bg-white/80 backdrop-blur-sm border-slate-200">
          <div className="space-y-3">
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  data-testid={`transaction-item-${transaction.id}`}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 group"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${
                      transaction.type === 'income' ? 'bg-green-100' :
                      transaction.type === 'expense' ? 'bg-red-100' : 'bg-blue-100'
                    }`}>
                      {transaction.type === 'income' ? (
                        <ArrowUpRight className="w-5 h-5 text-green-600" />
                      ) : transaction.type === 'expense' ? (
                        <ArrowDownRight className="w-5 h-5 text-red-600" />
                      ) : (
                        <PiggyBank className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-slate-900">{transaction.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm text-slate-600">{getCategoryName(transaction.category_id)}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-sm text-slate-600">
                          {new Date(transaction.date).toLocaleDateString('es-MX')}
                        </span>
                      </div>
                    </div>
                    <div className={`text-xl font-bold ${
                      transaction.type === 'income' ? 'text-green-600' :
                      transaction.type === 'expense' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`edit-transaction-${transaction.id}`}
                      onClick={() => openEditDialog(transaction)}
                      className="hover:bg-blue-100"
                    >
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      data-testid={`delete-transaction-${transaction.id}`}
                      onClick={() => handleDelete(transaction.id)}
                      className="hover:bg-red-100"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-slate-600 py-8">No hay transacciones</p>
            )}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default Transactions;