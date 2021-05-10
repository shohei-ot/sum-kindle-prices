export interface KindleStorePageInfo {
  url: string;
  productTitle: string | null;
  kindlePriceRaw: string | null;
  kindlePrice: number | null;
  // youPayPriceRaw: string | null;
  // youPayPrice: number | null;
  errors?: Error[];
}
