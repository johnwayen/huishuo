/**
 * 本地存储封装
 * - 加 try-catch
 * - 支持 TTL（过期自动失效）
 */

const PREFIX = 'huishuo:'

function set(key, value, ttlMs = 0) {
  try {
    const wrap = { v: value, _exp: ttlMs > 0 ? Date.now() + ttlMs : 0 }
    wx.setStorageSync(PREFIX + key, wrap)
  } catch (err) {
    console.warn('[storage] set 失败', key, err)
  }
}

function get(key, fallback = null) {
  try {
    const wrap = wx.getStorageSync(PREFIX + key)
    if (!wrap) return fallback
    if (wrap._exp && wrap._exp < Date.now()) {
      remove(key)
      return fallback
    }
    return wrap.v
  } catch (err) {
    return fallback
  }
}

function remove(key) {
  try {
    wx.removeStorageSync(PREFIX + key)
  } catch (err) {}
}

function clear() {
  try {
    const info = wx.getStorageInfoSync()
    info.keys
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => wx.removeStorageSync(k))
  } catch (err) {}
}

module.exports = { set, get, remove, clear }
