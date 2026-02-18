
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { CameraView } from './components/CameraView';
import { PriceCard } from './components/PriceCard';
import { GroceryItem, GlobalComparisonUnit } from './types';
import { analyzeGroceryImage } from './services/geminiService';
import { getNormalizedData } from './utils/unitConverter';

// The environment provides window.aistudio with its own type definition.
// Redundant local declarations are removed to avoid modifier and type mismatch errors.

const App: React.FC = () => {
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scale, setScale] = useState<GlobalComparisonUnit>('small');
  const [hasKey, setHasKey] = useState<boolean>(true); // Assume true initially to avoid flicker
  const scrollEndRef = useRef<HTMLDivElement>(null);

  // Check for API Key on mount
  useEffect(() => {
    const checkKey = async () => {
      // Accessing aistudio via window casting to avoid TypeScript re-declaration conflicts
      const selected = await (window as any).aistudio.hasSelectedApiKey();
      // If process.env.API_KEY exists (from Vercel), we're good. Otherwise check selection.
      setHasKey(!!process.env.API_KEY || selected);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    try {
      // Triggering key selection dialog. Success is assumed as per guidelines.
      await (window as any).aistudio.openSelectKey();
      setHasKey(true);
    } catch (err) {
      console.error("Key selection failed", err);
    }
  };

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
          errorReason: 'Could not identify price/unit. Try manual entry.'
        } : it));
      }
    } catch (err: any) {
      // Handle "Requested entity was not found" or Auth errors by resetting key state
      if (err?.message?.includes('not found') || err?.message?.includes('API_KEY')) {
        setHasKey(false);
      }
      setItems(prev => prev.map(it => it.id === id ? { 
        ...it, 
        status: 'error',
        errorReason: 'Connection error. Check your API Key settings.'
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
    await Promise.all(newItems.map(item => processSingleImage(item.id, item.imageUrl)));
    setIsProcessing(false);
  }, []);

  const updateItem = (id: string, updates: Partial<GroceryItem>) => {
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...updates } : it));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(it => it.id !== id));
  const handleReset = () => window.confirm("ERASE ALL SCANS?") && setItems([]);
  const toggleScale = useCallback(() => setScale(prev => prev === 'small' ? 'large' : 'small'), []);

  const getItemRate = useCallback((item: GroceryItem, currentScale: GlobalComparisonUnit) => {
    if (item.status !== 'complete' || !item.normalizedRates) return Infinity;
    const key = currentScale === 'large' ? (item.category === 'weight' ? '1KG' : '1L') : (item.category === 'weight' ? '100G' : '100ML');
    const rate = item.normalizedRates[key] || item.normalizedRates['UNIT'];
    return typeof rate === 'number' ? rate : Infinity;
  }, []);

  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.status === 'analyzing' && b.status !== 'analyzing') return 1;
      if (b.status === 'analyzing' && a.status !== 'analyzing') return -1;
      if (a.status === 'error' && b.status === 'complete') return 1;
      if (b.status === 'error' && a.status === 'complete') return -1;
      return getItemRate(a, scale) - getItemRate(b, scale);
    });
  }, [items, scale, getItemRate]);

  const bestRate = useMemo(() => {
    const rates = items.filter(i => i.status === 'complete').map(i => getItemRate(i, scale));
    return rates.length ? Math.min(...rates) : null;
  }, [items, scale, getItemRate]);

  return (
    <div className="min-h-screen bg-black text-white font-sans antialiased pb-32">
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black tracking-tighter italic">PRICEWISE</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleSelectKey}
            className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full border transition-all ${
              hasKey ? 'border-white/10 text-zinc-500 hover:text-white' : 'bg-amber-500 text-black border-amber-400 animate-pulse'
            }`}
          >
            {hasKey ? 'UPDATE KEY' : 'CONNECT API'}
          </button>
          {items.length > 0 && (
            <button onClick={handleReset} className="text-[10px] font-black tracking-widest bg-red-600 px-3 py-1.5 rounded-full hover:bg-red-700">
              RESET
            </button>
          )}
        </div>
      </header>

      <main className="pt-24 max-w-2xl mx-auto">
        {!hasKey && (
          <div className="mx-4 mb-8 p-6 bg-zinc-900 border border-amber-500/30 rounded-3xl text-center">
            <i className="fas fa-plug text-amber-500 mb-3 text-xl"></i>
            <h2 className="text-sm font-black uppercase tracking-widest mb-2">Service Offline</h2>
            <p className="text-xs text-zinc-500 mb-4">The AI scanner needs an API key to work. You can still enter items manually.</p>
            <button 
              onClick={handleSelectKey}
              className="bg-amber-500 text-black px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest"
            >
              Select Paid API Key
            </button>
            <p className="mt-3 text-[9px] text-zinc-600">
              Requires a project from <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline">Google Cloud Billing</a>
            </p>
          </div>
        )}

        <div className="flex flex-col gap-8 px-4">
          {sortedItems.map((item) => {
            const itemRate = getItemRate(item, scale);
            const isBest = item.status === 'complete' && bestRate && Math.abs(itemRate - bestRate) < 0.0001;
            const percentageDiff = (item.status === 'complete' && bestRate && itemRate > bestRate) ? ((itemRate - bestRate) / bestRate) * 100 : undefined;

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

          <div className="w-full">
            <CameraView onCapture={handleCapture} isProcessing={isProcessing} />
          </div>
        </div>

        {items.length === 0 && !isProcessing && (
          <div className="px-8 mt-12 text-center">
            <h2 className="text-2xl font-black mb-2 opacity-30 uppercase tracking-tighter">Scan to Begin</h2>
            <p className="text-zinc-600 text-sm font-medium italic">Snap tags to find the best deal.</p>
          </div>
        )}

        <div ref={scrollEndRef} className="h-20" />
      </main>
    </div>
  );
};

export default App;
