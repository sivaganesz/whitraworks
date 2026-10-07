import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Badge,
} from '@whitraworks/ui';
import {
  Truck,
  MapPin,
  CheckCircle,
  Navigation,
} from 'lucide-react';

interface DeliveryDispatch {
  id: string;
  orderId: string;
  customerName: string;
  address: string;
  driverName: string;
  driverPhone: string;
  status: 'assigned' | 'in_transit' | 'delivered';
  etaMins: number;
  fee: number;
}

const DEFAULT_DISPATCHES: DeliveryDispatch[] = [
  {
    id: 'del-01',
    orderId: 'ORD-1038',
    customerName: 'Aria Montgomery',
    address: '742 Evergreen Terrace (Apt 3B)',
    driverName: 'Carlos Rivera',
    driverPhone: '+1 (555) 392-1084',
    status: 'in_transit',
    etaMins: 8,
    fee: 4.5,
  },
  {
    id: 'del-02',
    orderId: 'ORD-1044',
    customerName: 'Michael Chang',
    address: '1204 Pine Street, Suite 200',
    driverName: 'Carlos Rivera',
    driverPhone: '+1 (555) 392-1084',
    status: 'assigned',
    etaMins: 22,
    fee: 5.0,
  },
  {
    id: 'del-03',
    orderId: 'ORD-1032',
    customerName: 'Sophie Bennett',
    address: '88 Ocean Boulevard',
    driverName: 'Devon Miles',
    driverPhone: '+1 (555) 819-4402',
    status: 'delivered',
    etaMins: 0,
    fee: 6.0,
  },
];

export function DeliveryView() {
  const [dispatches, setDispatches] = useState<DeliveryDispatch[]>(DEFAULT_DISPATCHES);

  const handleUpdateStatus = (id: string, newStatus: DeliveryDispatch['status']) => {
    setDispatches((prev) =>
      prev.map((d) => (d.id === id ? { ...d, status: newStatus } : d))
    );
  };

  const activeDeliveries = dispatches.filter((d) => d.status !== 'delivered');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Active Couriers
            </CardTitle>
            <Truck className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2 Drivers Online</div>
            <p className="text-xs text-slate-500 mt-1">Zone coverage active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Out in Transit
            </CardTitle>
            <Navigation className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeDeliveries.length} Packages</div>
            <p className="text-xs text-slate-500 mt-1">Average delivery time: 18m</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Fulfillment Rate
            </CardTitle>
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">98.4%</div>
            <p className="text-xs text-slate-500 mt-1">On-time delivery window</p>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Live Delivery Dispatch Rail</h3>
          <p className="text-xs text-slate-500">Real-time driver assignment and fulfillment tracking.</p>
        </div>
        <div className="divide-y divide-slate-200 dark:divide-slate-800">
          {dispatches.map((del) => (
            <div key={del.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600">{del.orderId}</span>
                  <span className="font-semibold text-sm">{del.customerName}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      del.status === 'in_transit'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : del.status === 'assigned'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {del.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{del.address}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  <span>Courier: <strong className="text-slate-700 dark:text-slate-300">{del.driverName}</strong></span>
                  <span>{del.driverPhone}</span>
                  {del.status !== 'delivered' && <span>ETA: ~{del.etaMins} mins</span>}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {del.status === 'assigned' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(del.id, 'in_transit')}
                    className="text-xs h-7"
                  >
                    Dispatch Driver
                  </Button>
                )}
                {del.status === 'in_transit' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(del.id, 'delivered')}
                    className="text-xs h-7 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Confirm Delivery
                  </Button>
                )}
                {del.status === 'delivered' && (
                  <Badge variant="active" className="text-xs">
                    Completed
                  </Badge>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
