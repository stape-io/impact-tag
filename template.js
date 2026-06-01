const JSON = require('JSON');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getRemoteAddress = require('getRemoteAddress');
const getRequestHeader = require('getRequestHeader');
const getTimestampMillis = require('getTimestampMillis');
const getType = require('getType');
const makeTableMap = require('makeTableMap');
const makeNumber = require('makeNumber');
const makeString = require('makeString');
const Math = require('Math');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');
const toBase64 = require('toBase64');

/*==============================================================================
  Main Execution
==============================================================================*/

const eventData = getAllEventData();
const url = eventData.page_location || getRequestHeader('referer');

if (!isConsentGivenOrNotRequired(data, eventData)) {
  return data.gtmOnSuccess();
}

if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
  return data.gtmOnSuccess();
}

if (data.type === 'page_view') {
  if (url) {
    const value = parseUrl(url).searchParams[data.clickIdParameterName || 'im_ref'];

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

  return data.gtmOnSuccess();
} else {
  const requestUrl = 'https://api.impact.com/Advertisers/' + enc(data.accountSID) + '/Conversions';
  const requestOptions = {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: 'Basic ' + toBase64(data.accountSID + ':' + data.authToken)
    },
    method: 'POST'
  };
  const postBody = data.additionalParameters
    ? makeTableMap(data.additionalParameters, 'name', 'value')
    : {};
  const timestamp = data.overrideTimestamp ? data.customTimestamp : getTimestampMillis();
  postBody.EventDate = convertTimestampToISO(timestamp);
  postBody.EventTypeId = data.eventTypeId;
  postBody.CampaignId = data.campaignId;
  postBody.OrderId = data.orderId;

  let currencyFromItems = '';
  let couponFromItems = '';
  if (getType(data.productArray) === 'array' && data.productArray.length) {
    const impactNames = {
      id: 'ItemSku',
      name: 'ItemName',
      category: 'ItemCategory',
      quantity: 'ItemQuantity',
      price: 'ItemPrice'
    };

    for (let i = 0; i < data.productArray.length; i++) {
      if (data.productArray[i].currency) currencyFromItems = data.productArray[i].currency;
      if (data.productArray[i].coupon) couponFromItems = data.productArray[i].coupon;

      if (data.productArray[i].sku) postBody[impactNames.id + (i + 1)] = data.productArray[i].sku;
      else if (data.productArray[i].item_sku)
        postBody[impactNames.id + (i + 1)] = data.productArray[i].item_sku;
      else if (data.productArray[i].id)
        postBody[impactNames.id + (i + 1)] = data.productArray[i].id;
      else if (data.productArray[i].item_id)
        postBody[impactNames.id + (i + 1)] = data.productArray[i].item_id;

      if (data.productArray[i].name)
        postBody[impactNames.name + (i + 1)] = data.productArray[i].name;
      else if (data.productArray[i].item_name)
        postBody[impactNames.name + (i + 1)] = data.productArray[i].item_name;

      if (data.productArray[i].category)
        postBody[impactNames.category + (i + 1)] = data.productArray[i].category;
      else if (data.productArray[i].item_category)
        postBody[impactNames.category + (i + 1)] = data.productArray[i].item_category;

      if (data.productArray[i].quantity)
        postBody[impactNames.quantity + (i + 1)] = data.productArray[i].quantity;

      if (data.productArray[i].price)
        postBody[impactNames.price + (i + 1)] = data.productArray[i].price;
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

  // Attribution Keys

  const autoMapAttributionKeys = data.hasOwnProperty('autoMapAttributionKeys')
    ? data.autoMapAttributionKeys
    : true; // To avoid a breaking change.

  postBody.ClickId = autoMapAttributionKeys ? getCookieValues('impact_cid')[0] || '' : '';

  if (data.attributionKeys) {
    data.attributionKeys.forEach((d) => (postBody[d.name] = d.value));
  }

  return sendHttpRequest(requestUrl, requestOptions, JSON.stringify(postBody))
    .then((response) => {
      return response.statusCode >= 200 && response.statusCode < 300
        ? data.gtmOnSuccess()
        : data.gtmOnFailure();
    })
    .catch((error) => {
      return data.gtmOnFailure();
    });
}

/*==============================================================================
  Helpers
==============================================================================*/

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
}

function convertTimestampToISO(timestamp) {
  if (getType(timestamp) === 'string' && !timestamp.match('^[0-9]+$')) {
    timestamp = getTimestampMillis();
  }

  let numberTimestamp = makeNumber(timestamp);

  if (getType(numberTimestamp) !== 'number' || numberTimestamp <= 0) {
    numberTimestamp = getTimestampMillis();
  }

  const secToMs = function (s) {
    return s * 1000;
  };
  const minToMs = function (m) {
    return m * secToMs(60);
  };
  const hoursToMs = function (h) {
    return h * minToMs(60);
  };
  const daysToMs = function (d) {
    return d * hoursToMs(24);
  };
  const format = function (value) {
    return value >= 10 ? makeString(value) : '0' + makeString(value);
  };

  const fourYearsInMs = daysToMs(365 * 4 + 1);
  let year = 1970 + Math.floor(numberTimestamp / fourYearsInMs) * 4;
  numberTimestamp = numberTimestamp % fourYearsInMs;

  while (true) {
    const isLeapYear = !(year % 4);
    const nextTimestamp = numberTimestamp - daysToMs(isLeapYear ? 366 : 365);
    if (nextTimestamp < 0) {
      break;
    }
    numberTimestamp = nextTimestamp;
    year = year + 1;
  }

  const daysByMonth =
    year % 4 === 0
      ? [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
      : [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  let month = 0;
  for (let i = 0; i < daysByMonth.length; i++) {
    const msInThisMonth = daysToMs(daysByMonth[i]);
    if (numberTimestamp > msInThisMonth) {
      numberTimestamp = numberTimestamp - msInThisMonth;
    } else {
      month = i + 1;
      break;
    }
  }

  const date = Math.ceil(numberTimestamp / daysToMs(1));
  numberTimestamp = numberTimestamp - daysToMs(date - 1);

  const hours = Math.floor(numberTimestamp / hoursToMs(1));
  numberTimestamp = numberTimestamp - hoursToMs(hours);

  const minutes = Math.floor(numberTimestamp / minToMs(1));
  numberTimestamp = numberTimestamp - minToMs(minutes);

  const sec = Math.floor(numberTimestamp / secToMs(1));

  return (
    year +
    '-' +
    format(month) +
    '-' +
    format(date) +
    'T' +
    format(hours) +
    ':' +
    format(minutes) +
    ':' +
    format(sec) +
    '+00:00'
  );
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}
