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
import { toast } from 'sonner';
import { Plus, Edit, Trash2, Tag } from 'lucide-react';

const Categories = () => {
  const { token } = useContext(AuthContext);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    color: '#3b82f6'
  });

  const predefinedColors = [
    '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6',
    '#ec4899', '#06b6d4', '#14b8a6', '#f97316', '#84cc16'
  ];

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API}/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(response.data);
    } catch (error) {
      toast.error('Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}`, {
          name: formData.name,
          color: formData.color
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoría actualizada');
      } else {
        await axios.post(`${API}/categories`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        toast.success('Categoría creada');
      }
      setIsDialogOpen(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al guardar categoría');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta categoría? Se eliminarán todas las transacciones asociadas.')) return;
    try {
      await axios.delete(`${API}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Categoría eliminada');
      fetchCategories();
    } catch (error) {
      toast.error('Error al eliminar categoría');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      color: '#3b82f6'
    });
  };

  const openEditDialog = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      type: category.type,
      color: category.color
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingCategory(null);
    resetForm();
    setIsDialogOpen(true);
  };

  const groupedCategories = {
    income: categories.filter(c => c.type === 'income'),
    expense: categories.filter(c => c.type === 'expense'),
    saving: categories.filter(c => c.type === 'saving')
  };

  const typeLabels = {
    income: 'Ingresos',
    expense: 'Gastos',
    saving: 'Ahorros'
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

  return (
    <Layout>
      <div className="space-y-6" data-testid="categories-container">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Categorías</h1>
            <p className="text-slate-600 mt-2">Organiza tus transacciones</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                onClick={openCreateDialog}
                data-testid="create-category-button"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nueva Categoría
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle data-testid="dialog-title">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre</Label>
                  <Input
                    id="name"
                    data-testid="name-input"
                    placeholder="Nombre de la categoría"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="type">Tipo</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value) => setFormData({ ...formData, type: value })}
                    disabled={!!editingCategory}
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
                  <Label>Color</Label>
                  <div className="flex gap-2 flex-wrap">
                    {predefinedColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        data-testid={`color-${color}`}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 ${
                          formData.color === color ? 'border-slate-900 scale-110' : 'border-slate-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <Button
                  type="submit"
                  data-testid="submit-category-button"
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                >
                  {editingCategory ? 'Actualizar' : 'Crear'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Categories grouped by type */}
        <div className="space-y-8">
          {Object.entries(groupedCategories).map(([type, cats]) => (
            <div key={type}>
              <h2 className="text-2xl font-bold text-slate-900 mb-4">{typeLabels[type]}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cats.length > 0 ? (
                  cats.map((category) => (
                    <Card
                      key={category.id}
                      data-testid={`category-card-${category.id}`}
                      className="p-4 bg-white/80 backdrop-blur-sm border-slate-200 card-hover group"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-12 h-12 rounded-xl flex items-center justify-center"
                            style={{ backgroundColor: category.color + '20' }}
                          >
                            <Tag className="w-6 h-6" style={{ color: category.color }} />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{category.name}</p>
                            <p className="text-sm text-slate-600 capitalize">{typeLabels[category.type]}</p>
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`edit-category-${category.id}`}
                            onClick={() => openEditDialog(category)}
                            className="hover:bg-blue-100"
                          >
                            <Edit className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            data-testid={`delete-category-${category.id}`}
                            onClick={() => handleDelete(category.id)}
                            className="hover:bg-red-100"
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))
                ) : (
                  <p className="text-slate-600 col-span-full text-center py-4">
                    No hay categorías de {typeLabels[type].toLowerCase()}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
};

export default Categories;