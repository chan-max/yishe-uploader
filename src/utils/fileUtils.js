/**
 * 文件工具函数
 */

import { join as pathJoin } from 'path';
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
    
    // 从 URL 中提取文件扩展名
    const urlParts = imageUrl.split('.');
    const extension = urlParts.length > 1 ? urlParts[urlParts.length - 1].split('?')[0] : 'jpg';
    
    const tempPath = pathJoin(tempDir, `${filename}.${extension}`);
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
