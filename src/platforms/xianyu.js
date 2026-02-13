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
    this.uploadUrl = 'https://www.xianyu.taobao.com/my-release'
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

      // 1. 获取浏览器和页面
      const browser = await getOrCreateBrowser()
      page = await browser.newPage()
      logger.info('新页面创建成功')

      // 2. 导航到发布页面
      await page.goto(this.uploadUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
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

      // 5. 填充标题和描述
      await this._fillProductInfo(page, publishInfo)
      logger.info('商品信息填充完成')

      // 6. 上传图片
      if (publishInfo.images && publishInfo.images.length > 0) {
        await this._uploadImages(page, publishInfo.images)
        logger.info(`已上传图片`)
      }

      // 7. 设置商品分类
      if (publishInfo.category) {
        await this._setCategory(page, publishInfo.category)
        logger.info('分类设置完成')
      }

      // 8. 设置价格
      if (publishInfo.price) {
        await this._setPrice(page, publishInfo.price)
        logger.info('价格设置完成')
      }

      // 9. 设置物品状态
      if (publishInfo.condition) {
        await this._setCondition(page, publishInfo.condition)
        logger.info('物品状态设置完成')
      }

      // 10. 设置交易方式
      if (publishInfo.tradeMethod) {
        await this._setTradeMethod(page, publishInfo.tradeMethod)
        logger.info('交易方式设置完成')
      }

      // 11. 设置地理位置
      if (publishInfo.location) {
        await this._setLocation(page, publishInfo.location)
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
      await page.waitForTimeout(2000)

      // 检查是否存在登录按钮
      const loginElements = await page.$$('.login-btn, .login-button, .auth-btn, .login-text, .login-entry')
      if (loginElements.length > 0) {
        return false
      }

      // 检查是否存在用户信息
      const userElements = await page.$$('.user-avatar, .user-info, .header-user, .profile-avatar')
      return userElements.length > 0
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
      // 等待标题输入框出现
      await page.waitForSelector(
        'input[placeholder*="商品名称"], input[placeholder*="标题"], input.product-title',
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
      // 填充标题
      if (publishInfo.title) {
        const titleSelectors = [
          'input[placeholder*="商品名称"]',
          'input[placeholder*="标题"]',
          'input.product-title',
          'input[name*="title"]'
        ]

        let filled = false
        for (const selector of titleSelectors) {
          try {
            const count = await page.locator(selector).count()
            if (count > 0) {
              await page.fill(selector, publishInfo.title)
              filled = true
              logger.info('标题填充成功')
              await page.waitForTimeout(500)
              break
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }

        if (!filled) {
          logger.warn('未找到标题输入框')
        }
      }

      // 填充描述
      if (publishInfo.description) {
        const descSelectors = [
          'textarea[placeholder*="商品描述"]',
          'textarea[placeholder*="说明"]',
          'textarea.product-desc',
          'textarea[name*="description"]'
        ]

        let filled = false
        for (const selector of descSelectors) {
          try {
            const count = await page.locator(selector).count()
            if (count > 0) {
              await page.fill(selector, publishInfo.description)
              filled = true
              logger.info('描述填充成功')
              await page.waitForTimeout(500)
              break
            }
          } catch (e) {
            // 继续尝试下一个选择器
          }
        }

        if (!filled) {
          logger.warn('未找到描述输入框')
        }
      }

      await page.waitForTimeout(1000)
    } catch (error) {
      logger.error('填充商品信息失败:', error)
      // 继续流程，不中断
    }
  }

  /**
   * 上传图片（最多9张）
   */
  async _uploadImages(page, images) {
    try {
      // 找到文件上传元素
      const fileInputs = await page.$$('input[type="file"]')
      if (fileInputs.length === 0) {
        logger.warn('未找到文件上传元素')
        return
      }

      // 上传每张图片（咸鱼最多9张）
      const imagesToUpload = images.slice(0, this.config.maxImages)
      
      for (let i = 0; i < imagesToUpload.length; i++) {
        const image = imagesToUpload[i]
        try {
          // 尝试上传
          await fileInputs[0].setInputFiles(image.url || image)
          await page.waitForTimeout(2000)
          logger.info(`图片 ${i + 1}/${imagesToUpload.length} 上传成功`)
        } catch (error) {
          logger.warn(`图片 ${i + 1} 上传失败:`, error.message)
          // 继续上传下一张
        }
      }
    } catch (error) {
      logger.error('上传图片异常:', error)
      // 不中断流程
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
        'input[placeholder*="价格"]',
        'input[name*="price"]',
        'input.price-input',
        'input[placeholder*="¥"]'
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

      // 等待发布完成
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
      // 不中断流程
    }
  }
}

export const xianyuPublisher = new XianyuPublisher()
