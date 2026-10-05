import { PgDialect } from "../../artifacts/api-server/node_modules/drizzle-orm/pg-core/index.js";
export const state:any={order:null,refunds:[],transfers:[],open:false};
const dialect=new PgDialect();
const execute=async(query:any)=>{
 const {sql:statement,params}=dialect.sqlToQuery(query);
 if(statement.includes('FROM orders')&&statement.includes('FOR UPDATE'))return {rows:[state.order]};
 if(statement.includes('FROM disputes'))return {rows:state.open?[{id:1}]:[]};
 if(statement.includes('SELECT stripe_account_id'))return {rows:[{stripe_account_id:'acct_test'}]};
 if(statement.includes('SET refunded_total')){state.order.refunded_total=params[0];state.order.seller_net=params[1];state.order.payout_status=params[2];}
 if(statement.includes("SET status='refunded'"))state.order.status='refunded';
 if(statement.includes("SET stripe_transfer_id")){state.order.stripe_transfer_id=params[0];state.order.payout_status='paid';}
 return {rows:[]};
};
export const db={transaction:async(fn:any)=>fn({execute})};
export const stripe:any={
 checkout:{sessions:{retrieve:async()=>({id:'cs_test',payment_status:'paid',currency:'gbp',payment_intent:{id:'pi_test',latest_charge:{id:'ch_test',amount:20570,amount_refunded:state.refunds.reduce((sum:number,r:any)=>sum+r.amount,0)}}})}},
 refunds:{list:()=>({async *[Symbol.asyncIterator](){yield* state.refunds;}}),create:async(data:any)=>{const r={id:`re_${state.refunds.length}`,status:state.refundStatus??'succeeded',...data};state.refunds.push(r);return r;}},
 accounts:{retrieve:async()=>({capabilities:{transfers:'active'},payouts_enabled:true})},
 transfers:{create:async(data:any)=>{const t={id:`tr_${state.transfers.length}`,amount_reversed:0,...data};state.transfers.push(t);return t;},retrieve:async(id:string)=>state.transfers.find((t:any)=>t.id===id),createReversal:async(id:string,data:any)=>{const t=state.transfers.find((t:any)=>t.id===id);t.amount_reversed+=data.amount;return {id:'reversal_test'};}}
};
export const getUncachableStripeClient=async()=>stripe;
export function reset(sellerType='business') {state.order={id:'ORD-TEST',stripe_session_id:'cs_test',price:100,seller_fee:sellerType==='private'?0:8,seller_net:sellerType==='private'?100:92,buyer_protection_fee:sellerType==='private'?5.7:0,buyer_total:sellerType==='private'?105.7:100,delivery_fee:0,fee_policy:'private-buyer-business-seller-v1',seller_email:'seller@example.test',status:'delivered',payout_status:'awaiting_release',refunded_total:0};state.refunds=[];state.transfers=[];state.open=false;state.refundStatus="succeeded";}
