# Impact tag for Google Tag Manager Server Side

## Configuration

### Event types

- On a **Page View** event the Impact tag stores the `im_ref` URL parameter inside the `impact_cid` cookie.

- On a **Conversion** event the Impact tag sends a postback with conversion data to Impact.
  - `Impact Account SID` - Impact Account SID
  - `Auth Token` - you can view and manage your API keys in [the impact.com Platform](https://app.impact.com/secure/advertiser/accountSettings/techintegration/adv-wsapi-table-flow.ihtml)
  - `Event Type ID` - Unique identifier for the event type (or action tracker) that tracked this conversion.
  - `Campaign/Program ID` - Unique identifier for the campaign (or program) that the conversion is associated with.
  - `Order ID` (**Required**) - Your unique identifier for the order associated with this conversion. For example, in a retail sale, this could be the Order ID you've assigned the customer for their purchase. Note that an `OrderId` value only needs to be unique to the event type (also known as the action tracker).
  - `Array of products` - product data in GA4 `items` or UA `products` format
  - `Send User IP address` - user IP address
  - `Attribution Keys` - at least one attribution key is required. When **Automap Attribution Keys** is enabled (default), the tag reads the `impact_cid` cookie as the Click ID automatically. Any value entered manually always overrides the auto-mapped one. Supported keys: Click ID, Customer Email, Customer ID, Custom Profile ID, Order Promo Code, Unique URL, Google Advertising ID, Apple IDFA, Apple IDFV, Media ID, Phone Number, Caller ID.
  - `Additional Parameters` - key/value table for sending any extra parameters supported by the Impact Conversions API.

### How to use

- [How to set up Impact server to server conversion tracking](https://stape.io/blog/how-to-set-up-impact-server-to-server-conversion-tracking)

## Open Source

The **Impact Tag for GTM Server Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.

### GTM Gallery Status
🟢 [Listed](https://tagmanager.google.com/gallery/#/owners/stape-io/templates/impact-tag)
