import React from 'react';

export const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = 'teal' }) => {
  const colorMap = {
    teal: 'from-teal-500/10 to-teal-500/5 text-teal-400 border-teal-500/20',
    emerald: 'from-emerald-500/10 to-emerald-500/5 text-emerald-400 border-emerald-500/20',
    rose: 'from-rose-500/10 to-rose-500/5 text-rose-400 border-rose-500/20',
    purple: 'from-purple-500/10 to-purple-500/5 text-purple-400 border-purple-500/20',
    blue: 'from-blue-500/10 to-blue-500/5 text-blue-400 border-blue-500/20',
    amber: 'from-amber-500/10 to-amber-500/5 text-amber-400 border-amber-500/20',
  };

  const selectedColor = colorMap[color] || colorMap.teal;

  return (
    <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-br ${selectedColor} border backdrop-blur-md transition-all duration-200 hover:scale-[1.01]`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{title}</span>
        {Icon && (
          <div className="p-2 rounded-xl bg-slate-900/60 border border-slate-800">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-white font-outfit">
          {value}
        </span>
        {trend && (
          <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            {trend}
          </span>
        )}
      </div>

      {subtitle && <p className="mt-1 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
};

export default StatCard;
