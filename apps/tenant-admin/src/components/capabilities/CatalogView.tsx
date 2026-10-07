import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Dialog,
} from '@whitraworks/ui';
import {
  Plus,
  Search,
  PackageCheck,
  PackageX,
  DollarSign,
  Tag,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export interface CatalogItem {
  id: string;
  name: string;
  category: 'mains' | 'appetizers' | 'beverages' | 'desserts' | 'sides';
  price: number;
  sku: string;
  description: string;
  inStock: boolean;
  dietary?: string[];
  updatedAt: string;
}

const DEFAULT_CATALOG: CatalogItem[] = [
  {
    id: 'cat-01',
    name: 'Artisan Truffle Beef Burger',
    category: 'mains',
    price: 18.5,
    sku: 'BUR-001',
    description: 'Brioche bun, aged gruyère, truffle aioli, caramelized shallots, arugula.',
    inStock: true,
    dietary: ['Signature'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-02',
    name: 'Margherita Verace Pizza',
    category: 'mains',
    price: 16.0,
    sku: 'PIZ-002',
    description: 'San Marzano DOP tomatoes, buffalo mozzarella, fresh basil, extra virgin olive oil.',
    inStock: true,
    dietary: ['Vegetarian'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-03',
    name: 'Crispy Calamari Fritti',
    category: 'appetizers',
    price: 13.5,
    sku: 'APP-003',
    description: 'Flash-fried squid with smoked paprika dust, lemon wedges, and house saffron aioli.',
    inStock: true,
    dietary: ['Gluten-Free Option'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-04',
    name: 'Truffle & Parmesan Fries',
    category: 'sides',
    price: 8.0,
    sku: 'SID-004',
    description: 'Hand-cut russet potatoes, white truffle oil, shaved 24-month Parmigiano Reggiano.',
    inStock: true,
    dietary: ['Vegetarian'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-05',
    name: 'Belgian Dark Chocolate Fondant',
    category: 'desserts',
    price: 10.0,
    sku: 'DES-005',
    description: 'Warm molten 70% Valrhona dark chocolate cake with Tahitian vanilla bean gelato.',
    inStock: false,
    dietary: ['Vegetarian'],
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'cat-06',
    name: 'Organic Hibiscus & Mint Iced Tea',
    category: 'beverages',
    price: 5.5,
    sku: 'BEV-006',
    description: 'Cold-steeped wild hibiscus flowers, garden spearmint, agave, fresh lime.',
    inStock: true,
    dietary: ['Vegan', 'Caffeine-Free'],
    updatedAt: new Date().toISOString(),
  },
];

const CATEGORIES: { label: string; value: string }[] = [
  { label: 'All Categories', value: 'all' },
  { label: 'Mains', value: 'mains' },
  { label: 'Appetizers', value: 'appetizers' },
  { label: 'Beverages', value: 'beverages' },
  { label: 'Desserts', value: 'desserts' },
  { label: 'Sides', value: 'sides' },
];

export function CatalogView() {
  const { slug } = useTenant();
  const storageKey = `whitraworks_${slug || 'demo'}_catalog_items`;

  const [items, setItems] = useState<CatalogItem[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored) as CatalogItem[];
      }
    } catch {
      // Fallback
    }
    return DEFAULT_CATALOG;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    name: string;
    category: CatalogItem['category'];
    price: string;
    sku: string;
    description: string;
    inStock: boolean;
    dietaryString: string;
  }>({
    name: '',
    category: 'mains',
    price: '',
    sku: '',
    description: '',
    inStock: true,
    dietaryString: '',
  });

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignore quota errors
    }
  }, [items, storageKey]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: 'mains',
      price: '',
      sku: `SKU-${Math.floor(100 + Math.random() * 900)}`,
      description: '',
      inStock: true,
      dietaryString: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price.toString(),
      sku: item.sku,
      description: item.description,
      inStock: item.inStock,
      dietaryString: (item.dietary || []).join(', '),
    });
    setIsModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price) return;

    const parsedPrice = parseFloat(formData.price) || 0;
    const dietaryTags = formData.dietaryString
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                name: formData.name.trim(),
                category: formData.category,
                price: parsedPrice,
                sku: formData.sku.trim(),
                description: formData.description.trim(),
                inStock: formData.inStock,
                dietary: dietaryTags,
                updatedAt: new Date().toISOString(),
              }
            : item
        )
      );
    } else {
      const newItem: CatalogItem = {
        id: `cat-${Date.now().toString(36)}`,
        name: formData.name.trim(),
        category: formData.category,
        price: parsedPrice,
        sku: formData.sku.trim(),
        description: formData.description.trim(),
        inStock: formData.inStock,
        dietary: dietaryTags,
        updatedAt: new Date().toISOString(),
      };
      setItems((prev) => [newItem, ...prev]);
    }

    setIsModalOpen(false);
  };

  const handleToggleStock = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, inStock: !item.inStock, updatedAt: new Date().toISOString() } : item
      )
    );
  };

  const handleDeleteItem = (id: string) => {
    if (confirm('Are you sure you want to delete this catalog product?')) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'in_stock' && item.inStock) ||
        (statusFilter === 'out_of_stock' && !item.inStock);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, statusFilter]);

  // Statistics
  const totalProducts = items.length;
  const activeCategoriesCount = new Set(items.map((i) => i.category)).size;
  const averagePrice =
    totalProducts > 0
      ? (items.reduce((acc, curr) => acc + curr.price, 0) / totalProducts).toFixed(2)
      : '0.00';
  const outOfStockCount = items.filter((i) => !i.inStock).length;

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Products
            </CardTitle>
            <PackageCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalProducts}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Catalog items active</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Categories
            </CardTitle>
            <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeCategoriesCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Menu classification groups</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Average Price
            </CardTitle>
            <DollarSign className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">${averagePrice}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Per unit list price</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Out of Stock
            </CardTitle>
            <PackageX className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{outOfStockCount}</div>
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">
              {outOfStockCount > 0 ? 'Requires attention / prep' : 'Full availability'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar: Search, Category Filters, Add Item */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search products by name, SKU, or ingredients..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="text-xs px-2.5 py-1.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 focus:outline-none"
              >
                <option value="all">All Availability</option>
                <option value="in_stock">In Stock Only</option>
                <option value="out_of_stock">Out of Stock Only</option>
              </select>

              <Button onClick={handleOpenAddModal} size="sm" className="gap-1.5 shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>Add Product</span>
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCategory(cat.value)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                  selectedCategory === cat.value
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Catalog Table */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Product Name & Details</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Price</th>
                <th className="px-4 py-3">Stock Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <AlertTriangle className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="font-medium">No products match your search or filter</p>
                    <p className="text-xs text-slate-400 mt-1">Try clearing filters or adding a new product</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{item.name}</span>
                          {item.dietary?.map((tag) => (
                            <span
                              key={tag}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-normal"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5 max-w-md">
                          {item.description}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs text-slate-600 dark:text-slate-400">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                      ${item.price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => handleToggleStock(item.id)}
                        className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors cursor-pointer ${
                          item.inStock
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 hover:bg-rose-100'
                        }`}
                        title="Click to toggle availability"
                      >
                        {item.inStock ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> In Stock
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3 text-rose-600" /> Sold Out
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenEditModal(item)}
                          className="h-8 w-8 p-0 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteItem(item.id)}
                          className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 dark:hover:text-rose-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add / Edit Product Modal */}
      <Dialog
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Product' : 'Add New Catalog Product'}
        description="Configure product details, pricing, stock availability, and categories."
      >
        <form onSubmit={handleSaveItem} className="space-y-4">
          <Input
            label="Product Name"
            placeholder="e.g. Truffle Beef Burger"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value as CatalogItem['category'] })
                }
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="mains">Mains</option>
                <option value="appetizers">Appetizers</option>
                <option value="beverages">Beverages</option>
                <option value="desserts">Desserts</option>
                <option value="sides">Sides</option>
              </select>
            </div>

            <Input
              label="Price (USD)"
              type="number"
              step="0.01"
              min="0"
              placeholder="15.50"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Item Code"
              placeholder="BUR-001"
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              required
            />

            <Input
              label="Dietary / Labels (comma-separated)"
              placeholder="e.g. Vegan, Signature"
              value={formData.dietaryString}
              onChange={(e) => setFormData({ ...formData, dietaryString: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description & Ingredients
            </label>
            <textarea
              rows={3}
              placeholder="Brief description of the menu item..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full text-sm p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="inStockCheck"
              checked={formData.inStock}
              onChange={(e) => setFormData({ ...formData, inStock: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
            />
            <label htmlFor="inStockCheck" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Immediately Available for Ordering (In Stock)
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingItem ? 'Save Changes' : 'Create Product'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
