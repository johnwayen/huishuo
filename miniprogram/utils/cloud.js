/**
 * 云函数调用统一封装
 * - 加 token / loading / 错误处理
 * - 统一返回 { ok, data, err }
 */

/**
 * 调用云函数
 * @param {string} name 云函数名
 * @param {object} data 入参
 * @param {object} options { showLoading, timeout }
 */
async function callFunction(name, data = {}, options = {}) {
  const { showLoading = false, timeout = 30000 } = options
  if (showLoading) wx.showLoading({ title: '加载中', mask: true })
  try {
    const res = await wx.cloud.callFunction({ name, data })
    const result = res.result || {}
    return { ok: result.ok !== false, data: result.data ?? result, raw: result }
  } catch (err) {
    console.error(`[cloud] ${name} 调用失败`, err)
    return { ok: false, err }
  } finally {
    if (showLoading) wx.hideLoading()
  }
}

/**
 * 上传文件到云存储
 * @param {string} filePath 本地路径
 * @param {string} cloudPath 云端路径
 */
async function uploadFile(filePath, cloudPath) {
  try {
    const res = await wx.cloud.uploadFile({ filePath, cloudPath })
    return { ok: true, fileID: res.fileID }
  } catch (err) {
    console.error('[cloud] uploadFile 失败', err)
    return { ok: false, err }
  }
}

/**
 * 获取临时 URL（用于播放云存储的音频）
 */
async function getTempUrl(fileID) {
  try {
    const res = await wx.cloud.getTempFileURL({ fileList: [fileID] })
    return res.fileList[0]?.tempFileURL || ''
  } catch (err) {
    console.error('[cloud] getTempUrl 失败', err)
    return ''
  }
}

module.exports = {
  callFunction,
  uploadFile,
  getTempUrl,
}
