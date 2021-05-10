import * as pp from 'puppeteer';
import { KindleStorePageInfo } from '../interface/kindle-store-page-info';
import { StorePageCrawler } from './store-page-crawler';

type KindleStoreUrl = string;

class KindleStoreBrowser {
  public static readonly ERR_MSG_UNEXPECTED_GOTO_RESPOSNE_STATUS =
    'page.goto による予期しないレスポンスステータス';

  public async close() {
    const browser = await this.getBrowser();
    await browser.close();
  }

  private browser?: pp.Browser;

  private urlPageMap: Map<KindleStoreUrl, pp.Page> = new Map<
    KindleStoreUrl,
    pp.Page
  >();

  public async getPageInfo(
    storeUrl: KindleStoreUrl
  ): Promise<KindleStorePageInfo> {
    // console.log('KindleStoreBrowser.getPageInfo');
    const page = await this.load(storeUrl);
    if (typeof page === 'undefined') {
      throw new Error('予期しない undefined な Puppeteer page');
    }

    const crawler = new StorePageCrawler(page);
    const res = await crawler.makePageInfo();
    page.close();
    return res;
  }

  private async load(storeUrl: KindleStoreUrl) {
    // console.log('KindleStoreBrowser.load');
    if (typeof this.urlPageMap.get(storeUrl) === 'undefined') {
      const browser = await this.getBrowser();
      const pageTmp = await browser.newPage();
      this.urlPageMap.set(storeUrl, pageTmp);
    }
    const page = this.urlPageMap.get(storeUrl);
    if (typeof page === 'undefined')
      throw new Error('予期しない undefined page');

    // const res = await page.goto(storeUrl, { waitUntil: 'networkidle2' });
    const res = await page.goto(storeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });
    // console.warn(res);
    if (res === null) {
      throw new Error('page.goto による予期しない null');
    }

    const status = res.status();
    if (status !== 200 && status !== 203) {
      throw new Error(
        KindleStoreBrowser.ERR_MSG_UNEXPECTED_GOTO_RESPOSNE_STATUS
      );
    }

    return page;
  }

  private async getBrowser(): Promise<pp.Browser> {
    // console.log('KindleStoreBrowser.getBrowser START');
    if (typeof this.browser === 'undefined') {
      // console.log('KindleStoreBrowser.getBrowser launch...');
      this.browser = await pp.launch();
    }
    // console.log('KindleStoreBrowser.getBrowser DONE');
    return this.browser;
  }
}

export { KindleStoreBrowser };
