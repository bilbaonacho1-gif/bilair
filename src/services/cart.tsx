import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { getProduct } from '../data/products';

export interface CartLine {
  productId: string;
  colorId: string;
  size: string;
  qty: number;
}

interface CartApi {
  lines: CartLine[];
  count: number;
  /** Suma solo los productos con precio cargado */
  subtotal: number;
  hasUnpriced: boolean;
  add: (line: Omit<CartLine, 'qty'>) => void;
  setQty: (index: number, qty: number) => void;
  remove: (index: number) => void;
  clear: () => void;
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const KEY = 'bilair.cart.v1';
const CartContext = createContext<CartApi | null>(null);

function load(): CartLine[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    // Descarta líneas de productos que ya no existen en el catálogo
    return parsed.filter((l) => getProduct(l.productId));
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>(load);
  const [isOpen, setOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(lines));
    } catch {
      /* almacenamiento no disponible: el carrito vive solo en memoria */
    }
  }, [lines]);

  const add = useCallback((line: Omit<CartLine, 'qty'>) => {
    setLines((prev) => {
      const i = prev.findIndex((l) => l.productId === line.productId && l.colorId === line.colorId && l.size === line.size);
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { ...line, qty: 1 }];
    });
  }, []);

  const api = useMemo<CartApi>(() => {
    let subtotal = 0;
    let hasUnpriced = false;
    for (const l of lines) {
      const p = getProduct(l.productId);
      if (p?.price == null) hasUnpriced = true;
      else subtotal += p.price * l.qty;
    }
    return {
      lines,
      count: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      hasUnpriced,
      add,
      setQty: (index, qty) => setLines((prev) => prev.map((l, i) => (i === index ? { ...l, qty: Math.max(1, Math.min(9, qty)) } : l))),
      remove: (index) => setLines((prev) => prev.filter((_, i) => i !== index)),
      clear: () => setLines([]),
      isOpen,
      open: () => setOpen(true),
      close: () => setOpen(false),
    };
  }, [lines, isOpen, add]);

  return <CartContext.Provider value={api}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart fuera de CartProvider');
  return ctx;
}
