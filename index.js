const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { parse } = require('json2csv');
const start = Date.now();

try {
    const config = require('./config.json');
} catch(error) {
    console.error("Please copy config.example.json to config.json and edit the necessary values.");
    process.exit();
}

(async () => {
    const browser = await puppeteer.launch({ args: [ '--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    const empty = { country: '', code: '', eu: '', mfn: '' };

    let data = [];
    for (let i = 0; i < config.countries.length; i++) {
        const country = config.countries[i];

        for (let j = 0; j < config.codes.length; j++) {
            const code = config.codes[j];
            console.log(`Running country ${country.name} with code ${code}`);
            const countryResult = await runCountry(page, code, country);
            data = [...data, ...countryResult, empty]
        };

        data = [...data, empty, empty];
    }

    createCsv(data);
    await browser.close();
    console.log(`Ran for ${((Date.now()) - start)/1000}s`)
})().catch(err => { throw err; });

const runCountry = async (puppeteer, code, country) => {
    const url = config.baseUrl.replace('{{country}}', country.code).replace('{{code}}', code);

    await puppeteer.goto(url);
    
    const rows = await puppeteer.evaluate(() => {
        const rows = [];
        const tableList = document.querySelectorAll('#tarrifsTable tr.accordion');
        const ths = document.querySelectorAll('#tarrifsTable th');

        const indexes = {
            code: false,
            eu: false,
            mfn: false
        };

        for (let i = 0; i < ths.length; i++) {
            switch (ths[i].innerText.toLowerCase().trim()) {
                case 'code':
                    indexes.code = i;
                    break;
                case 'eu':
                    indexes.eu = i;
                    break;
                case 'mfn':
                    indexes.mfn = i;
                    break;
            }
        }

        
        for (let i = 0; i < tableList.length; i++) {
            try {
                const tds = tableList[i].querySelectorAll('td');
                rows.push({
                    code: indexes.code !== false ? tds[indexes.code].innerText : '',
                    eu: indexes.eu !== false ? tds[indexes.eu].innerText : '',
                    mfn: indexes.mfn !== false ? tds[indexes.mfn].innerText : '',
                });
            }
            catch (e) { continue; }
        }

        return rows;
    });

    return rows.map(row => {
        row.country = country.name;
        return row;
    });
};

const createCsv = (data) => {
    const fields = ['country', 'code', 'eu', 'mfn'];
    const opts = { fields };
    const csv = parse(data, opts);
    const date = new Date().toLocaleString("nl-NL").replace(/\//gi, '-');
    fs.writeFileSync(path.join(process.cwd(), 'exports', `${date}.csv`), csv);
};