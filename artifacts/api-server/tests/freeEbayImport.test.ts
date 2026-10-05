import { strict as assert } from "node:assert";
import { test } from "node:test";
import { validateOwnEbayItems } from "../src/lib/freeEbayImport.js";
import { parseEbayCsv } from "../../sellbuydeal/src/lib/ebayCsv.js";
const item = { itemId: "123456789012", title: "My item", price: 12.5, quantity: 2, currency: "GBP", image: "", description: "", condition: "used" };
test("CSV supports real export headers, BOM, commas, escaped quotes and multiline descriptions", () => {
  const csv='\uFEFFReport generated\nItem number,Title,Current price,Currency,Available quantity,Description\r\n123456789012,"My, item",£12.50,GBP,2,"A ""good"" item\nwith details"';
  const rows = parseEbayCsv(csv); assert.equal(rows.length,1); assert.equal(rows[0].title,"My, item"); assert.equal(rows[0].description,'A "good" item\nwith details'); assert.equal(rows[0].price,12.5); assert.equal(rows[0].quantity,2);
});
test("bad CSV rows cannot silently become zero-price or sold-out listings", () => {
  for (const csv of ['Item number,Title,Current price\n123456789012,Item,no price','Item number,Title,Current price,Available quantity\n123456789012,Item,10,0','Title,Price\nItem,10','Item number,Title,Price\n123456789012,"Unfinished,10']) assert.throws(()=>parseEbayCsv(csv));
});
test("server rejects invalid amounts, quantities, currencies and external image URLs", () => {
  assert.equal(validateOwnEbayItems([item])[0].price,12.5);
  for(const patch of [{price:NaN},{price:-1},{quantity:0},{quantity:1.5},{currency:"XXX"},{itemId:"bad"},{image:"https://evil.example/a.png"},{image:"http://i.ebayimg.com/a.png"},{image:"https://ebayimg.com.evil.example/a.png"}]) assert.throws(()=>validateOwnEbayItems([{...item,...patch}]));
  assert.equal(validateOwnEbayItems([{...item,image:"https://i.ebayimg.com/images/a.jpg"}])[0].quantity,2);
  assert.throws(()=>validateOwnEbayItems(Array(51).fill(item)));
});
