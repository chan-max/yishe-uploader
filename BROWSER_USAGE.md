# 浏览器共享使用说明

## 概述

这个项目现在支持浏览器窗口共享，所有发布脚本都可以使用同一个浏览器实例，避免重复启动浏览器，提高效率。

## 使用方法

### 方法一：先启动浏览器，再运行发布脚本（推荐）

1. **启动浏览器**：
   ```bash
   # 启动浏览器（进程保持运行，按 Ctrl+C 退出）
   npm run browser:start
   
   # 或者明确指定保持进程运行
   npm run browser:start:keep
   ```

2. **运行发布脚本**：
   ```bash
   # 微博发布
   npm run publish:weibo
   
   # 抖音发布
   npm run publish:douyin
   
   # 小红书发布
   npm run publish:xiaohongshu
   
   # 快手发布
   npm run publish:kuaishou
   
   # 检查登录状态
   npm run check-login
   
   # 批量发布
   npm run publish:file -- --file ./examples/publish-template.js
   ```

### 方法二：直接运行发布脚本

如果浏览器未运行，发布脚本会自动启动浏览器：
```bash
npm run publish:weibo
```

## 浏览器管理命令

```bash
# 检查浏览器状态
npm run browser:status

# 关闭浏览器
npm run browser:close
```

## 特性

- ✅ **共享浏览器窗口**：所有脚本使用同一个浏览器实例
- ✅ **自动检测**：脚本会自动检测现有浏览器并复用
- ✅ **保持登录状态**：浏览器关闭前会保持登录状态
- ✅ **智能启动**：如果浏览器未运行，会自动启动
- ✅ **状态管理**：提供浏览器状态查询和管理功能

## 工作流程示例

```bash
# 1. 启动浏览器
npm run browser:start:keep

# 2. 在另一个终端运行多个发布脚本
npm run publish:weibo
npm run publish:douyin
npm run publish:xiaohongshu

# 3. 检查状态
npm run browser:status

# 4. 完成后关闭浏览器
npm run browser:close
```

## 注意事项

1. **浏览器保持打开**：脚本运行完成后浏览器窗口会保持打开状态，便于继续操作
2. **登录状态持久化**：浏览器会保存登录状态，避免重复登录
3. **多终端支持**：可以在不同终端运行不同的发布脚本，它们会共享同一个浏览器
4. **调试端口**：浏览器使用 9222 端口进行调试连接

## 故障排除

如果遇到浏览器启动问题：

1. 检查是否有其他浏览器实例在运行：
   ```bash
   npm run browser:status
   ```

2. 关闭所有浏览器实例：
   ```bash
   npm run browser:close
   ```

3. 重新启动：
   ```bash
   npm run browser:start
   ```

## 开发调试

使用 `--keep-open` 参数可以保持进程运行，便于调试：
```bash
npm run browser:start:keep
```

这样可以在浏览器中手动操作，同时观察日志输出。
