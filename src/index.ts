import { program } from 'commander';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { Cli } from './cli';
import Table from 'cli-table3';
import { KindleStorePageInfo } from './libs/interface/kindle-store-page-info';

const packageJson = readFileSync(resolve(__dirname, '..', 'package.json'), {
  encoding: 'utf-8',
});
// console.log('packageJson', packageJson);
const packageObj = JSON.parse(packageJson);

program.version(packageObj.version);

program
  .option('-s, --separator <separator>', 'separator char', ',')
  // .option('-c, --crawlSeriesUrls', 'crawling book series urls', false)
  .arguments('<urlList>')
  .description(
    'Kindle ストアページの URL を複数指定して金額を合算します。Amazonポイントは考慮しません。',
    {
      urlList:
        "comma separated url list (e.g. 'https://...,https://...,https://...')",
    }
  )
  .action(async (urlList: string, options) => {
    // console.warn('options', options);
    try {
      const urls = urlList.split(options.separator).filter(Boolean);
      const crawlSeriesUrls = options.crawlSeriesUrls;
      const cli = new Cli({ crawlSeriesUrls });
      const infoList = await cli.getEachPageInfo(urls);

      // console.log('全情報取得成功', infoList);

      const uniqKeys = Array.from<keyof KindleStorePageInfo>(
        new Set(
          infoList
            .map<Array<keyof KindleStorePageInfo>>(
              (obj) => Object.keys(obj) as Array<keyof KindleStorePageInfo>
            )
            .reduce((acm, keys) => {
              acm.push(...keys);
              return acm;
            }, [])
        )
      );
      // console.log('uniqKeys', uniqKeys);

      const table = new Table({
        head: uniqKeys,
      });

      const genRows = (
        uniqKeys: Array<keyof KindleStorePageInfo>,
        infoList: KindleStorePageInfo[]
      ) => {
        return infoList.map((info, i) => {
          const row = uniqKeys
            .map((k) => {
              const val = (() => {
                const value = info[k];
                if (value === null) return 'null';
                if (typeof value === 'undefined') return '';
                if (Array.isArray(value))
                  return value
                    .map((v) => {
                      if (typeof v === 'object') return v.toString();
                      return v ? `${v}` : '';
                    })
                    .join(', ');
                return `${value}`;
              })();
              return { [k]: val };
            })
            .reduce(
              (acm, keyVal) => {
                return {
                  ...acm,
                  ...keyVal,
                };
              },
              { '#': i + 1 }
            );
          return Object.values(row);
        });
      };

      const rows = genRows(uniqKeys, infoList);

      console.log(`件数: ${rows.length}`);
      table.push(...rows);

      console.log(table.toString());

      const validBooks = infoList.filter(
        (info) => typeof info.errors === 'undefined'
      );
      const validBookNum = validBooks.length;
      const validBooksTable = new Table();
      validBooksTable.push(
        ...genRows(
          uniqKeys.filter((k) => k !== 'errors' && k !== 'url'),
          validBooks
        )
      );
      console.log(`取得できた電子書籍: ${validBookNum} 冊`);
      console.log(validBooksTable.toString());

      const totalCost = validBooks.reduce((acm, info) => {
        acm += info.kindlePrice ?? 0;
        return acm;
      }, 0);
      const sumTable = new Table({});
      const formattedCost = new Intl.NumberFormat('ja-JP', {
        style: 'currency',
        currency: 'JPY',
      }).format(totalCost);
      sumTable.push({
        電子書籍数: `${validBookNum} 冊`,
      });
      sumTable.push({
        合計金額: formattedCost,
      });
      console.log(sumTable.toString());
      // process.exit(0);
      cli.close();
    } catch (e) {
      // throw e;
      console.error(e);
      process.exit(1);
    }
  })
  .parse(process.argv);
