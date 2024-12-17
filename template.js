const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const parseUrl = require('parseUrl');
const JSON = require('JSON');
const getRequestHeader = require('getRequestHeader');
const encodeUriComponent = require('encodeUriComponent');
const getCookieValues = require('getCookieValues');
const toBase64 = require('toBase64');
const makeTableMap = require('makeTableMap');
const getRemoteAddress = require('getRemoteAddress');
const getAllEventData = require('getAllEventData');
const eventData = getAllEventData();

const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const containerVersion = getContainerVersion();
const isDebug = containerVersion.debugMode;
const isLoggingEnabled = determinateIsLoggingEnabled();
const traceId = getRequestHeader('trace-id');

const impactNames = {
    'id': 'ItemSku',
    'name': 'ItemName',
    'category': 'ItemCategory',
    'quantity': 'ItemQuantity',
    'price': 'ItemPrice'
};

if (data.type === 'page_view') {
    const url = eventData.page_location || getRequestHeader('referer');

    if (url) {
        const value = parseUrl(url).searchParams[data.clickIdParameterName];

        if (value) {
            const options = {
                domain: 'auto',
                path: '/',
                secure: true,
                httpOnly: false
            };

            if (data.expiration > 0) options['max-age'] = data.expiration;

            setCookie('impact_cid', value, options, false);
        }
    }

    data.gtmOnSuccess();
} else {
    let requestUrl = 'https://api.impact.com/Advertisers/'+enc(data.accountSID)+'/Conversions';
    const requestHeaders = {'Content-Type': 'application/json', 'Accept': 'application/json', 'Authorization': 'Basic '+toBase64(data.accountSID+':'+data.authToken)};
    const postBody = data.additionalParameters ? makeTableMap(data.additionalParameters, 'name', 'value') : {};
    let currencyFromItems = '';
    let couponFromItems = '';

    postBody.ClickId = getCookieValues('impact_cid')[0] || '';
    postBody.EventDate =  'NOW';
    postBody.EventTypeId =  data.eventTypeId;
    postBody.CampaignId =  data.campaignId;
    postBody.OrderId = data.orderId;

    if (data.productArray) {
        for (let i = 0; i < data.productArray.length; i++) {
            if (data.productArray[i].currency) currencyFromItems = data.productArray[i].currency;
            if (data.productArray[i].coupon) couponFromItems = data.productArray[i].coupon;

            if (data.productArray[i].sku)
                postBody[impactNames.id + (i + 1)] = data.productArray[i].sku;
            else if (data.productArray[i].item_sku)
                postBody[impactNames.id + (i +1)] = data.productArray[i].item_sku;
            else if (data.productArray[i].id)
                postBody[impactNames.id + (i +1)] = data.productArray[i].id;
            else if (data.productArray[i].item_id)
                postBody[impactNames.id + (i +1)] = data.productArray[i].item_id;

            if (data.productArray[i].name)
                postBody[impactNames.name + (i +1)] = data.productArray[i].name;
            else if (data.productArray[i].item_name)
                postBody[impactNames.name + (i +1)] = data.productArray[i].item_name;

            if (data.productArray[i].category)
                postBody[impactNames.category + (i +1)] = data.productArray[i].category;
            else if (data.productArray[i].item_category)
                postBody[impactNames.category + (i +1)] = data.productArray[i].item_category;

            if (data.productArray[i].quantity)
                postBody[impactNames.quantity + (i +1)] = data.productArray[i].quantity;

            if (data.productArray[i].price)
                postBody[impactNames.price + (i +1)] = data.productArray[i].price;
        }
    }

    if (!postBody.CurrencyCode) {
        if (eventData.currency) postBody.CurrencyCode = eventData.currency;
        else if (currencyFromItems) postBody.CurrencyCode = currencyFromItems;
    }

    if (!postBody.OrderPromoCode) {
        if (eventData.coupon) postBody.OrderPromoCode = eventData.coupon;
        else if (couponFromItems) postBody.OrderPromoCode = couponFromItems;
    }

    if (!postBody.OrderDiscount) {
        if (eventData.discount) postBody.OrderDiscount = eventData.discount;
    }


    if (data.useIP) {
        postBody.IpAddress = getRemoteAddress();
    }

    if (isLoggingEnabled) {
        logToConsole(JSON.stringify({
            'Name': 'Impact',
            'Type': 'Request',
            'TraceId': traceId,
            'EventName': data.eventName,
            'RequestMethod': 'POST',
            'RequestUrl': requestUrl,
            'RequestBody': postBody,
        }));
    }

    sendHttpRequest(requestUrl, (statusCode, headers, body) => {
        if (isLoggingEnabled) {
            logToConsole(JSON.stringify({
                'Name': 'Impact',
                'Type': 'Response',
                'TraceId': traceId,
                'EventName': data.eventName,
                'ResponseStatusCode': statusCode,
                'ResponseHeaders': headers,
                'ResponseBody': body,
            }));
        }

        if (statusCode >= 200 && statusCode < 300) {
            data.gtmOnSuccess();
        } else {
            data.gtmOnFailure();
        }
    }, {headers: requestHeaders, method: 'POST'}, JSON.stringify(postBody));
}

function enc(value) {
    value = value || '';
    return encodeUriComponent(value);
}

function determinateIsLoggingEnabled() {
    if (!data.logType) {
        return isDebug;
    }

    if (data.logType === 'no') {
        return false;
    }

    if (data.logType === 'debug') {
        return isDebug;
    }

    return data.logType === 'always';
}
