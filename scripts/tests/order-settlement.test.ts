import test from 'node:test';
import assert from 'node:assert/strict';
import { refundOrder,releaseOrderPayout } from '../../artifacts/api-server/src/lib/orderSettlement.js';
import { reset,state } from './settlement-fixtures.js';
test('business seller transfer is £92 and repeat release creates no second transfer',async()=>{reset();await releaseOrderPayout('ORD-TEST');assert.equal(state.transfers[0].amount,9200);await releaseOrderPayout('ORD-TEST');assert.equal(state.transfers.length,1);});
test('personal seller transfer preserves full £100 item price',async()=>{reset('private');await releaseOrderPayout('ORD-TEST');assert.equal(state.transfers[0].amount,10000);});
test('refund cannot consume another order’s share of the same payment',async()=>{reset();await assert.rejects(()=>refundOrder('ORD-TEST',100.01));assert.equal(state.refunds.length,0);});
test('full personal refund includes buyer protection, not unrelated basket items',async()=>{reset('private');const result=await refundOrder('ORD-TEST');assert.equal(result.amount,105.7);assert.equal(state.order.status,'refunded');assert.equal(state.order.seller_net,0);});
test('partial refund keeps remaining proceeds and does not mark whole order refunded',async()=>{reset();const result=await refundOrder('ORD-TEST',25);assert.equal(result.full,false);assert.equal(state.order.seller_net,69);assert.equal(state.order.status,'delivered');});
test('refund after payout reverses only the corresponding net seller amount',async()=>{reset();await releaseOrderPayout('ORD-TEST');await refundOrder('ORD-TEST',25);assert.equal(state.transfers[0].amount_reversed,2300);assert.equal(state.order.seller_net,69);});
test('open disputes and undelivered orders block release',async()=>{reset();state.open=true;await assert.rejects(()=>releaseOrderPayout('ORD-TEST'));assert.equal(state.transfers.length,0);reset();state.order.status='confirmed';await assert.rejects(()=>releaseOrderPayout('ORD-TEST'));});
test('historical payouts are not automatically paid again',async()=>{reset();state.order.fee_policy='legacy';await assert.rejects(()=>releaseOrderPayout('ORD-TEST'));assert.equal(state.transfers.length,0);});

test('pending refunds hold payout and do not reverse a seller transfer prematurely',async()=>{reset();await releaseOrderPayout('ORD-TEST');state.refundStatus='pending';const result=await refundOrder('ORD-TEST',25);assert.equal(result.pending,true);assert.equal(state.transfers[0].amount_reversed,0);assert.equal(state.order.payout_status,'refund_pending');await assert.rejects(()=>releaseOrderPayout('ORD-TEST'));});
