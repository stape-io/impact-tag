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
const logToConsole = require('logToConsole');
const getContainerVersion = require('getContainerVersion');
const BigQuery = require('BigQuery');
const getTimestampMillis = require('getTimestampMillis');

/*==============================================================================
  Main Execution
==============================================================================*/

const eventData = getAllEventData();

if (!isConsentGivenOrNotRequired(data, eventData)) {
  return data.gtmOnSuccess();
}

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

  return data.gtmOnSuccess();
} else {
  let requestUrl = 'https://api.impact.com/Advertisers/' + enc(data.accountSID) + '/Conversions';
  const requestHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: 'Basic ' + toBase64(data.accountSID + ':' + data.authToken)
  };
  const postBody = data.additionalParameters
    ? makeTableMap(data.additionalParameters, 'name', 'value')
    : {};
  let currencyFromItems = '';
  let couponFromItems = '';
  const impactNames = {
    id: 'ItemSku',
    name: 'ItemName',
    category: 'ItemCategory',
    quantity: 'ItemQuantity',
    price: 'ItemPrice'
  };

  postBody.ClickId = getCookieValues('impact_cid')[0] || '';
  postBody.EventDate = 'NOW';
  postBody.EventTypeId = data.eventTypeId;
  postBody.CampaignId = data.campaignId;
  postBody.OrderId = data.orderId;

  if (data.productArray) {
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

  log({
    Name: 'Impact',
    Type: 'Request',
    EventName: data.eventName,
    RequestMethod: 'POST',
    RequestUrl: requestUrl,
    RequestBody: postBody
  });

  return sendHttpRequest(
    requestUrl,
    (statusCode, headers, body) => {
      log({
        Name: 'Impact',
        Type: 'Response',
        EventName: data.eventName,
        ResponseStatusCode: statusCode,
        ResponseHeaders: headers,
        ResponseBody: body
      });

      if (statusCode >= 200 && statusCode < 300) {
        data.gtmOnSuccess();
      } else {
        data.gtmOnFailure();
      }
    },
    { headers: requestHeaders, method: 'POST' },
    JSON.stringify(postBody)
  );
}

/*==============================================================================
  Helpers
==============================================================================*/

function enc(value) {
  value = value || '';
  return encodeUriComponent(value);
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function log(rawDataToLog) {
  const logDestinationsHandlers = {};
  if (determinateIsLoggingEnabled()) logDestinationsHandlers.console = logConsole;
  if (determinateIsLoggingEnabledForBigQuery()) logDestinationsHandlers.bigQuery = logToBigQuery;

  rawDataToLog.TraceId = getRequestHeader('trace-id');

  const keyMappings = {
    // No transformation for Console is needed.
    bigQuery: {
      Name: 'tag_name',
      Type: 'type',
      TraceId: 'trace_id',
      EventName: 'event_name',
      RequestMethod: 'request_method',
      RequestUrl: 'request_url',
      RequestBody: 'request_body',
      ResponseStatusCode: 'response_status_code',
      ResponseHeaders: 'response_headers',
      ResponseBody: 'response_body'
    }
  };

  for (const logDestination in logDestinationsHandlers) {
    const handler = logDestinationsHandlers[logDestination];
    if (!handler) continue;

    const mapping = keyMappings[logDestination];
    const dataToLog = mapping ? {} : rawDataToLog;

    if (mapping) {
      for (const key in rawDataToLog) {
        const mappedKey = mapping[key] || key;
        dataToLog[mappedKey] = rawDataToLog[key];
      }
    }

    handler(dataToLog);
  }
}

function logConsole(dataToLog) {
  logToConsole(JSON.stringify(dataToLog));
}

function logToBigQuery(dataToLog) {
  const connectionInfo = {
    projectId: data.logBigQueryProjectId,
    datasetId: data.logBigQueryDatasetId,
    tableId: data.logBigQueryTableId
  };

  dataToLog.timestamp = getTimestampMillis();

  ['request_body', 'response_headers', 'response_body'].forEach((p) => {
    dataToLog[p] = JSON.stringify(dataToLog[p]);
  });

  BigQuery.insert(connectionInfo, [dataToLog], { ignoreUnknownValues: true });
}

function determinateIsLoggingEnabled() {
  const containerVersion = getContainerVersion();
  const isDebug = !!(
    containerVersion &&
    (containerVersion.debugMode || containerVersion.previewMode)
  );

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

function determinateIsLoggingEnabledForBigQuery() {
  if (data.bigQueryLogType === 'no') return false;
  return data.bigQueryLogType === 'always';
}
