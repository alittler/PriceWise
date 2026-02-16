
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { PriceCard } from './components/PriceCard';
import { GroceryItem, GlobalComparisonUnit } from './types';
import { analyzeGroceryImage } from './services/geminiService';
import { getNormalizedData } from './utils/unitConverter';

const App: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState<GlobalComparisonUnit>('small');
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (items.length > 0) {
      scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [items.length]);

  const processSingleImage = async (id: string, base64: string) => {
    try {
      const analysis = await analyzeGroceryImage(base64);
      if (analysis) {
        const norm = getNormalizedData(analysis.price, analysis.quantity, analysis.unit);
        setItems(prev => prev.map(it => it.id === id ? {
          ...it,
          ...analysis,
          unit: analysis.unit.toUpperCase(),
          category: norm.category,
          normalizedRates: norm.rates,
          status: 'complete',
          errorReason: undefined
        } : it));
      } else {
        setItems(prev => prev.map(it => it.id === id ? { 
          ...it, 
          status: 'error',
          errorReason: 'Could not find price or unit in this image.'
        } : it));
      }
    } catch (err) {
      setItems(prev => prev.map(it => it.id === id ? { 
        ...it, 
        status: 'error',
        errorReason: 'Network error or unreadable tag.'
      } : it));
    }
  };

  const handleCapture = useCallback(async (base64Array: string[]) => {
    setIsProcessing(true);
    const newItems: GroceryItem[] = base64Array.map(base64 => ({
      id: Math.random().toString(36).substr(2, 9),
      imageUrl: base64,
      status: 'analyzing'
    }));

    setItems(prev => [...prev, ...newItems]);

    // Process in parallel
    await Promise.all(newItems.map(item => processSingleImage(item.id, item.imageUrl)));
    setIsProcessing(false);
  }, []);

  const updateItem = (id: string, updates: Partial<GroceryItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  
  const handleReset = () => {
    if (window.confirm("ERASE ALL SCANS?")) {
      setItems([]);
      setIsProcessing(false);
    }
  };

  const toggleScale = useCallback(() => {
    setScale(prev => prev === 'small' ? 'large' : 'small');
  }, []);

  // Helper to get the rate for an item based on current scale
  const getItemRate = useCallback((item: GroceryItem, currentScale: GlobalComparisonUnit) => {
    if (item.status !== 'complete' || !item.normalizedRates) return Infinity;
    const key = currentScale === 'large' ? (item.category === 'weight' ? '1KG' : '1L') : (item.category === 'weight' ? '100G' : '100ML');
    return item.normalizedRates[key] || item.normalizedRates['UNIT'] || Infinity;
  }, []);

  // Sort items: Cheapest first, analyzing/error items at the end
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      // Put analyzing items at the very bottom
      if (a.status === 'analyzing' && b.status !== 'analyzing') return 1;
      if (b.status === 'analyzing' && a.status !== 'analyzing') return -1;
      
      // Put error items just above analyzing but below complete
      if (a.status === 'error' && b.status === 'complete') return 1;
      if (b.status === 'error' && a.status === 'complete') return -1;

      // Both are complete, compare rates
      const rateA = getItemRate(a, scale);
      const rateB = getItemRate(b, scale);
      
      return rateA - rateB;
    });
  }, [items, scale, getItemRate]);

  // Find the overall best rate to calculate percentages
  const bestRate = useMemo(() => {
    const completeItems = items.filter(i => i.status === 'complete');
    if (completeItems.length === 0) return null;
    
    let lowest = Infinity;
    completeItems.forEach(item => {
      const rate = getItemRate(item, scale);
      if (rate < lowest) lowest = rate;
    });
    return lowest === Infinity ? null : lowest;
  }, [items, scale, getItemRate]);

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-32">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black tracking-tighter italic">PRICEWISE</h1>
        </div>
        <div className="flex gap-4">
          {items.length > 0 && (
            <button 
              onClick={handleReset}
              className="text-[10px] font-black tracking-widest bg-red-600 px-3 py-1.5 rounded-full hover:bg-red-700 transition-colors"
            >
              RESET
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 max-w-2xl mx-auto">
        {/* Vertical Feed of Large Cards */}
        <div className="flex flex-col gap-8 px-4">
          {sortedItems.map((item) => {
            let percentageDiff;
            const itemRate = getItemRate(item, scale);

            if (item.status === 'complete' && bestRate && itemRate !== Infinity) {
              if (itemRate > bestRate) {
                percentageDiff = ((itemRate - bestRate) / bestRate) * 100;
              }
            }

            const isBest = item.status === 'complete' && bestRate && itemRate !== Infinity && Math.abs(itemRate - bestRate) < 0.0001;

            return (
              <PriceCard 
                key={item.id} 
                item={item} 
                isBestValue={!!isBest} 
                scale={scale}
                onRemove={removeItem}
                onUpdate={updateItem}
                onToggleScale={toggleScale}
                percentageDiff={percentageDiff}
              />
            );
          })}

          {/* Camera trigger integrated into the bottom of the feed */}
          <div className="w-full">
            <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
          </div>
        </div>

        {items.length === 0 && !isProcessing && (
          <div className="px-8 mt-12 text-center">
            <h2 className="text-2xl font-black mb-2 opacity-30">SCAN TO BEGIN</h2>
            <p className="text-zinc-600 text-sm font-medium">Tap the camera card below to start comparing prices.</p>
          </div>
        )}

        <div ref={scrollEndRef} className="h-20" />
      </main>
    </div>
  );
};

export default App;
