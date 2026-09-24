import { useEffect, useRef, useState } from "react";

export type MarketCoin = {
  id: string;
  symbol: string;
  name: string;
  image: string;
  price: number;
  change24h: number;
};

const TOP_SYMBOLS = [
  "BTC", "ETH", "BNB", "XRP", "SOL", "DOGE", "ADA", "TRX", "TON", "AVAX",
  "DOT", "LINK", "MATIC", "LTC", "SHIB", "BCH", "NEAR", "UNI", "ICP", "ETC",
];

const COIN_NAMES: Record<string, string> = {
  BTC: "Bitcoin", ETH: "Ethereum", BNB: "BNB", XRP: "XRP", SOL: "Solana",
  DOGE: "Dogecoin", ADA: "Cardano", TRX: "TRON", TON: "Toncoin", AVAX: "Avalanche",
  DOT: "Polkadot", LINK: "Chainlink", MATIC: "Polygon", LTC: "Litecoin", SHIB: "Shiba Inu",
  BCH: "Bitcoin Cash", NEAR: "NEAR Protocol", UNI: "Uniswap", ICP: "Internet Computer", ETC: "Ethereum Classic",
};

function icon(sym: string): string {
  return `https://assets.coincap.io/assets/icons/${sym.toLowerCase()}@2x.png`;
}

/*
 * Fetches live prices directly from the user's own browser instead of
 * through the Cloudflare Worker backend. Binance and other exchange
 * APIs commonly block/throttle requests coming from Cloudflare's own
 * IP ranges (confirmed: 403 from Binance, 530 from CoinCap, 401 from
 * CryptoCompare when called from the Worker) — but a normal visitor's
 * browser has an ordinary residential/mobile IP, so the exact same
 * request works fine from there.
 */
export function useLiveMarkets() {
  const [data, setData] = useState<MarketCoin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const loadRef = useRef<(isManualRefresh?: boolean) => Promise<void>>(async () => {});

  useEffect(() => {
    mounted.current = true;

    async function load(isManualRefresh = false) {
      if (isManualRefresh && mounted.current) setRefreshing(true);
      try {
        const symbolsParam = encodeURIComponent(JSON.stringify(TOP_SYMBOLS.map((s) => `${s}USDT`)));
        const res = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbols=${symbolsParam}`);

        if (!res.ok) throw new Error(`Binance responded ${res.status}`);

        const rows = (await res.json()) as any[];
        const bySymbol = new Map(rows.map((r) => [r.symbol, r]));

        const coins: MarketCoin[] = TOP_SYMBOLS
          .map((sym) => {
            const row = bySymbol.get(`${sym}USDT`);
            if (!row) return null;
            return {
              id: sym.toLowerCase(),
              symbol: sym,
              name: COIN_NAMES[sym] || sym,
              image: icon(sym),
              price: Number(row.lastPrice) || 0,
              change24h: Number(row.priceChangePercent) || 0,
            };
          })
          .filter((c): c is MarketCoin => c !== null && c.price > 0);

        if (mounted.current) {
          if (coins.length > 0) {
            setData(coins);
            setError(null);
          } else {
            setError("لم يتم إرجاع أي بيانات أسعار.");
          }
          setLoading(false);
          setRefreshing(false);
        }
      } catch (err) {
        if (mounted.current) {
          setError(err instanceof Error ? err.message : String(err));
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    loadRef.current = load;
    load();
    const interval = setInterval(load, 45000);

    return () => {
      mounted.current = false;
      clearInterval(interval);
    };
  }, []);

  const refetch = () => loadRef.current(true);

  return { data, error, loading, refreshing, refetch };
}
