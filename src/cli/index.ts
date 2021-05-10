import * as CliProgress from 'cli-progress';
import { KindleStoreBrowser } from '../libs/class/kindle-store-browser';
import { KindleStorePageInfo } from '../libs/interface/kindle-store-page-info';

class Cli {
  private browser: KindleStoreBrowser;

  constructor() {
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
      // TODO: 同時に3ページくらい処理したい
      for (const urlStr of urlList) {
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
