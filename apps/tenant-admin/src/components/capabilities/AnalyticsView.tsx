import { Card, CardHeader, CardTitle, CardContent } from '@whitraworks/ui';
import {
  BarChart3,
  Users,
  DollarSign,
  ArrowUpRight,
  Clock,
} from 'lucide-react';

export function AnalyticsView() {

  const topItems = [
    { name: 'Artisan Truffle Beef Burger', count: 142, revenue: 2627.0 },
    { name: 'Margherita Verace Pizza', count: 118, revenue: 1888.0 },
    { name: 'Crispy Calamari Fritti', count: 85, revenue: 1147.5 },
    { name: 'Organic Hibiscus & Mint Iced Tea', count: 196, revenue: 1078.0 },
    { name: 'Belgian Dark Chocolate Fondant', count: 64, revenue: 640.0 },
  ];

  const hourlyBreakdown = [
    { hour: '11:00 AM', volume: 14 },
    { hour: '12:00 PM', volume: 42 },
    { hour: '1:00 PM', volume: 58 },
    { hour: '2:00 PM', volume: 30 },
    { hour: '5:00 PM', volume: 24 },
    { hour: '6:00 PM', volume: 68 },
    { hour: '7:00 PM', volume: 84 },
    { hour: '8:00 PM', volume: 52 },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Weekly Revenue
            </CardTitle>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$14,892.50</div>
            <p className="text-xs text-emerald-600 flex items-center gap-0.5 mt-1 font-medium">
              <ArrowUpRight className="w-3.5 h-3.5" /> +18.4% vs last week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Order Volume
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">542 Orders</div>
            <p className="text-xs text-slate-500 mt-1">Average ticket: $27.48</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Average Prep Velocity
            </CardTitle>
            <Clock className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">11.8 Mins</div>
            <p className="text-xs text-emerald-600 mt-1">Kitchen target &lt; 15 mins</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Customer Retention
            </CardTitle>
            <Users className="w-4 h-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">64.2%</div>
            <p className="text-xs text-slate-500 mt-1">Repeat diners (30-day window)</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top items */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Top Performing Menu Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topItems.map((item, i) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-slate-400 w-4">#{i + 1}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold">${item.revenue.toFixed(2)}</span>
                    <span className="text-xs text-slate-400 ml-2">({item.count} sold)</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Hourly Volume */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Peak Demand By Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hourlyBreakdown.map((slot) => {
                const pct = Math.round((slot.volume / 84) * 100);
                return (
                  <div key={slot.hour} className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span>{slot.hour}</span>
                      <span className="font-semibold">{slot.volume} tickets</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-600 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
