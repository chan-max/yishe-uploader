/**
 * 文件工具函数
 */

import { join as pathJoin, extname } from 'path';
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs';
import { logger } from './logger.js';

/**
 * 确保目录存在
 */
export function ensureDir(dirPath) {
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
    logger.debug('创建目录:', dirPath);
  }
  return dirPath;
}

/**
 * 获取临时目录路径
 */
export function getTempDir() {
  const tempDir = pathJoin(process.cwd(), 'temp');
  return ensureDir(tempDir);
}

/**
 * 下载图片到临时目录
 */
export async function downloadImageToTemp(imageUrl, filename) {
  try {
    const tempDir = getTempDir();
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.statusText}`);
    }
    
    const buffer = await response.arrayBuffer();

    // 提取扩展名：优先从 pathname 获取，其次从 content-type 推断，最后默认 jpg
    let extension = 'jpg';
    try {
      const urlObj = new URL(imageUrl);
      const pathExt = extname(urlObj.pathname).replace('.', '').toLowerCase();
      if (pathExt && pathExt.length <= 5) {
        extension = pathExt;
      }
    } catch {}
    if (extension === 'jpg' || extension === '') {
      const ct = response.headers?.get?.('content-type') || '';
      if (ct.includes('png')) extension = 'png';
      else if (ct.includes('jpeg') || ct.includes('jpg')) extension = 'jpg';
      else if (ct.includes('webp')) extension = 'webp';
      else if (ct.includes('gif')) extension = 'gif';
    }

    // 规范化文件名，避免包含非法字符或路径片段
    const safeName = String(filename || Date.now())
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);

    const tempPath = pathJoin(tempDir, `${safeName}.${extension}`);
    writeFileSync(tempPath, Buffer.from(buffer));
    
    logger.debug('图片已下载到:', tempPath);
    return tempPath;
    
  } catch (error) {
    logger.error('下载图片失败:', error);
    throw error;
  }
}

/**
 * 删除临时文件
 */
export function deleteTempFile(filePath) {
  try {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
      logger.debug('临时文件已删除:', filePath);
    }
  } catch (error) {
    logger.warn('删除临时文件失败:', error);
  }
}

/**
 * 清理临时目录
 */
export function cleanupTempDir() {
  try {
    const tempDir = getTempDir();
    // 这里可以添加清理逻辑，比如删除超过一定时间的文件
    logger.debug('临时目录清理完成');
  } catch (error) {
    logger.warn('清理临时目录失败:', error);
  }
}
