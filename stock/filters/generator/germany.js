const requestSync = require("sync-request"),
    fs = require("fs");
const {URL} = require('url');

const modelExchange = "XETR";
const config = [
    {
        "exchange": "FWB",
        "path": "../germany.frankfurt.json"
    },
    {
        "exchange": "SWB",
        "path": "../germany.stuttgart.json"
    }
];
const selectedTypes = "stock";
const selectedSubTypes = [
    "common",
    "preferred",
    "dr"];
const fieldsNotNull = "earnings_release_date,earnings_release_next_date";

const udfProxy = "http://udf-proxy.tradingview.com:8094/symbols";

function loadSymbolsImpl(exchange, fields, searchTypes, searchSubType) {
    let url = udfProxy + "?domain=tv&perm=*&prefix=" + exchange;
    if (fields && fields.length) {
        url += "&fields=" + fields;
    }
    if (searchTypes && searchTypes.length) {
        url += "&type=" + searchTypes;
    }
    if (searchSubType && searchSubType.length) {
        url += "&typespecs=" + searchSubType;
    }
    const response = requestSync("GET", url);
    if (response.statusCode != 200) {
        throw Error(url + ':' + response.statusCode);
    }
    return JSON.parse(response.getBody()).symbols || [];
}

function loadSymbols(exchange, fields, searchTypes, searchSubTypes) {
    let result = [];
    if (searchSubTypes && Array.isArray(searchSubTypes)) {
        searchSubTypes.forEach(sub => {
            result = result.concat(loadSymbolsImpl(exchange, fields, searchTypes, sub));
        })
    } else {
        result = loadSymbolsImpl(exchange, fields, searchTypes, searchSubTypes);
    }
    return result;
}

const modelStocks = {};
loadSymbols(modelExchange, "symbol", selectedTypes).forEach(s => modelStocks[s.f[0]] = true);

function hasDataAny(s) {
    let empty = true;
    for (let i = 1; i < s.f.length; i++) {
        if (s.f[i]) {
            empty = false;
            break;
        }
    }
    return !empty;
}

function hasDataAll(s) {
    for (let i = 1; i < s.f.length; i++) {
        if (!s.f[i]) {
            return false;
        }
    }
    return true;
}

config.forEach(c => {
    const symbols = loadSymbols(c.exchange, "symbol," + fieldsNotNull, selectedTypes, selectedSubTypes).filter(s => {
        const isModel = !!modelStocks[s.f[0]];
        const hasD = hasDataAll(s);
        return isModel || hasD;
    }).map(s => ({"s": s.s}));
    if (symbols.length) {
        symbols.sort(function (l, r) {
            return l.s.localeCompare(r.s);
        });
        fs.writeFileSync(c.path, JSON.stringify(
            {
                "symbols": symbols
            }, null, 2));
    }
});