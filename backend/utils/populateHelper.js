const Store = require('../models/Store');
const User = require('../models/User');
const Inventory = require('../models/Inventory');

function pickFields(obj, fields) {
  const result = { _id: obj._id };
  for (const f of fields.split(/\s+/)) {
    if (f && obj[f] !== undefined) result[f] = obj[f];
  }
  return result;
}

async function populateStores(records, selectFields = 'name address manager') {
  if (!records) return records;
  const arr = Array.isArray(records) ? records : [records];
  if (arr.length === 0) return records;

  const storeIds = [...new Set(arr.map(r => r.storeId || (typeof r.store === 'string' ? r.store : null)).filter(Boolean))];
  if (storeIds.length === 0) return records;

  const fields = selectFields.includes('manager') ? selectFields : selectFields + ' manager';
  const stores = await Store.find({ _id: { $in: storeIds } }).select(fields + ' _id').lean();
  const storeMap = {};
  for (const s of stores) {
    storeMap[s._id.toString()] = s;
  }

  for (const r of arr) {
    const sid = String(r.storeId || r.store || '');
    r.store = storeMap[sid] || null;
  }
  return records;
}

async function populateCustomers(orders, selectFields = 'name email') {
  if (!orders) return orders;
  const arr = Array.isArray(orders) ? orders : [orders];
  if (arr.length === 0) return orders;

  const customerIds = [...new Set(arr.map(o => o.customerId || (typeof o.customer === 'string' ? o.customer : null)).filter(Boolean))];
  if (customerIds.length === 0) return orders;

  const users = await User.find({ _id: { $in: customerIds } }).select(selectFields + ' _id').lean();
  const userMap = {};
  for (const u of users) {
    userMap[u._id.toString()] = u;
  }

  for (const o of arr) {
    const cid = String(o.customerId || o.customer || '');
    o.customer = userMap[cid] || null;
  }
  return orders;
}

async function populateOrderItems(orders, selectFields = 'name price sku') {
  if (!orders) return orders;
  const arr = Array.isArray(orders) ? orders : [orders];
  if (arr.length === 0) return orders;

  const allItemIds = new Set();
  for (const o of arr) {
    for (const oi of (o.items || [])) {
      const iid = typeof oi.item === 'object' ? oi.item._id : oi.item;
      if (iid) allItemIds.add(Number(iid));
    }
  }
  if (allItemIds.size === 0) return orders;

  const items = await Inventory.findByIds([...allItemIds]);
  const itemMap = {};
  for (const i of items) {
    itemMap[i._id] = selectFields ? pickFields(i, selectFields) : i;
  }

  for (const o of arr) {
    for (const oi of (o.items || [])) {
      const iid = String(typeof oi.item === 'object' ? oi.item._id : oi.item);
      oi.item = itemMap[iid] || null;
    }
  }
  return orders;
}

module.exports = {
  populateStores,
  populateCustomers,
  populateOrderItems
};
