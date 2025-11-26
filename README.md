# Impact tag for Google Tag Manager Server Side

On a **page view** event the Impact tag stores the {clickid} URL parameter inside the `impact_cid` cookie.

On a **conversion** event the Impact tag sends a postback with conversion data to Impact.

- `Impact Account SID` - Impact Cccount ID
- `Auth Token` - you can view and manage your API keys in [the impact.com Platform](https://app.impact.com/secure/advertiser/accountSettings/techintegration/adv-wsapi-table-flow.ihtml)
- `Event Type ID` - Unique identifier for the event type (or action tracker) that tracked this conversion.
- `Program ID` - Unique identifier for the campaign (or program) that the conversion is associated with.
- `Order Id` (**Required**) - Your unique identifier for the order associated with this conversion. For example, in a retail sale, this could be the Order ID you've assigned the customer for their purchase. Note that an `OrderId` value only needs to be unique to the event type (also known as the action tracker).
- `Array of products in UA EE format or GA4 items` - product data
- `Send User IP address` - user IP address

### How to use

- [How to set up Impact server to server conversion tracking](https://stape.io/blog/how-to-set-up-impact-server-to-server-conversion-tracking)

## Open Source

The **Impact Tag for GTM Server Side** is developed and maintained by the [Stape Team](https://stape.io/) under the Apache 2.0 license.
