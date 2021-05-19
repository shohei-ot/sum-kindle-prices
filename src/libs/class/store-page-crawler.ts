import * as pp from 'puppeteer';
import { Page } from 'puppeteer';
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

    return {
      url: this.page.url(),
      productTitle: prodTitle,
      kindlePriceRaw,
      kindlePrice: kindlePriceRaw ? kindlePriceParser(kindlePriceRaw) : null,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  private async getProductTitle(): Promise<string | null> {
    const selector = '#productTitle';
    return this.getInnerText(selector);
  }

  private async getKindlePriceRaw(): Promise<string | null> {
    const selector = '#kindle-price';
    return this.getInnerText(selector);
  }

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
    const baseUrl = await this.page.evaluate(() => {
      return window.location.protocol + window.location.host;
    });
    let widgetBtnWrapper = await this.getWidgetButtonWrapper();
    const maxNum = await this.getCarouselPageMaxNum(widgetBtnWrapper);
    console.log({ maxNum });
    let currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
    currentNum -= 1;
    if (currentNum !== 0) {
      this.backToCarousel1stPage();
    }
    const uriList: string[] = [];

    // wait widget
    await this.page.waitForSelector(
      '#SeriesWidgetButtonWrapper ol[aria-busy="false"]'
    );

    // await this.page.screenshot({
    //   fullPage: true,
    //   path: 'sum-kindle-prices_test.png',
    // });

    while (currentNum < maxNum) {
      widgetBtnWrapper = await this.getWidgetButtonWrapper();
      const currentPageSeriesUrlList = await this.getUrlListFromWidgetPage(
        widgetBtnWrapper
      );
      uriList.push(...currentPageSeriesUrlList);
      currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
      console.log({ currentNum, maxNum });
      if (currentNum < maxNum) {
        await this.clickGotoNextButton();
      }
    }
    const complementedUrllist = uriList.map((u) => `${baseUrl}${u}`);
    return complementedUrllist;
  }

  private async backToCarousel1stPage() {
    let widgetBtnWrapper = await this.getWidgetButtonWrapper();
    let currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
    while (currentNum > 1) {
      widgetBtnWrapper = await this.getWidgetButtonWrapper();
      await this.clickGotoPrevButton();
      currentNum = await this.getCarouselPageCurrentNum(widgetBtnWrapper);
    }
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

  private async clickGotoPrevButton() {
    const selector = '#SeriesWidgetButtonWrapper .a-carousel-goto-prevpage';
    await this.page.waitForSelector(
      '#SeriesWidgetButtonWrapper ol[aria-busy="false"]'
    );
    await this.page.click(selector);
    await this.page.waitForSelector(
      '#SeriesWidgetButtonWrapper ol[aria-busy="false"]'
    );
  }

  private async clickGotoNextButton() {
    const selector = '#SeriesWidgetButtonWrapper .a-carousel-goto-nextpage';
    await this.page.waitForSelector(
      '#SeriesWidgetButtonWrapper ol[aria-busy="false"]'
    );
    await this.page.click(selector);
    await this.page.waitForSelector(
      '#SeriesWidgetButtonWrapper ol[aria-busy="false"]'
    );
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
    console.log({ maxNumStr });
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
