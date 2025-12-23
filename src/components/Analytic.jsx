import React from 'react';
import { TrendingUp, ShoppingBag, CreditCard, Award, Calendar, DollarSign, PieChart } from 'lucide-react';

export const AnalyticsDashboard = ({ orders, role, myVendorName }) => {
  
  const calculateStats = () => {
    // Global / Lifetime Stats
    let totalRevenue = 0;
    let totalOrders = 0;
    let itemsSold = 0;
    
    // Daily Stats (Today)
    let dailyRevenue = 0;
    let dailyOrders = 0;
    
    // Performance Tracking
    const vendorLifetime = {}; // Lifetime sales per vendor
    const vendorDaily = {};    // Today's sales per vendor
    
    const todayString = new Date().toLocaleDateString(); 

    // Filter valid orders (Paid money only)
    const validOrders = orders.filter(o => 
        ['confirmed', 'picked_up', 'delivered'].includes(o.status)
    );

    validOrders.forEach(order => {
      let orderRevenue = 0;
      let orderIsToday = new Date(order.createdAt).toLocaleDateString() === todayString;
      let orderInScope = false; // Is this order relevant to the current viewer?

      order.items.forEach(item => {
        // Filter logic: Super Admin sees ALL. Vendor sees ONLY theirs.
        if (role === 'super' || item.vendor === myVendorName) {
          const price = item.price;
          
          // Add to Order Total
          orderRevenue += price;
          itemsSold++;
          orderInScope = true;

          // Vendor Tracking (Super Admin needs this)
          if (!vendorLifetime[item.vendor]) vendorLifetime[item.vendor] = 0;
          vendorLifetime[item.vendor] += price;

          if (orderIsToday) {
             if (!vendorDaily[item.vendor]) vendorDaily[item.vendor] = 0;
             vendorDaily[item.vendor] += price;
          }
        }
      });

      if (orderInScope) {
        totalRevenue += orderRevenue;
        totalOrders++;

        if (orderIsToday) {
            dailyRevenue += orderRevenue;
            dailyOrders++;
        }
      }
    });

    // Calculate Top Vendor
    let topVendor = '-';
    let maxSales = 0;
    Object.entries(vendorLifetime).forEach(([v, amount]) => {
        if(amount > maxSales) { maxSales = amount; topVendor = v; }
    });

    return { 
        totalRevenue, totalOrders, itemsSold, 
        dailyRevenue, dailyOrders,
        vendorLifetime, vendorDaily, topVendor 
    };
  };

  const stats = calculateStats();

  return (
    <div className="space-y-6 animate-fade-in p-4">
      
      {/* 1. DAILY SALES CARD (The "Cash in Hand" Card) */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 rounded-3xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10"><DollarSign className="w-24 h-24" /></div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 opacity-90">
                <Calendar className="w-5 h-5" />
                <span className="text-xs font-bold uppercase tracking-wider">Today's Revenue</span>
            </div>
            <p className="text-4xl font-black">₦{stats.dailyRevenue.toLocaleString()}</p>
            <p className="text-sm opacity-80 mt-1">{stats.dailyOrders} orders processed today</p>
          </div>
      </div>

      {/* 2. SUPER ADMIN: DAILY PAYOUT BREAKDOWN (The "Balancing" Table) */}
      {role === 'super' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-blue-100 dark:border-blue-900 shadow-sm overflow-hidden">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/30 border-b border-blue-100 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                    <PieChart className="w-5 h-5" />
                    <h3 className="font-bold text-sm uppercase tracking-wide">Today's Payouts</h3>
                </div>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Amount due to each vendor for today's sales.</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(stats.vendorDaily).length === 0 ? (
                    <p className="p-4 text-center text-gray-400 text-xs">No sales yet today.</p>
                ) : (
                    Object.entries(stats.vendorDaily).map(([vName, amount]) => (
                        <div key={vName} className="flex justify-between items-center p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                            <span className="font-medium text-gray-700 dark:text-gray-200">{vName}</span>
                            <span className="font-bold text-green-600 dark:text-green-400">₦{amount.toLocaleString()}</span>
                        </div>
                    ))
                )}
            </div>
            {/* Total Check */}
            <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 flex justify-between">
                <span className="text-xs font-bold text-gray-500 uppercase">Total to Settle</span>
                <span className="font-black text-gray-900 dark:text-white">₦{stats.dailyRevenue.toLocaleString()}</span>
            </div>
        </div>
      )}

      {/* 3. LIFETIME STATS (The "Big Picture") */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-2xl border border-green-100 dark:border-green-800">
            <div className="flex items-center gap-2 mb-2 text-green-600 dark:text-green-400">
                <CreditCard className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Lifetime Sales</span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white">₦{stats.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
            <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                <ShoppingBag className="w-5 h-5" />
                <span className="text-[10px] font-bold uppercase">Total Orders</span>
            </div>
            <p className="text-xl font-black text-gray-900 dark:text-white">{stats.totalOrders}</p>
        </div>
      </div>
      
      {/* 4. SUPER ADMIN: LIFETIME PERFORMANCE */}
      {role === 'super' && (
        <div className="mt-8">
            <div className="flex justify-between items-center mb-3 px-1">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lifetime Leaderboard</h4>
                <div className="flex items-center gap-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                    <Award className="w-3 h-3" /> Top: {stats.topVendor}
                </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden divide-y divide-gray-100 dark:divide-gray-700">
                {Object.entries(stats.vendorLifetime).map(([vName, amount]) => (
                    <div key={vName} className="flex justify-between items-center p-3">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{vName}</span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white">₦{amount.toLocaleString()}</span>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
};