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
  ShoppingBag,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  DollarSign,
  Flame,
  Truck,
  UtensilsCrossed,
  XCircle,
  Check,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';
export type ServiceType = 'dine_in' | 'takeout' | 'delivery';

export interface OrderItem {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
}

export interface OrderRecord {
  id: string;
  displayId: string;
  customerName: string;
  serviceType: ServiceType;
  tableOrDetails: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_ORDERS: OrderRecord[] = [
  {
    id: 'ord-101',
    displayId: 'ORD-1041',
    customerName: 'Marcus Vance',
    serviceType: 'dine_in',
    tableOrDetails: 'Table 4 (Patio)',
    items: [
      { id: 'i-1', name: 'Artisan Truffle Beef Burger', qty: 2, unitPrice: 18.5 },
      { id: 'i-2', name: 'Truffle & Parmesan Fries', qty: 1, unitPrice: 8.0 },
      { id: 'i-3', name: 'Organic Hibiscus & Mint Iced Tea', qty: 2, unitPrice: 5.5 },
    ],
    totalAmount: 56.0,
    status: 'pending',
    notes: 'No onions on one burger please. Dressing on side.',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
  },
  {
    id: 'ord-102',
    displayId: 'ORD-1040',
    customerName: 'Elena Rostova',
    serviceType: 'dine_in',
    tableOrDetails: 'Table 12 (Main Hall)',
    items: [
      { id: 'i-4', name: 'Margherita Verace Pizza', qty: 1, unitPrice: 16.0 },
      { id: 'i-5', name: 'Crispy Calamari Fritti', qty: 1, unitPrice: 13.5 },
    ],
    totalAmount: 29.5,
    status: 'preparing',
    notes: 'Extra crisp pizza crust requested.',
    createdAt: new Date(Date.now() - 11 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 6 * 60000).toISOString(),
  },
  {
    id: 'ord-103',
    displayId: 'ORD-1039',
    customerName: 'Jordan Lee',
    serviceType: 'takeout',
    tableOrDetails: 'Pickup Station A',
    items: [
      { id: 'i-6', name: 'Artisan Truffle Beef Burger', qty: 1, unitPrice: 18.5 },
      { id: 'i-7', name: 'Belgian Dark Chocolate Fondant', qty: 1, unitPrice: 10.0 },
    ],
    totalAmount: 28.5,
    status: 'ready',
    createdAt: new Date(Date.now() - 22 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 'ord-104',
    displayId: 'ORD-1038',
    customerName: 'Aria Montgomery',
    serviceType: 'delivery',
    tableOrDetails: '742 Evergreen Terrace (Apt 3B)',
    items: [
      { id: 'i-8', name: 'Margherita Verace Pizza', qty: 2, unitPrice: 16.0 },
      { id: 'i-9', name: 'Organic Hibiscus & Mint Iced Tea', qty: 2, unitPrice: 5.5 },
    ],
    totalAmount: 43.0,
    status: 'completed',
    createdAt: new Date(Date.now() - 48 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 15 * 60000).toISOString(),
  },
];

export function OrdersView() {
  const { slug } = useTenant();
  const storageKey = `whitraworks_${slug || 'demo'}_orders`;

  const [orders, setOrders] = useState<OrderRecord[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as OrderRecord[];
    } catch {
      // Fallback
    }
    return DEFAULT_ORDERS;
  });

  const [statusTab, setStatusTab] = useState<OrderStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Order for detail modal
  const [selectedOrder, setSelectedOrder] = useState<OrderRecord | null>(null);

  // New Order Modal
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newOrderCustomer, setNewOrderCustomer] = useState('');
  const [newOrderType, setNewOrderType] = useState<ServiceType>('dine_in');
  const [newOrderDetails, setNewOrderDetails] = useState('Table 1');
  const [newOrderNotes, setNewOrderNotes] = useState('');

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(orders));
    } catch {
      // Ignore quota errors
    }
  }, [orders, storageKey]);

  // Status transition handlers
  const handleTransitionStatus = (orderId: string, newStatus: OrderStatus) => {
    setOrders((prev) =>
      prev.map((ord) =>
        ord.id === orderId
          ? {
              ...ord,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            }
          : ord
      )
    );

    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder((prev) =>
        prev ? { ...prev, status: newStatus, updatedAt: new Date().toISOString() } : null
      );
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCustomer.trim()) return;

    const newDisplayId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    const newRecord: OrderRecord = {
      id: `ord-${Date.now().toString(36)}`,
      displayId: newDisplayId,
      customerName: newOrderCustomer.trim(),
      serviceType: newOrderType,
      tableOrDetails: newOrderDetails.trim() || 'General Dining',
      items: [
        { id: 'i-gen-1', name: 'Chef Special Selection', qty: 1, unitPrice: 24.0 },
        { id: 'i-gen-2', name: 'Craft Sparkling Beverage', qty: 1, unitPrice: 6.0 },
      ],
      totalAmount: 30.0,
      status: 'pending',
      notes: newOrderNotes.trim() || undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setOrders((prev) => [newRecord, ...prev]);
    setIsNewOrderModalOpen(false);
    setNewOrderCustomer('');
    setNewOrderNotes('');
  };

  // Metrics
  const totalVolume = orders.length;
  const activePipelineCount = orders.filter(
    (o) => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready'
  ).length;
  const completedRevenue = orders
    .filter((o) => o.status === 'completed')
    .reduce((acc, curr) => acc + curr.totalAmount, 0);
  const pendingCount = orders.filter((o) => o.status === 'pending').length;

  // Filtered
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchesSearch =
        o.displayId.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        o.tableOrDetails.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTab = statusTab === 'all' || o.status === statusTab;
      return matchesSearch && matchesTab;
    });
  }, [orders, searchQuery, statusTab]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      case 'preparing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800 animate-pulse">
            <Flame className="w-3 h-3 text-indigo-600" /> In Kitchen
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">
            <Check className="w-3 h-3 text-emerald-600" /> Ready for Pickup
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <CheckCircle className="w-3 h-3 text-slate-500" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">
            <XCircle className="w-3 h-3" /> Cancelled
          </span>
        );
    }
  };

  const getServiceTypeIcon = (type: ServiceType) => {
    switch (type) {
      case 'dine_in':
        return (
          <span title="Dine-in">
            <UtensilsCrossed className="w-3.5 h-3.5 text-slate-500" />
          </span>
        );
      case 'takeout':
        return (
          <span title="Takeout">
            <ShoppingBag className="w-3.5 h-3.5 text-blue-500" />
          </span>
        );
      case 'delivery':
        return (
          <span title="Delivery">
            <Truck className="w-3.5 h-3.5 text-emerald-500" />
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active in Pipeline
            </CardTitle>
            <Clock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activePipelineCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Pending, cooking & ready</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Needs Confirmation
            </CardTitle>
            <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Awaiting kitchen dispatch</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Settled Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              ${completedRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">From completed orders</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Order Volume
            </CardTitle>
            <ShoppingBag className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalVolume}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">All session orders recorded</p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Filter Bar */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search orders by #ID, customer name, table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <Button onClick={() => setIsNewOrderModalOpen(true)} size="sm" className="gap-1.5 shrink-0">
              <Plus className="w-3.5 h-3.5" />
              <span>Create Order</span>
            </Button>
          </div>

          {/* Status Pipeline Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(
              [
                { id: 'all', label: 'All Orders', count: orders.length },
                { id: 'pending', label: 'Pending', count: orders.filter((o) => o.status === 'pending').length },
                { id: 'preparing', label: 'Cooking', count: orders.filter((o) => o.status === 'preparing').length },
                { id: 'ready', label: 'Ready', count: orders.filter((o) => o.status === 'ready').length },
                { id: 'completed', label: 'Completed', count: orders.filter((o) => o.status === 'completed').length },
                { id: 'cancelled', label: 'Cancelled', count: orders.filter((o) => o.status === 'cancelled').length },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                  statusTab === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    statusTab === tab.id
                      ? 'bg-indigo-700 text-white'
                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card className="border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase font-medium text-slate-500 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer & Channel</th>
                <th className="px-4 py-3">Items Summary</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 dark:text-slate-400">
                    <ShoppingBag className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                    <p className="font-medium">No orders found in this view</p>
                    <p className="text-xs text-slate-400 mt-1">Change your filters or create a new order</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord) => (
                  <tr
                    key={ord.id}
                    className="hover:bg-slate-50/75 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-slate-900 dark:text-slate-100">
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        className="hover:underline text-indigo-600 dark:text-indigo-400"
                      >
                        {ord.displayId}
                      </button>
                    </td>
                    <td className="px-4 py-3.5">
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          {getServiceTypeIcon(ord.serviceType)}
                          <span>{ord.customerName}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          {ord.tableOrDetails}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-xs text-slate-700 dark:text-slate-300 max-w-xs">
                        {ord.items.map((i) => `${i.qty}x ${i.name}`).join(', ')}
                      </div>
                      {ord.notes && (
                        <p className="text-[11px] text-amber-600 dark:text-amber-400 italic mt-0.5">
                          Note: {ord.notes}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 dark:text-slate-100">
                      ${ord.totalAmount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">{getStatusBadge(ord.status)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {ord.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => handleTransitionStatus(ord.id, 'preparing')}
                            className="text-xs h-7 gap-1 bg-amber-600 hover:bg-amber-700 text-white"
                          >
                            <Flame className="w-3 h-3" />
                            <span>Start Prep</span>
                          </Button>
                        )}

                        {ord.status === 'preparing' && (
                          <Button
                            size="sm"
                            onClick={() => handleTransitionStatus(ord.id, 'ready')}
                            className="text-xs h-7 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                          >
                            <Check className="w-3 h-3" />
                            <span>Mark Ready</span>
                          </Button>
                        )}

                        {ord.status === 'ready' && (
                          <Button
                            size="sm"
                            onClick={() => handleTransitionStatus(ord.id, 'completed')}
                            className="text-xs h-7 gap-1"
                          >
                            <CheckCircle className="w-3 h-3" />
                            <span>Complete</span>
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedOrder(ord)}
                          className="h-7 px-2 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        >
                          View
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

      {/* Order Detail Modal */}
      {selectedOrder && (
        <Dialog
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          title={`Order ${selectedOrder.displayId}`}
          description={`Placed ${new Date(selectedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • ${selectedOrder.customerName}`}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Channel</span>
                <p className="text-sm font-semibold capitalize mt-0.5 flex items-center gap-1.5">
                  {getServiceTypeIcon(selectedOrder.serviceType)}
                  {selectedOrder.serviceType.replace('_', ' ')}: {selectedOrder.tableOrDetails}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Status</span>
                <div className="mt-0.5">{getStatusBadge(selectedOrder.status)}</div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Itemized Breakdown</h4>
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg border-slate-200 dark:border-slate-800 overflow-hidden">
                {selectedOrder.items.map((item) => (
                  <div key={item.id} className="p-2.5 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-semibold text-slate-900 dark:text-slate-100 mr-2">
                        {item.qty}x
                      </span>
                      <span>{item.name}</span>
                    </div>
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      ${(item.qty * item.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between font-bold text-base">
                  <span>Grand Total</span>
                  <span className="text-indigo-600 dark:text-indigo-400">
                    ${selectedOrder.totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-300">
                <span className="font-semibold block mb-0.5">Kitchen Special Instructions:</span>
                {selectedOrder.notes}
              </div>
            )}

            {/* Quick Transition Action in Modal */}
            <div className="pt-2 flex justify-between items-center border-t border-slate-100 dark:border-slate-800">
              {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'completed' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTransitionStatus(selectedOrder.id, 'cancelled')}
                  className="text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                >
                  Cancel Order
                </Button>
              )}
              <div className="ml-auto flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
                {selectedOrder.status === 'pending' && (
                  <Button
                    size="sm"
                    onClick={() => handleTransitionStatus(selectedOrder.id, 'preparing')}
                  >
                    Send to Kitchen
                  </Button>
                )}
                {selectedOrder.status === 'preparing' && (
                  <Button
                    size="sm"
                    onClick={() => handleTransitionStatus(selectedOrder.id, 'ready')}
                  >
                    Mark Ready
                  </Button>
                )}
                {selectedOrder.status === 'ready' && (
                  <Button
                    size="sm"
                    onClick={() => handleTransitionStatus(selectedOrder.id, 'completed')}
                  >
                    Complete Order
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Dialog>
      )}

      {/* Create Order Modal */}
      <Dialog
        isOpen={isNewOrderModalOpen}
        onClose={() => setIsNewOrderModalOpen(false)}
        title="Create New Order"
        description="Enter customer details and dining channel to dispatch ticket to kitchen."
      >
        <form onSubmit={handleCreateOrder} className="space-y-4">
          <Input
            label="Customer Name"
            placeholder="e.g. Sarah Jenkins"
            value={newOrderCustomer}
            onChange={(e) => setNewOrderCustomer(e.target.value)}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Channel / Type
              </label>
              <select
                value={newOrderType}
                onChange={(e) => setNewOrderType(e.target.value as ServiceType)}
                className="w-full text-sm px-3 py-2 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="dine_in">Dine-in</option>
                <option value="takeout">Takeout / Pickup</option>
                <option value="delivery">Delivery</option>
              </select>
            </div>

            <Input
              label="Table # / Destination"
              placeholder="e.g. Table 6 or Pickup counter"
              value={newOrderDetails}
              onChange={(e) => setNewOrderDetails(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Order Notes & Kitchen Requests
            </label>
            <textarea
              rows={2}
              placeholder="Dietary requests or table instructions..."
              value={newOrderNotes}
              onChange={(e) => setNewOrderNotes(e.target.value)}
              className="w-full text-sm p-2.5 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="button" variant="outline" onClick={() => setIsNewOrderModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Place Order & Dispatch</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
