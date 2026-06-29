const MysqlStore = require('../models/MysqlStore');
const MysqlUser = require('../models/MysqlUser');
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

  const storeIds = [...new Set(arr.map(r => {
    const raw = r.storeId ?? (typeof r.store === 'object' ? null : r.store);
    return raw ? Number(raw) : null;
  }).filter(Boolean))];
  if (storeIds.length === 0) return records;

  const stores = await MysqlStore.findByIds(storeIds);
  const fields = selectFields.includes('manager') ? selectFields : selectFields + ' manager';
  const storeMap = {};
  for (const s of stores) {
    storeMap[s._id] = pickFields(s, fields);
  }

  for (const r of arr) {
    const sid = String(r.storeId || r.store || '');
    r.store = storeMap[sid] || null;
  }
  return records;
}

async function populateManagers(stores, selectFields = 'name email') {
  if (!stores) return stores;
  const arr = Array.isArray(stores) ? stores : [stores];
  if (arr.length === 0) return stores;

  const managerIds = [...new Set(arr.map(s => Number(s.manager)).filter(Boolean))];
  if (managerIds.length === 0) return stores;

  const managers = await MysqlUser.findByIds(managerIds);
  const managerMap = {};
  for (const m of managers) {
    managerMap[m._id] = pickFields(m, selectFields);
  }

  for (const s of arr) {
    s.manager = managerMap[String(s.manager)] || null;
  }
  return stores;
}

async function populateCustomers(orders, selectFields = 'name email') {
  if (!orders) return orders;
  const arr = Array.isArray(orders) ? orders : [orders];
  if (arr.length === 0) return orders;

  const customerIds = [...new Set(arr.map(o => {
    const raw = o.customerId ?? (typeof o.customer === 'object' ? null : o.customer);
    return raw ? Number(raw) : null;
  }).filter(Boolean))];
  if (customerIds.length === 0) return orders;

  const users = await MysqlUser.findByIds(customerIds);
  const userMap = {};
  for (const u of users) {
    userMap[u._id] = pickFields(u, selectFields);
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
  populateManagers,
  populateCustomers,
  populateOrderItems
};
