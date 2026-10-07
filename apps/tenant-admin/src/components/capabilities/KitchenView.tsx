import { useState, useEffect, useMemo } from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
} from '@whitraworks/ui';
import {
  ChefHat,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Volume2,
  Check,
  RotateCcw,
} from 'lucide-react';
import { useTenant } from '../../context/TenantContext';

export interface KitchenItem {
  id: string;
  name: string;
  qty: number;
  station: 'grill' | 'fryer' | 'pizza' | 'assembly' | 'bar';
  prepared: boolean;
  notes?: string;
}

export interface KitchenTicket {
  id: string;
  ticketNumber: number;
  orderDisplayId: string;
  channel: 'Dine-In' | 'Takeout' | 'Delivery';
  tableOrDest: string;
  items: KitchenItem[];
  priority: 'normal' | 'rush' | 'allergy';
  alertNote?: string;
  createdAt: number; // timestamp ms
  completedAt?: number;
  isBumped: boolean;
}

const DEFAULT_TICKETS: KitchenTicket[] = [
  {
    id: 'kds-01',
    ticketNumber: 41,
    orderDisplayId: 'ORD-1041',
    channel: 'Dine-In',
    tableOrDest: 'Table 4',
    priority: 'allergy',
    alertNote: 'NO ONIONS (Allergy Warning) - Dressing on side',
    createdAt: Date.now() - 12 * 60000, // 12 mins ago
    isBumped: false,
    items: [
      { id: 'ki-1', name: 'Artisan Truffle Beef Burger', qty: 2, station: 'grill', prepared: false },
      { id: 'ki-2', name: 'Truffle & Parmesan Fries', qty: 1, station: 'fryer', prepared: true },
      { id: 'ki-3', name: 'Organic Hibiscus & Mint Iced Tea', qty: 2, station: 'bar', prepared: true },
    ],
  },
  {
    id: 'kds-02',
    ticketNumber: 42,
    orderDisplayId: 'ORD-1040',
    channel: 'Dine-In',
    tableOrDest: 'Table 12',
    priority: 'normal',
    createdAt: Date.now() - 6 * 60000, // 6 mins ago
    isBumped: false,
    items: [
      { id: 'ki-4', name: 'Margherita Verace Pizza', qty: 1, station: 'pizza', prepared: false, notes: 'Extra crispy crust' },
      { id: 'ki-5', name: 'Crispy Calamari Fritti', qty: 1, station: 'fryer', prepared: false },
    ],
  },
  {
    id: 'kds-03',
    ticketNumber: 43,
    orderDisplayId: 'ORD-1042',
    channel: 'Takeout',
    tableOrDest: 'Pickup #3',
    priority: 'rush',
    alertNote: 'RUSH: Customer waiting at expo counter',
    createdAt: Date.now() - 17 * 60000, // 17 mins ago (Urgent)
    isBumped: false,
    items: [
      { id: 'ki-6', name: 'Artisan Truffle Beef Burger', qty: 1, station: 'grill', prepared: true },
      { id: 'ki-7', name: 'Belgian Dark Chocolate Fondant', qty: 1, station: 'assembly', prepared: false },
    ],
  },
];

const STATIONS = [
  { id: 'all', label: 'All Stations' },
  { id: 'grill', label: 'Grill Station' },
  { id: 'fryer', label: 'Fryer Station' },
  { id: 'pizza', label: 'Pizza & Oven' },
  { id: 'assembly', label: 'Assembly & Cold' },
  { id: 'bar', label: 'Beverage & Bar' },
];

export function KitchenView() {
  const { slug } = useTenant();
  const storageKey = `whitraworks_${slug || 'demo'}_kds_tickets`;

  const [tickets, setTickets] = useState<KitchenTicket[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) return JSON.parse(stored) as KitchenTicket[];
    } catch {
      // Fallback
    }
    return DEFAULT_TICKETS;
  });

  const [selectedStation, setSelectedStation] = useState('all');
  const [showBumped, setShowBumped] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [bellRung, setBellRung] = useState(false);

  // Update clock every 10 seconds for real-time ticket aging
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(tickets));
    } catch {
      // Ignore quota error
    }
  }, [tickets, storageKey]);

  // Audio simulation ping
  const handleRingBell = () => {
    setBellRung(true);
    setTimeout(() => setBellRung(false), 2000);
  };

  // Toggle item prepared status
  const handleToggleItemPrepared = (ticketId: string, itemId: string) => {
    setTickets((prev) =>
      prev.map((t) => {
        if (t.id !== ticketId) return t;
        return {
          ...t,
          items: t.items.map((i) => (i.id === itemId ? { ...i, prepared: !i.prepared } : i)),
        };
      })
    );
  };

  // Bump ticket (mark done and off the rail)
  const handleBumpTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              isBumped: true,
              completedAt: Date.now(),
              items: t.items.map((i) => ({ ...i, prepared: true })),
            }
          : t
      )
    );
  };

  // Recall bumped ticket
  const handleRecallTicket = (ticketId: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, isBumped: false, completedAt: undefined } : t))
    );
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((ticket) => {
      if (!showBumped && ticket.isBumped) return false;
      if (showBumped && !ticket.isBumped) return false;

      if (selectedStation !== 'all') {
        const hasStationItem = ticket.items.some((i) => i.station === selectedStation);
        if (!hasStationItem) return false;
      }

      return true;
    });
  }, [tickets, showBumped, selectedStation]);

  // Metrics
  const activeTickets = tickets.filter((t) => !t.isBumped);
  const activeCount = activeTickets.length;
  const urgentCount = activeTickets.filter((t) => (now - t.createdAt) / 60000 > 15).length;
  const totalItemsInQueue = activeTickets.reduce(
    (acc, t) => acc + t.items.filter((i) => !i.prepared).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* KDS Header & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Active Rail Tickets
            </CardTitle>
            <ChefHat className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{activeCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Live orders on KDS rail</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Urgent / Late Tickets
            </CardTitle>
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{urgentCount}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">&gt; 15 mins elapsed time</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Items to Prepare
            </CardTitle>
            <Flame className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{totalItemsInQueue}</div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Individual items uncompleted</p>
          </CardContent>
        </Card>

        <Card className="border-slate-200 dark:border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Expo Bell Action
            </CardTitle>
            <Volume2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <Button
              onClick={handleRingBell}
              variant="outline"
              size="sm"
              className={`w-full text-xs h-8 gap-1.5 transition-all ${
                bellRung ? 'bg-amber-100 text-amber-900 border-amber-400 animate-bounce' : ''
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>{bellRung ? '🔔 Order Ready Ding!' : 'Ring Expediter Bell'}</span>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Stations Controls */}
      <Card className="border-slate-200 dark:border-slate-800">
        <CardContent className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {STATIONS.map((station) => (
              <button
                key={station.id}
                onClick={() => setSelectedStation(station.id)}
                className={`px-3 py-1.5 rounded-full font-medium transition-colors shrink-0 ${
                  selectedStation === station.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {station.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant={showBumped ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => setShowBumped(!showBumped)}
              className="text-xs h-8 gap-1.5"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{showBumped ? 'Showing Completed' : 'View Bumped / History'}</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Ticket Grid Rail */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredTickets.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
            <ChefHat className="w-8 h-8 mx-auto mb-2 text-slate-400" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              {showBumped ? 'No recently bumped tickets' : 'Kitchen rail is completely clear!'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              New orders submitted from POS or checkout appear here automatically.
            </p>
          </div>
        ) : (
          filteredTickets.map((ticket) => {
            const elapsedMins = Math.floor((now - ticket.createdAt) / 60000);
            const isUrgent = elapsedMins >= 15;
            const isWarning = elapsedMins >= 8 && elapsedMins < 15;

            return (
              <div
                key={ticket.id}
                className={`rounded-xl border transition-all flex flex-col justify-between overflow-hidden shadow-sm ${
                  ticket.isBumped
                    ? 'border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-900/40 opacity-75'
                    : isUrgent
                    ? 'border-rose-300 dark:border-rose-900/80 bg-white dark:bg-slate-900 ring-2 ring-rose-500/20'
                    : isWarning
                    ? 'border-amber-300 dark:border-amber-900/80 bg-white dark:bg-slate-900'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                }`}
              >
                {/* Ticket Top Banner */}
                <div
                  className={`px-4 py-2.5 flex items-center justify-between border-b ${
                    ticket.isBumped
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      : isUrgent
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                      : isWarning
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 border-amber-200 dark:border-amber-800'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-base">#{ticket.ticketNumber}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/80 dark:bg-black/30 border border-current">
                      {ticket.channel} • {ticket.tableOrDest}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 font-mono text-xs font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{elapsedMins}m</span>
                  </div>
                </div>

                {/* Priority / Allergen Warning */}
                {ticket.alertNote && (
                  <div className="px-4 py-2 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300 flex items-center gap-1.5 font-medium">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{ticket.alertNote}</span>
                  </div>
                )}

                {/* Items Checklist */}
                <div className="p-4 space-y-2 flex-1">
                  <div className="text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">
                    Items & Station Checklist
                  </div>
                  <div className="space-y-1.5">
                    {ticket.items.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => !ticket.isBumped && handleToggleItemPrepared(ticket.id, item.id)}
                        className={`p-2 rounded-lg border text-sm flex items-start justify-between cursor-pointer transition-colors ${
                          item.prepared
                            ? 'bg-emerald-50/70 border-emerald-200 text-slate-400 line-through dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-slate-500'
                            : 'bg-slate-50/70 border-slate-200 text-slate-900 hover:bg-slate-100 dark:bg-slate-800/40 dark:border-slate-800 dark:text-slate-100'
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className={`w-4 h-4 mt-0.5 rounded flex items-center justify-center border text-[10px] ${
                              item.prepared
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : 'border-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {item.prepared && <Check className="w-3 h-3 stroke-[3]" />}
                          </span>
                          <div>
                            <span className="font-bold mr-1.5">{item.qty}x</span>
                            <span>{item.name}</span>
                            {item.notes && (
                              <p className="text-[11px] text-amber-600 dark:text-amber-400 font-normal no-underline mt-0.5">
                                • {item.notes}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 shrink-0 ml-2">
                          {item.station}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bottom Ticket Bump Action */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{ticket.orderDisplayId}</span>

                  {ticket.isBumped ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRecallTicket(ticket.id)}
                      className="text-xs h-7 gap-1"
                    >
                      <RotateCcw className="w-3 h-3" /> Recall to Rail
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleBumpTicket(ticket.id)}
                      className="text-xs h-8 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Bump & Mark Ready</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
