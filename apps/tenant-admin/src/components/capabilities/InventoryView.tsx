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
  Boxes,
  AlertTriangle,
  ArrowUpDown,
  Plus,
  Search,
  DollarSign,
  CheckCircle2,
  Truck,
  Building,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string;
  category: 'ingredients' | 'beverages' | 'dry_goods' | 'packaging';
  currentStock: number;
  reorderPoint: number;
  optimalStock: number;
  unit: string; // 'kg', 'L', 'units', 'boxes'
  unitCost: number;
  supplier: string;
  lastRestocked: string;
}

const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-01',
    name: 'Prime Black Angus Beef Patties (8oz)',
    sku: 'RAW-BEEF-01',
    category: 'ingredients',
    currentStock: 14,
    reorderPoint: 25,
    optimalStock: 100,
    unit: 'units',
    unitCost: 3.5,
    supplier: 'Highland Ranch Farms',
    lastRestocked: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: 'inv-02',
    name: 'San Marzano Tomatoes DOP (Canned)',
    sku: 'TOM-DOP-02',
    category: 'dry_goods',
    currentStock: 48,
    reorderPoint: 20,
    optimalStock: 80,
    unit: 'cans',
    unitCost: 2.1,
    supplier: 'Mediterranean Imports Co.',
    lastRestocked: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
  {
    id: 'inv-03',
    name: 'White Truffle Infused Olive Oil (1L)',
    sku: 'OIL-TRUF-03',
    category: 'ingredients',
    currentStock: 3,
    reorderPoint: 5,
    optimalStock: 15,
    unit: 'L',
    unitCost: 28.0,
    supplier: 'Artisan Culinary Supplies',
    lastRestocked: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: 'inv-04',
    name: 'Biodegradable Takeout Burger Boxes',
    sku: 'PKG-BOX-04',
    category: 'packaging',
    currentStock: 120,
    reorderPoint: 150,
    optimalStock: 500,
    unit: 'units',
    unitCost: 0.25,
    supplier: 'EcoPack Solutions',
    lastRestocked: new Date(Date.now() - 8 * 86400000).toISOString(),
  },
  {
    id: 'inv-05',
    name: 'Fresh Buffalo Mozzarella Campana',
    sku: 'CHE-MOZZ-05',
    category: 'ingredients',
    currentStock: 22,
    reorderPoint: 10,
    optimalStock: 35,
    unit: 'kg',
    unitCost: 14.5,
    supplier: 'Caseificio Bella Dairy',
    lastRestocked: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
  {
    id: 'inv-06',
    name: 'Organic Wild Hibiscus Flowers (Dried)',
    sku: 'DRY-HIB-06',
    category: 'beverages',
    currentStock: 18,
    reorderPoint: 8,
    optimalStock: 25,
    unit: 'kg',
    unitCost: 9.0,
    supplier: 'Pure Botanicals Co.',
    lastRestocked: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
];

export function InventoryView() {
  const { slug } = useTenant();
  const storageKey = `whitraworks_${slug || 'demo'}_inventory`;

  const [items, setItems] = useState<InventoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as InventoryItem[];
    } catch {
      // Fallback
    }
    return DEFAULT_INVENTORY;
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);

  // Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'add' | 'remove' | 'set'>('add');
  const [adjustAmount, setAdjustAmount] = useState<string>('10');
  const [adjustReason, setAdjustReason] = useState<string>('Received new vendor shipment');

  // Add Item Modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({
    name: '',
    sku: '',
    category: 'ingredients' as InventoryItem['category'],
    currentStock: '20',
    reorderPoint: '10',
    optimalStock: '50',
    unit: 'units',
    unitCost: '5.00',
    supplier: '',
  });

  // Reorder Success Toast simulation
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch {
      // Ignore quota
    }
  }, [items, storageKey]);

  // Adjust stock handler
  const handleConfirmAdjust = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;

    const delta = parseFloat(adjustAmount) || 0;
    let newStock = adjustItem.currentStock;

    if (adjustType === 'add') newStock += delta;
    else if (adjustType === 'remove') newStock = Math.max(0, newStock - delta);
    else if (adjustType === 'set') newStock = Math.max(0, delta);

    setItems((prev) =>
      prev.map((item) =>
        item.id === adjustItem.id
          ? {
              ...item,
              currentStock: newStock,
              lastRestocked: adjustType === 'add' ? new Date().toISOString() : item.lastRestocked,
            }
          : item
      )
    );

    setAdjustItem(null);
  };

  // Reorder action (simulated purchase requisition)
  const handleQuickReorder = (item: InventoryItem) => {
    const orderQty = Math.max(item.optimalStock - item.currentStock, 10);
    setToastMessage(
      `PO generated for ${orderQty} ${item.unit} of "${item.name}" dispatched to ${item.supplier}.`
    );
    setTimeout(() => setToastMessage(null), 5000);

    // Boost stock slightly to simulate fulfillment
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id
          ? { ...i, currentStock: i.optimalStock, lastRestocked: new Date().toISOString() }
          : i
      )
    );
  };

  const handleCreateNewItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemForm.name.trim() || !newItemForm.sku.trim()) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now().toString(36)}`,
      name: newItemForm.name.trim(),
      sku: newItemForm.sku.trim(),
      category: newItemForm.category,
      currentStock: parseFloat(newItemForm.currentStock) || 0,
      reorderPoint: parseFloat(newItemForm.reorderPoint) || 0,
      optimalStock: parseFloat(newItemForm.optimalStock) || 0,
      unit: newItemForm.unit.trim() || 'units',
      unitCost: parseFloat(newItemForm.unitCost) || 0,
      supplier: newItemForm.supplier.trim() || 'General Supplier',
      lastRestocked: new Date().toISOString(),
    };

    setItems((prev) => [newItem, ...prev]);
    setIsAddItemOpen(false);
  };

  // Metrics
  const totalValuation = items.reduce((acc, i) => acc + i.currentStock * i.unitCost, 0);
  const lowStockAlerts = items.filter((i) => i.currentStock <= i.reorderPoint).length;
  const totalSkus = items.length;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.supplier.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const matchesAlert = !filterAlertOnly || item.currentStock <= item.reorderPoint;

      return matchesSearch && matchesCategory && matchesAlert;
    });
  }, [items, searchQuery, selectedCategory, filterAlertOnly]);

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="font-bold ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Inventory Valuation
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${totalValuation.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Asset value on premises</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Low Stock Alerts
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{lowStockAlerts}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Items at or below reorder mark</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active SKUs
            </CardTitle>
            <Boxes className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalSkus}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Tracked inventory materials</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Healthy Stock
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {totalSkus > 0 ? Math.round(((totalSkus - lowStockAlerts) / totalSkus) * 100) : 100}%
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Above minimum threshold</p>
          </CardContent>
        </Card>
      </div>

      {/* Control Bar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory items, SKU, or supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant={filterAlertOnly ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => setFilterAlertOnly(!filterAlertOnly)}
                className="text-xs h-8 gap-1"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>{filterAlertOnly ? 'Showing Alerts Only' : 'Filter Low Stock'}</span>
              </Button>

              <Button onClick={() => setIsAddItemOpen(true)} size="sm" className="gap-1.5 shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span>Add SKU Item</span>
              </Button>
            </div>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {[
              { id: 'all', label: 'All Inventory' },
              { id: 'ingredients', label: 'Fresh Ingredients' },
              { id: 'dry_goods', label: 'Dry Goods & Pantry' },
              { id: 'beverages', label: 'Beverage Bar' },
              { id: 'packaging', label: 'Packaging & Supplies' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                  selectedCategory === cat.id
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

      {/* Inventory Table */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Item Name & SKU</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Stock Level & Ratio</th>
                <th className="px-4 py-3">Unit Valuation</th>
                <th className="px-4 py-3">Supplier Source</th>
                <th className="px-4 py-3 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <Boxes className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="font-medium">No inventory items matched criteria</p>
                    <p className="text-xs text-slate-400 mt-1">Adjust search parameters or add a new SKU</p>
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isLow = item.currentStock <= item.reorderPoint;
                  const ratio = Math.min(100, Math.round((item.currentStock / item.optimalStock) * 100));

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                          <span>{item.name}</span>
                          {isLow && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-semibold">
                              Low Stock
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {item.sku}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="capitalize text-xs font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="w-48">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                              {item.currentStock} {item.unit}
                            </span>
                            <span className="text-slate-400">min {item.reorderPoint}</span>
                          </div>
                          {/* Visual progress bar */}
                          <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${
                                isLow
                                  ? 'bg-amber-500'
                                  : ratio > 60
                                  ? 'bg-emerald-500'
                                  : 'bg-indigo-500'
                              }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          ${(item.currentStock * item.unitCost).toFixed(2)}
                        </div>
                        <p className="text-xs text-slate-400">${item.unitCost.toFixed(2)} / {item.unit}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
                          <Building className="w-3 h-3 text-slate-400" />
                          <span>{item.supplier}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isLow && (
                            <Button
                              size="sm"
                              onClick={() => handleQuickReorder(item)}
                              className="text-xs h-7 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                            >
                              <Truck className="w-3 h-3" />
                              <span>Reorder</span>
                            </Button>
                          )}

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setAdjustItem(item);
                              setAdjustType('add');
                              setAdjustAmount('10');
                            }}
                            className="text-xs h-7 gap-1"
                          >
                            <ArrowUpDown className="w-3 h-3" />
                            <span>Adjust</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Adjust Stock Dialog */}
      {adjustItem && (
        <Dialog
          isOpen={!!adjustItem}
          onClose={() => setAdjustItem(null)}
          title={`Adjust Stock: ${adjustItem.name}`}
          description={`Current recorded balance: ${adjustItem.currentStock} ${adjustItem.unit}`}
        >
          <form onSubmit={handleConfirmAdjust} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Adjustment Type
              </label>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`p-2 rounded border font-medium ${
                    adjustType === 'add'
                      ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  + Add Stock
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('remove')}
                  className={`p-2 rounded border font-medium ${
                    adjustType === 'remove'
                      ? 'border-rose-600 bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  - Waste / Deplete
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('set')}
                  className={`p-2 rounded border font-medium ${
                    adjustType === 'set'
                      ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600'
                  }`}
                >
                  = Recount Exact
                </button>
              </div>
            </div>

            <Input
              label={`Quantity (${adjustItem.unit})`}
              type="number"
              step="any"
              min="0"
              value={adjustAmount}
              onChange={(e) => setAdjustAmount(e.target.value)}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Reason / Audit Note
              </label>
              <input
                type="text"
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                placeholder="e.g. Received weekly shipment, Spoilage, Physical recount"
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button type="button" variant="outline" onClick={() => setAdjustItem(null)}>
                Cancel
              </Button>
              <Button type="submit">Confirm Adjustment</Button>
            </div>
          </form>
        </Dialog>
      )}

      {/* Add New SKU Dialog */}
      <Dialog
        isOpen={isAddItemOpen}
        onClose={() => setIsAddItemOpen(false)}
        title="Add Inventory SKU Item"
        description="Track a new ingredient, beverage stock, or packaging material."
      >
        <form onSubmit={handleCreateNewItem} className="space-y-4">
          <Input
            label="Item Description"
            placeholder="e.g. Sourdough Sandwich Loaves"
            value={newItemForm.name}
            onChange={(e) => setNewItemForm({ ...newItemForm, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="SKU / Barcode"
              placeholder="BRD-SOUR-01"
              value={newItemForm.sku}
              onChange={(e) => setNewItemForm({ ...newItemForm, sku: e.target.value })}
              required
            />

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Category
              </label>
              <select
                value={newItemForm.category}
                onChange={(e) =>
                  setNewItemForm({
                    ...newItemForm,
                    category: e.target.value as InventoryItem['category'],
                  })
                }
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ingredients">Fresh Ingredients</option>
                <option value="dry_goods">Dry Goods & Pantry</option>
                <option value="beverages">Beverage Bar</option>
                <option value="packaging">Packaging Supplies</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Input
              label="Opening Stock"
              type="number"
              value={newItemForm.currentStock}
              onChange={(e) => setNewItemForm({ ...newItemForm, currentStock: e.target.value })}
              required
            />
            <Input
              label="Reorder Threshold"
              type="number"
              value={newItemForm.reorderPoint}
              onChange={(e) => setNewItemForm({ ...newItemForm, reorderPoint: e.target.value })}
              required
            />
            <Input
              label="Unit (kg, pcs)"
              value={newItemForm.unit}
              onChange={(e) => setNewItemForm({ ...newItemForm, unit: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Unit Cost (USD)"
              type="number"
              step="0.01"
              value={newItemForm.unitCost}
              onChange={(e) => setNewItemForm({ ...newItemForm, unitCost: e.target.value })}
              required
            />
            <Input
              label="Supplier Company"
              placeholder="e.g. City Bakeries"
              value={newItemForm.supplier}
              onChange={(e) => setNewItemForm({ ...newItemForm, supplier: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsAddItemOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Inventory Item</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
