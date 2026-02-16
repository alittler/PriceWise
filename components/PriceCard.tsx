
import React, { useState } from 'react';
import { GroceryItem, GlobalComparisonUnit, UnitCategory } from '../types';
import { getNormalizedData, getDisplayRate } from '../utils/unitConverter';

interface PriceCardProps {
  item: GroceryItem;
  isBestValue: boolean;
  scale: GlobalComparisonUnit;
  onRemove: (id: string) => void;
  onUpdate: (id: string, updates: Partial<GroceryItem>) => void;
  onToggleScale: () => void;
  percentageDiff?: number;
}

export const PriceCard: React.FC<PriceCardProps> = ({ item, isBestValue, scale, onRemove, onUpdate, onToggleScale, percentageDiff }) => {
  const [isEditing, setIsEditing] = useState(item.status === 'error');
  const [showBrand, setShowBrand] = useState(false);

  const handleManualSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = (formData.get('name') as string).toUpperCase();
    const brand = (formData.get('brand') as string).toUpperCase();
    const price = parseFloat(formData.get('price') as string);
    const qty = parseFloat(formData.get('quantity') as string);
    const unit = (formData.get('unit') as string).toUpperCase();

    if (name && !isNaN(price) && !isNaN(qty) && unit) {
      const norm = getNormalizedData(price, qty, unit);
      onUpdate(item.id, {
        name,
        brand,
        price,
        quantity: qty,
        unit,
        category: norm.category,
        normalizedRates: norm.rates,
        status: 'complete',
        errorReason: undefined
      });
      setIsEditing(false);
    }
  };

  const getUnitIcon = (category?: UnitCategory, unit?: string) => {
    const u = unit?.toUpperCase();
    if (category === 'weight') {
      if (u === 'G') return 'fa-balance-scale-left';
      if (u === 'KG') return 'fa-weight-hanging';
      return 'fa-balance-scale';
    }
    if (category === 'volume') {
      if (u === 'ML') return 'fa-vial';
      if (u === 'L') return 'fa-bottle-water';
      return 'fa-droplet';
    }
    return 'fa-box-open';
  };

  if (item.status === 'analyzing') {
    return (
      <div className="w-full aspect-square bg-zinc-900 rounded-3xl flex flex-col items-center justify-center border border-zinc-800 animate-pulse">
        <i className="fas fa-spinner fa-spin text-3xl mb-4 text-zinc-700"></i>
        <p className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">ANALYZING SCAN...</p>
      </div>
    );
  }

  if (isEditing || item.status === 'error') {
    return (
      <div className="bg-white text-black p-6 rounded-[2rem] shadow-2xl relative border-4 border-red-500/10">
        {item.status === 'error' && !isEditing && (
           <div className="mb-6 bg-red-50 p-4 rounded-2xl border border-red-100">
             <div className="flex items-center gap-3 mb-2 text-red-600">
               <i className="fas fa-exclamation-triangle"></i>
               <h4 className="text-xs font-black tracking-widest uppercase">SCAN FAILED</h4>
             </div>
             <p className="text-xs font-bold text-red-900/60 mb-3">{item.errorReason || 'Unreadable price tag.'}</p>
             <div className="space-y-1">
               <span className="text-[9px] font-black text-red-400 uppercase tracking-widest">TIPS FOR A BETTER SCAN:</span>
               <ul className="text-[10px] text-red-900/50 font-medium list-disc list-inside">
                 <li>Ensure the tag is well-lit</li>
                 <li>Hold the camera steady (no blur)</li>
                 <li>Center the price and unit clearly</li>
                 <li>Avoid strong glares on the surface</li>
               </ul>
             </div>
           </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-xs font-black tracking-widest uppercase">
            {item.status === 'error' ? 'REPAIR SCAN DATA' : 'EDIT PRODUCT'}
          </h4>
          <button onClick={() => item.status === 'complete' ? setIsEditing(false) : onRemove(item.id)} className="text-zinc-400 p-2">
            <i className="fas fa-times"></i>
          </button>
        </div>
        <form onSubmit={handleManualSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Product Name</label>
              <input name="name" defaultValue={item.name} placeholder="E.G. MILK" className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-2xl text-lg font-black outline-none focus:border-indigo-600 uppercase" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Brand</label>
              <input name="brand" defaultValue={item.brand} placeholder="E.G. NESTLE" className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-2xl text-lg font-black outline-none focus:border-indigo-600 uppercase" />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Price ($)</label>
              <input name="price" type="number" step="0.01" defaultValue={item.price} placeholder="0.00" className="w-full bg-zinc-50 border-2 border-zinc-200 p-4 rounded-2xl text-lg font-black outline-none focus:border-indigo-600" required />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest ml-1">Quantity & Unit</label>
              <div className="flex gap-2">
                <input name="quantity" type="number" step="0.01" defaultValue={item.quantity} placeholder="1" className="w-2/3 bg-zinc-50 border-2 border-zinc-200 p-4 rounded-2xl text-lg font-black outline-none focus:border-indigo-600" required />
                <input name="unit" defaultValue={item.unit} placeholder="G" className="w-1/3 bg-zinc-50 border-2 border-zinc-200 p-4 rounded-2xl text-base font-black outline-none focus:border-indigo-600 uppercase text-center" required />
              </div>
            </div>
          </div>
          
          <button type="submit" className="w-full bg-indigo-600 text-white p-5 rounded-2xl text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 active:scale-95 transition-all">
            {item.status === 'error' ? 'FINALIZE REPAIR' : 'SAVE CHANGES'}
          </button>
        </form>
      </div>
    );
  }

  const displayData = item.normalizedRates ? getDisplayRate(item.normalizedRates, scale, item.category!) : null;
  const currentRate = displayData?.rate;
  const displayLabel = displayData?.label;

  return (
    <div className={`group relative w-full rounded-[2.5rem] overflow-hidden border-4 transition-all duration-300 ${
      isBestValue ? 'border-green-500 shadow-[0_0_30px_rgba(34,197,94,0.3)] scale-[1.01]' : 'border-zinc-800'
    }`}>
      {/* Percentage Badge */}
      {!isBestValue && percentageDiff !== undefined && (
        <div className="absolute top-6 right-6 z-20 bg-red-600 text-white px-3 py-1.5 rounded-full text-[10px] font-black shadow-lg">
          +{percentageDiff.toFixed(0)}%
        </div>
      )}
      
      {/* Best Value Badge */}
      {isBestValue && (
        <div className="absolute top-6 right-6 z-20 bg-green-500 text-white px-4 py-2 rounded-full text-[10px] font-black tracking-widest shadow-lg">
          BEST DEAL
        </div>
      )}

      {/* Main Large Image */}
      <div className="relative aspect-[4/3] bg-zinc-900 overflow-hidden">
        <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
        
        {/* Overlay with info */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent flex flex-col justify-end p-6">
          <div className="flex justify-between items-end">
            <div className="space-y-1 min-w-0 flex-grow">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowBrand(!showBrand)}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-[8px] font-black text-white px-1.5 py-0.5 rounded uppercase tracking-widest border border-white/10 transition-colors"
                >
                  {showBrand ? 'SHOW NAME' : 'SHOW BRAND'}
                </button>
              </div>
              <h3 className="text-2xl font-black uppercase tracking-tighter leading-tight truncate">
                {showBrand ? (item.brand || 'NO BRAND') : (item.name || 'PRODUCT')}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-indigo-400 font-black text-lg">${item.price?.toFixed(2)}</span>
                <span className="text-zinc-500 font-bold text-xs uppercase flex items-center gap-1.5">
                  FOR {item.quantity}{item.unit?.toUpperCase()}
                  <i className={`fas ${getUnitIcon(item.category, item.unit)} text-[10px] opacity-60`}></i>
                </span>
              </div>
            </div>
            
            <div className="flex gap-2 mb-1 flex-shrink-0">
              <button onClick={() => setIsEditing(true)} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10 hover:bg-white/20 transition-colors">
                <i className="fas fa-pen text-xs"></i>
              </button>
              <button onClick={() => onRemove(item.id)} className="w-10 h-10 rounded-full bg-red-600/20 backdrop-blur-md flex items-center justify-center text-red-500 border border-red-500/20 hover:bg-red-600/40 transition-colors">
                <i className="fas fa-trash text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer / Unit Comparison */}
      <div className="bg-zinc-900 p-6 flex items-center justify-between border-t border-zinc-800">
        <button 
          onClick={onToggleScale}
          className={`flex items-center gap-4 px-5 py-3 rounded-2xl transition-all active:scale-95 flex-grow mr-4 ${
            isBestValue ? 'bg-green-500 text-white shadow-xl' : 'bg-zinc-800 text-zinc-300'
          }`}
        >
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-black uppercase opacity-60 tracking-widest flex items-center gap-1.5">
              <i className={`fas ${getUnitIcon(item.category, displayLabel)} text-[8px]`}></i>
              NORMALIZED PRICE
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black">${currentRate?.toFixed(3)}</span>
              <span className="text-xs font-bold uppercase flex items-center gap-1.5">
                PER {displayLabel}
                <i className={`fas ${getUnitIcon(item.category, displayLabel)} text-[10px] opacity-40`}></i>
              </span>
            </div>
          </div>
          <i className="fas fa-sync-alt text-[10px] opacity-40 ml-auto"></i>
        </button>

        {isBestValue && (
          <div className="animate-bounce flex-shrink-0">
            <i className="fas fa-crown text-yellow-500 text-xl"></i>
          </div>
        )}
      </div>
    </div>
  );
};
