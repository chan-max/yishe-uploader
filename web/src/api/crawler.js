import request from './index.js'

/**
 * 获取爬虫健康状态
 */
export function getCrawlerHealth() {
  return request.get('/crawler/health')
}

/**
 * 获取可用爬虫站点列表
 */
export function getCrawlerSites() {
  return request.get('/crawler/sites')
}

/**
 * 通用 URL 抓取
 */
export function crawlUrl(config) {
  return request.post('/crawler/url', config)
}

/**
 * 执行指定站点爬虫
 */
export function runSiteCrawler(site, params = {}) {
  return request.post('/crawler/run', {
    site,
    params
  })
}

/**
 * 执行 Sora 爬虫
 */
export function crawlSoraImages(maxImages = 20) {
  return runSiteCrawler('sora', { maxImages })
}
