import * as pp from 'puppeteer';
import { KindleStorePageInfo } from '../interface/kindle-store-page-info';
import { kindlePriceParser } from '../parser/kindle-price-parser';
// import { youPayValueParser } from '../parser/you-pay-value-parser';
// import { env } from '../utils/env';

class StorePageCrawler {
  private page: pp.Page;

  constructor(storePage: pp.Page) {
    this.page = storePage;
  }

  public async makePageInfo(): Promise<KindleStorePageInfo> {
    const errors: Error[] = [];

    let prodTitle = null;
    try {
      prodTitle = await this.getProductTitle();
    } catch (e) {
      errors.push(e);
    }

    let kindlePriceRaw = null;
    try {
      kindlePriceRaw = await this.getKindlePriceRaw();
    } catch (e) {
      errors.push(e);
    }

    // let youPayPriceRaw = null;
    // try {
    //   youPayPriceRaw = await this.getYouPayPriceRaw();
    // } catch (e) {
    //   errors.push(e);
    // }

    return {
      url: this.page.url(),
      productTitle: prodTitle,
      kindlePriceRaw,
      kindlePrice: kindlePriceRaw ? kindlePriceParser(kindlePriceRaw) : null,
      // youPayPriceRaw,
      // youPayPrice: youPayPriceRaw ? youPayValueParser(youPayPriceRaw) : null,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async getProductTitle(): Promise<string | null> {
    // const selector = env('PRODUCT_TITLE_SELECTOR');
    const selector = '#productTitle';
    return this.getInnerText(selector);
  }

  private async getKindlePriceRaw(): Promise<string | null> {
    // const selector = env('KINDLE_PRICE_SELECTOR');
    const selector = '#kindle-price';
    return this.getInnerText(selector);
  }

  // private async getYouPayPriceRaw(): Promise<string | null> {
  //   // const selector = env('YOU_PAY_VALUE_SELECTOR');
  //   const selector = '#youPayValue';
  //   return this.getInnerText(selector);
  // }

  private async getInnerText(selector: string): Promise<string | null> {
    const elHandler: pp.ElementHandle<HTMLElement> | null = await this.page.$(
      selector
    );
    if (elHandler === null) {
      throw new Error(`ページ内に ${selector} が見つからない`);
    }
    const val = await elHandler.evaluate((el) => el.innerText);
    return val;
  }

  public async existSeries(): Promise<boolean> {
    const elHandler: pp.ElementHandle<HTMLElement> | null = await this.page.$(
      '#SeriesWidgetShvl'
    );
    return elHandler !== null;
  }

  public async getSeriesUrlList(): Promise<string[]> {
    // const widgetElHandler: pp.ElementHandle<HTMLElement> | null = await this.page.$(
    //   '#SeriesWidgetButtonWrapper'
    // );
    // if (widgetElHandler === null) {
    //   throw new Error('#widgetElHandler が存在しない');
    // }
    let widgetBtnWrapper = await this.getWidgetButtonWrapper();
    const maxNum = await this.getCarouselPageMaxNum(widgetBtnWrapper);
    // const currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
    let currentNum = 0;
    const urlList: string[] = [];
    // FIXME: while って await 効く？
    while (currentNum < maxNum) {
      widgetBtnWrapper = await this.getWidgetButtonWrapper();
      const currentPageSeriesUrlList = await this.getUrlListFromWidgetPage(
        widgetBtnWrapper
      );
      urlList.push(...currentPageSeriesUrlList);
      currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
    }
    return urlList;
  }

  private async getWidgetButtonWrapper() {
    const widgetElHandler: pp.ElementHandle<HTMLElement> | null = await this.page.$(
      '#SeriesWidgetButtonWrapper'
    );
    if (widgetElHandler === null) {
      throw new Error('#widgetElHandler が存在しない');
    }
    return widgetElHandler;
  }

  private async getUrlListFromWidgetPage(
    widgetButtonWrapperEl: pp.ElementHandle<HTMLElement>
  ) {
    const listItemElHandlers = await widgetButtonWrapperEl.$$<HTMLOListElement>(
      'ol > li'
    );
    const urlPromiseList = listItemElHandlers.map(async (elHandler) => {
      const aEl = await elHandler.$<HTMLAnchorElement>('a');
      if (aEl === null) return undefined;
      const url: string = await aEl.evaluate((el) => el.getAttribute('href'));
      return url;
    });
    const urlList = await Promise.all(urlPromiseList);
    const validUrlList: string[] = urlList.filter(Boolean) as string[];
    return validUrlList;
  }

  private async getCarouselPageMaxNum(
    widgetButtonWrapperEl: pp.ElementHandle<HTMLElement>
  ): Promise<number> {
    const selector = '.a-carousel-page-max';
    const pageMaxEl = await widgetButtonWrapperEl.$<HTMLSpanElement>(selector);
    if (!pageMaxEl) {
      throw new Error(`${selector} が見つからない`);
    }
    const maxNumStr = await pageMaxEl
      .evaluate((el) => el.innerHTML as string)
      .then((str) => str.trim());
    const maxNum = parseInt(maxNumStr, 10);
    if (Number.isNaN(maxNum)) {
      throw new Error('番号を取得できない: ' + maxNumStr);
    }
    return maxNum;
  }

  private async getCarouselPageCurrentNum(
    widgetButtonWrapperEl: pp.ElementHandle<HTMLElement>
  ): Promise<number> {
    const selector = '.a-carousel-page-current';
    const pageCurrentEl = await widgetButtonWrapperEl.$<HTMLSpanElement>(
      selector
    );
    if (!pageCurrentEl) {
      throw new Error(`${selector} が見つからない`);
    }
    const maxCurrentStr = await pageCurrentEl
      .evaluate((el) => el.innerHTML as string)
      .then((str) => str.trim());
    const currentNum = parseInt(maxCurrentStr, 10);
    if (Number.isNaN(currentNum)) {
      throw new Error('番号を取得できない: ' + maxCurrentStr);
    }
    return currentNum;
  }
}

export { StorePageCrawler };
