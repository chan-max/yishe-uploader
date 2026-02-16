/**
 * 咸鱼发布功能 - 完整实现
 * 专门处理咸鱼（二手交易平台）的发布逻辑
 * 
 * 支持：
 * - 商品信息（标题、描述）
 * - 多张图片上传（最多9张）
 * - 分类设置
 * - 价格设置
 * - 物品状态（全新/99新/二手等）
 * - 交易方式（线上/线下）
 * - 地理位置设置
 */

import { getOrCreateBrowser } from '../services/BrowserService.js'
import { PageOperator } from '../services/PageOperator.js'
import { logger } from '../utils/logger.js'

class XianyuPublisher {
  constructor() {
    this.platformName = '咸鱼'
    this.uploadUrl = 'https://www.goofish.com/publish'
    this.pageOperator = new PageOperator()

    // 咸鱼特定的配置
    this.config = {
      maxImages: 9,
      supportedImageFormats: ['jpg', 'jpeg', 'png', 'webp'],
      conditionOptions: {
        new: '全新',
        'like-new': '99新',
        used: '二手',
        damaged: '有瑕疵'
      },
      tradeMethodOptions: {
        online: '线上交易',
        offline: '线下交易',
        both: '线上线下都可'
      }
    }
  }

  /**
   * 发布到咸鱼
   */
  async publish(publishInfo) {
    let page = null
    try {
      logger.info(`开始执行${this.platformName}发布操作`)

      // 合并平台特定配置 (个性配置)
      const settings = publishInfo.platformSettings?.xianyu || {}
      const price = settings.price || publishInfo.price
      const category = settings.category || publishInfo.category
      const condition = settings.condition || publishInfo.condition
      const tradeMethod = settings.tradeMethod || publishInfo.tradeMethod
      const location = settings.location || publishInfo.location

      // 1. 获取浏览器和页面
      const browser = await getOrCreateBrowser()
      page = await browser.newPage()
      logger.info('新页面创建成功')

      // 2. 导航到发布页面
      logger.info(`正在导航至: ${this.uploadUrl}`)
      await page.goto(this.uploadUrl, {
        waitUntil: 'load',
        timeout: 60000
      })

      // 增加导航后的硬性等待时间，确保动态加载的内容（如用户信息）开始加载
      logger.info('等待页面加载和动态内容初始化...')
      await page.waitForTimeout(5000)
      logger.info(`已打开${this.platformName}发布页面`)

      // 3. 检查登录状态
      const isLoggedIn = await this._checkLogin(page)
      if (!isLoggedIn) {
        throw new Error(`${this.platformName}未登录，请先登录`)
      }
      logger.info('登录状态检查通过')

      // 4. 等待发布表单加载
      await this._waitForFormLoaded(page)
      logger.info('发布表单加载完成')

      // 5. 填充内容（咸鱼标题和描述在一个编辑器里）
      await this._fillProductInfo(page, publishInfo)
      logger.info('商品信息填充完成')

      // 6. 上传图片（咸鱼逻辑：使用 filePath）
      const filePath = publishInfo.filePath || publishInfo.videoUrl
      if (filePath) {
        await this._uploadImages(page, filePath)
        logger.info(`已上传文件`)
      } else {
        logger.warn('未提供文件路径，跳过上传')
      }

      // 7. 设置商品分类
      if (category) {
        await this._setCategory(page, category)
        logger.info('分类设置完成')
      }

      // 8. 设置价格
      if (!price) {
        logger.error('未找到价格信息，publishInfo:', JSON.stringify(publishInfo))
        throw new Error('咸鱼发布必须提供价格信息(price)，请在个性配置中设置')
      }
      await this._setPrice(page, price)
      logger.info('价格设置完成')

      // 9. 设置物品状态
      if (condition) {
        await this._setCondition(page, condition)
        logger.info('物品状态设置完成')
      }

      // 10. 设置交易方式
      if (tradeMethod) {
        await this._setTradeMethod(page, tradeMethod)
        logger.info('交易方式设置完成')
      }

      // 11. 设置地理位置
      if (location) {
        await this._setLocation(page, location)
        logger.info('地理位置设置完成')
      }

      // 12. 最终检查并发布
      await this._submitPublish(page)
      logger.info(`${this.platformName}发布成功`)

      return {
        success: true,
        message: `${this.platformName}商品发布成功`
      }
    } catch (error) {
      logger.error(`${this.platformName}发布失败:`, error)
      return {
        success: false,
        message: `发布失败: ${error.message}`
      }
    } finally {
      if (page) {
        try {
          await page.close()
        } catch (e) {
          logger.error('关闭页面失败:', e)
        }
      }
    }
  }

  /**
   * 检查登录状态
   */
  async _checkLogin(page) {
    try {
      logger.info('正在检查登录状态...')

      // 等待可能的登录指示器出现
      // 咸鱼有时会先显示空白或加载中，所以我们等待一下
      await page.waitForTimeout(2000)

      // 尝试等待登录状态稳定
      // 检查是否存在登录按钮 (未登录指标)
      const loginSelectors = [
        '.login-btn',
        '.login-button',
        '.auth-btn',
        '.login-text',
        '.login-entry',
        'text=登录/注册',
        'text=请登录'
      ]

      // 检查是否存在用户信息 (已登录指标)
      const loggedInSelectors = [
        '[class^="user-order-container"] img',
        '.user-avatar',
        '.user-info',
        '.header-user',
        '.profile-avatar',
        '.nickname'
      ]

      // 循环检查几次，给页面加载动态脚本和登录信息的时间
      for (let i = 0; i < 5; i++) {
        // 查找登录按钮
        for (const selector of loginSelectors) {
          const count = await page.locator(selector).count()
          if (count > 0) {
            logger.warn(`发现登录标识: ${selector}，判定为未登录`)
            return false
          }
        }

        // 查找已登录标识
        for (const selector of loggedInSelectors) {
          const count = await page.locator(selector).count()
          if (count > 0) {
            logger.info(`发现用户信息标识: ${selector}，判定为已登录`)
            return true
          }
        }

        logger.info(`等待登录信息加载中... (${i + 1}/5)`)
        await page.waitForTimeout(2000)
      }

      logger.warn('无法明确判断登录状态，默认认为未登录')
      return false
    } catch (error) {
      logger.warn('检查登录状态异常:', error)
      return false
    }
  }

  /**
   * 等待发布表单加载
   */
  async _waitForFormLoaded(page) {
    try {
      // 等待编辑器出现
      await page.waitForSelector(
        '[class^="editor"], .product-title',
        { timeout: 15000 }
      )
      await page.waitForTimeout(1000)
    } catch (error) {
      logger.warn('等待表单加载超时，继续流程:', error.message)
    }
  }

  /**
   * 填充商品信息（标题和描述）
   */
  async _fillProductInfo(page, publishInfo) {
    try {
      // 填充描述（咸鱼主编辑器，用户提供 class="editor--MtHPS94K"）
      if (publishInfo.description || publishInfo.title) {
        const content = publishInfo.description || publishInfo.title
        const editorSelector = '[class^="editor"]'

        try {
          const count = await page.locator(editorSelector).count()
          if (count > 0) {
            // 点击编辑器并输入内容
            await page.click(editorSelector)
            await page.fill(editorSelector, content)
            logger.info('编辑器内容填充成功')
          } else {
            logger.warn('未找到主编辑器输入框 [class^="editor"]')
          }
        } catch (e) {
          logger.error('填充编辑器失败:', e.message)
        }
      }

      await page.waitForTimeout(1000)
    } catch (error) {
      logger.error('填充商品信息失败:', error)
    }
  }

  /**
   * 上传图片
   */
  async _uploadImages(page, filePath) {
    try {
      if (!filePath) {
        logger.warn('文件路径为空，跳过上传')
        return
      }

      logger.info(`准备上传文件: ${filePath}`)

      // 找到触发上传的元素 (用户提供: class="upload-item--VvK_FTdU")
      const uploadTrigger = '[class^="upload-item"]'

      // 等待上传触发元素出现
      try {
        await page.waitForSelector(uploadTrigger, { timeout: 5000 })
      } catch (e) {
        logger.warn('未找到上传触发元素 [class^="upload-item"]')
        return
      }

      const triggerCount = await page.locator(uploadTrigger).count()
      logger.info(`找到 ${triggerCount} 个上传触发元素`)

      if (triggerCount === 0) {
        logger.warn('未找到上传触发元素')
        return
      }

      // 监听文件选择器事件
      logger.info('点击上传触发元素...')
      const fileChooserPromise = page.waitForEvent('filechooser', { timeout: 10000 })
      await page.click(uploadTrigger)

      logger.info('等待文件选择器...')
      const fileChooser = await fileChooserPromise

      logger.info(`设置文件: ${filePath}`)
      await fileChooser.setFiles(filePath)
      logger.info('文件上传请求已发送')

      // 等待上传完成
      await page.waitForTimeout(3000)
      logger.success('文件上传完成')
    } catch (error) {
      logger.error('上传文件异常:', error.message)
      logger.error('错误详情:', error)
    }
  }

  /**
   * 设置商品分类
   */
  async _setCategory(page, category) {
    try {
      const categorySelectors = [
        'select[name*="category"]',
        'select.category-select',
        '[role="combobox"]'
      ]

      for (const selector of categorySelectors) {
        try {
          const count = await page.locator(selector).count()
          if (count > 0) {
            await page.selectOption(selector, { label: category })
            logger.info(`分类设置为: ${category}`)
            return
          }
        } catch (e) {
          // 继续尝试
        }
      }

      logger.warn('未找到分类选择框')
    } catch (error) {
      logger.warn('设置分类失败:', error.message)
    }
  }

  /**
   * 设置价格
   */
  async _setPrice(page, price) {
    try {
      const priceSelectors = [
        '.ant-input.css-d5i8y5',
        'input[placeholder*="价格"]'
      ]

      for (const selector of priceSelectors) {
        try {
          const count = await page.locator(selector).count()
          if (count > 0) {
            await page.fill(selector, String(price))
            logger.info(`价格设置为: ¥${price}`)
            return
          }
        } catch (e) {
          // 继续尝试
        }
      }

      logger.warn('未找到价格输入框')
    } catch (error) {
      logger.warn('设置价格失败:', error.message)
    }
  }

  /**
   * 设置物品状态（全新/99新/二手等）
   */
  async _setCondition(page, condition) {
    try {
      const conditionLabel = this.config.conditionOptions[condition] || condition

      const conditionSelectors = [
        'select[name*="condition"]',
        'select.condition-select',
        '[data-testid*="condition"]'
      ]

      for (const selector of conditionSelectors) {
        try {
          const count = await page.locator(selector).count()
          if (count > 0) {
            await page.selectOption(selector, { label: conditionLabel })
            logger.info(`物品状态设置为: ${conditionLabel}`)
            return
          }
        } catch (e) {
          // 继续尝试
        }
      }

      logger.warn('未找到物品状态选择框')
    } catch (error) {
      logger.warn('设置物品状态失败:', error.message)
    }
  }

  /**
   * 设置交易方式
   */
  async _setTradeMethod(page, tradeMethod) {
    try {
      const methodLabel = this.config.tradeMethodOptions[tradeMethod] || tradeMethod

      // 尝试点击对应的单选框
      const radioButtons = await page.$$('input[type="radio"], .radio-button, [role="radio"]')

      for (const button of radioButtons) {
        try {
          const label = await page.evaluate(
            el => el.textContent || el.getAttribute('aria-label') || el.title,
            button
          )

          if (label && label.includes(methodLabel)) {
            await button.click()
            logger.info(`交易方式设置为: ${methodLabel}`)
            return
          }
        } catch (e) {
          // 继续尝试
        }
      }

      logger.warn('未找到交易方式选择框')
    } catch (error) {
      logger.warn('设置交易方式失败:', error.message)
    }
  }

  /**
   * 设置地理位置
   */
  async _setLocation(page, location) {
    try {
      const locationSelectors = [
        'input[placeholder*="位置"]',
        'input[placeholder*="地区"]',
        'input[name*="location"]',
        'input.location-input'
      ]

      for (const selector of locationSelectors) {
        try {
          const count = await page.locator(selector).count()
          if (count > 0) {
            await page.fill(selector, location)
            logger.info(`位置设置为: ${location}`)

            // 等待位置建议加载
            await page.waitForTimeout(1000)

            // 尝试选择第一个建议
            const suggestions = await page.$$('.location-suggestion, .suggestion-item, .suggestion')
            if (suggestions.length > 0) {
              await suggestions[0].click()
              logger.info('已选择位置建议')
            }

            return
          }
        } catch (e) {
          // 继续尝试
        }
      }

      logger.warn('未找到位置输入框')
    } catch (error) {
      logger.warn('设置位置失败:', error.message)
    }
  }

  /**
   * 提交发布
   */
  async _submitPublish(page) {
    try {
      // 查找发布按钮
      const publishButtonSelectors = [
        'button:has-text("发布")',
        'button[type="primary"]',
        'button.next-btn-primary',
        'button.btn-primary',
        '.publish-btn',
        'button:has-text("确认发布")'
      ]

      let clicked = false

      for (const selector of publishButtonSelectors) {
        try {
          const buttons = await page.$$(selector)

          // 找最后一个按钮（通常是真正的发布按钮）
          if (buttons.length > 0) {
            const lastButton = buttons[buttons.length - 1]
            const text = await lastButton.textContent()

            if (text && (text.includes('发布') || text.includes('确认'))) {
              await lastButton.click()
              clicked = true
              logger.info('已点击发布按钮')
              break
            }
          }
        } catch (e) {
          // 继续尝试
        }
      }

      if (!clicked) {
        logger.warn('未找到明确的发布按钮')
        // 尝试通过 Enter 键提交
        await page.keyboard.press('Enter')
      }

      // 再等待一段时间确保发布完成
      await page.waitForTimeout(3000)

      // 尝试检测成功提示
      try {
        const successElements = await page.$$(
          'text=发布成功, text=成功, .success-message, .success, [class*="success"]'
        )
        if (successElements.length > 0) {
          logger.info('检测到发布成功提示')
        }
      } catch (e) {
        logger.info('未检测到明确的成功提示，但发布流程已执行')
      }
    } catch (error) {
      logger.error('提交发布失败:', error)
    }
  }
}

export const xianyuPublisher = new XianyuPublisher()

/**
 * 发布到咸鱼
 */
export async function publishToXianyu(publishInfo) {
  return await xianyuPublisher.publish(publishInfo)
}

export default xianyuPublisher
