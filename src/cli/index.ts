import * as CliProgress from 'cli-progress';
import { KindleStoreBrowser } from '../libs/class/kindle-store-browser';
import { KindleStorePageInfo } from '../libs/interface/kindle-store-page-info';

interface ICliOption {
  crawlSeriesUrls: boolean;
}

class Cli {
  private browser: KindleStoreBrowser;
  private option: Partial<ICliOption>;

  constructor(option: Partial<ICliOption> = {}) {
    this.option = option;
    this.browser = new KindleStoreBrowser();
  }

  public async close() {
    await this.browser.close();
  }

  public async getEachPageInfo(
    urlList: string[]
  ): Promise<Array<KindleStorePageInfo>> {
    const progBar = new CliProgress.SingleBar({});
    progBar.start(urlList.length, 0);
    progBar.setTotal(urlList.length);

    // NOTE: URLが多い時にタブがURLの数だけ増えるのでひとまず直列で実行
    // const promiseList: Promise<KindleStorePageInfo>[] = urlList.map((urlStr) =>
    //   this.browser.getPageInfo(urlStr)
    // );
    // return await promiseList;

    // const currentProcessCount = 0;
    // const maxProcess = 3;

    // const processsor = async (self: Cli, urlList: string[]) => {};

    const iteratePromises = async function* (self: Cli, urlList: string[]) {
      // const crawlUrlList: string[] = [];

      // if (self.option.crawlSeriesUrls) {
      //   for await (const urlStr of urlList) {
      //     const existSeries = self.browser.existSeries(urlStr);
      //     if (existSeries) {
      //       const seriesUrlList = await self.browser.getSeriesUrlList(urlStr);
      //       crawlUrlList.push(...seriesUrlList);
      //     } else {
      //       crawlUrlList.push(urlStr);
      //     }
      //   }
      // } else {
      //   crawlUrlList.push(...urlList);
      // }

      // progBar.setTotal(crawlUrlList.length);

      // for await (const urlStr of crawlUrlList) {
      //   yield self.browser.getPageInfo(urlStr);
      // }
      for await (const urlStr of urlList) {
        yield self.browser.getPageInfo(urlStr);
      }
    };

    const infoList: Array<KindleStorePageInfo> = [];

    for await (const info of iteratePromises(this, urlList)) {
      infoList.push(info);
      progBar.increment();
    }

    progBar.stop();

    return infoList;
  }
}

export { Cli };
