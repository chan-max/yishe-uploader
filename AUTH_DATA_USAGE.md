# 小红书认证数据使用说明

## 概述

现在系统支持从txt文件自动读取小红书认证数据，这样你就可以将成功的请求信息保存到文件中，系统会自动解析并使用。

## 文件位置

认证数据文件位置：`/Users/jackie/workspace/yishe-uploader/auth-data/xiaohongshu-auth.txt`

## 使用方法

### 1. 获取成功的请求信息

1. 在浏览器中正常使用小红书
2. 打开开发者工具 (F12)
3. 切换到 Network 标签
4. 执行一个成功的操作（如访问发布页面）
5. 找到返回200状态码的请求
6. 右键点击请求 → Copy → Copy as cURL 或直接复制请求信息

### 2. 更新认证数据文件

将复制的请求信息粘贴到 `auth-data/xiaohongshu-auth.txt` 文件中，替换现有内容。

**重要格式要求：**
- 保持原始格式，不要修改
- 确保包含完整的Cookie信息
- 确保包含所有请求头信息

### 3. 运行发布脚本

```bash
# 测试认证数据是否有效
npm run test:real-auth

# 运行小红书发布
npm run publish:xiaohongshu
```

## 文件格式示例

```
Request URL
https://edith.xiaohongshu.com/web_api/sns/v5/creator/topic/template/list
Request Method
GET
Status Code
200 OK
...
cookie
abRequestId=35328789-b536-51f7-952d-7867750a6dd4; a1=199dad7771a8rzviphr8p5q1kiv1ezy9cig6fvf8p30000125998; ...
...
x-s
XYS_2UQhPsHCH0c1PjhhHjIj2erjwjQM89PjNsQhPjHCHDMYGUmOLUHVHdWAH0ijJnEAPerIPpuInBihad4/+BbyJfzV/dSBpepOt9+9P0pMnSQ6+gcAPfpHLA+0cSHEGdY1p7kd+Srh87YFPfhALnMs+fzD2BzGPnGM+pQCG/px8bYtyMQYGDEcpMYyaAYfa7LU+b+L/fD78dmyJ9zHPBReqepB8FW3wBpLnePhnDEsN7SM8aVU+LlocSDE2jTFz7GI+/zDP7mMLrzk/FRTG04VcfYd4BELHjIj2ecjwjHjKc==
x-s-common
2UQAPsHCPUIjqArjwjHjNsQhPsHCH0rjNsQhPaHCH0c1PjhhHjIj2eHjwjQ+GnPW/MPjNsQhPUHCHdpdGUHVHdWFH0ijPshEPUh7HjIj2eLjwjHlw/SDGnc7+AqlG/YU2d8kqBYUwoZMq/b3ygGl8gkEwn+k8A8f4fGhqePIPeZIP/HMw/DhHjIj2eGjwjHjNsQh+UHCHjHVHdWhH0ija/PhqDYD87+xJ7mdag8Sq9zn494QcUT6aLpPJLQy+nLApd4G/B4BprShLA+jqg4bqD8S8gYDPBp3Jf+m2DMBnnEl4BYQyrkSL9E+zrTM4bQQPFTAnnRUpFYc4r4UGSGILeSg8DSkN9pgGA8SngbF2pbmqbmQPA4Sy9Ma+SbPtApQy/8A8BES8p+fqpSHqg4VPdbF+LHIzrQQ2sV3zFzkN7+n4BTQ2BzA2op7q0zl4BSQyopYaLLA8/+Pp0mQPM8LaLP78/mM4BIUcLzTqFl98Lz/a7+/LoqMaLp9q9Sn4rkOqgqhcdp78SmI8BpLzS4OagWFprSk4/8yLo4ULopF+LS9JBbPGf4AP7bF2rSh8gPlpd4HanTMJLS3agSSyf4AnaRgpB4S+9p/qgzSNFc7qFz0qBSI8nzSngQr4rSe+fprpdqUaLpwqM+l4Bl1Jb+M/fkn4rS9J9p3qgcAGMi7qM86+B4Qzp+EanYbqaVEzbpQ4dkE+rDh/FSkGA4yLo4mag8kL0z6N7+r/BzA+Sm7pDSe+9p/8e4Sy0S/+rSb4dPAapm+4b87pLSk8oPAqURA2bkw8nSn4BQ0pnpSnp87yrS9zaRC8npS8db74Dls/7+fLo4UagYV4rShnS+64g4O8M87qo+U+BYSpaRS+Dl98Lzc4F8Q4f4APgQ6qAbrnfSQy/4AyfQ6qA+dqD8Qz/mAzob7arS9JpkYpdzfJdp7GLSb+7+rqg4hanSwqA+M4ApQy78A8obFJo4M4Fl6pdzgagWF8rSe/nLF8FYmtFSw8nSl4BkQyoQFanVI8nkl49R1npbCG9bSqFzspSpQzLMjt7bFJ7Sn4rlQcFTA2bm7yAzV8nLlqrRAyLMT/rSkcg+h+9RApopF2n+c49RQ404S8S878DS387P9Pb46aL+N8nz6N9pgpdcAa/P78p8l4APhcSSUanYHtFSe+d+hanRS+0S98nzU/7+8Lo4naLpVyFSezFp0pd4lanTHLFSk89phnSbyaASd8pSM4A8Qy9PhJdp7yozP8Bpka/mAL7pFq9El4e+QPF4OaLpz+Bpc4ob74g4Ta/P6q9k8PBLApd4M+obF2rSeG0bF4gzcanSop7z8yL8QPApA2B8OqAZE89pk4gqh/dbFJDSkp9MQy9RAPpmF4LSb/9pfzSQnaL+b/fpTzgSQcMSyag8N8p8n4ApPLozMGSmFqrSkG9+QcFRA8bqM8nkn4Mmo8bk1aLpo+URc4BYwqgz+anSPJLS3G04Q2BlTagGI8pSf4d+DJfQHcS87zrS9G9pj4g4j2S8FwLSk+7P9J7H6aLpHyfpx8oPILozM/obF4UHVHdWEH0iTP/GMwecI+AcU+aIj2erIH0iINsQhP/rjwjQ1J7QTGnIjKc==
x-t
1761379614411
x-xray-traceid
cd0d33ff447fc06c4d361da526e2594e
```

## 关键信息说明

### 必需的Cookie
- `access-token-creator.xiaohongshu.com`: 认证token
- `customer-sso-sid`: SSO会话ID
- `x-user-id-creator.xiaohongshu.com`: 用户ID
- `customerClientId`: 客户端ID

### 必需的请求头
- `x-s`: 签名头
- `x-s-common`: 通用签名头
- `x-t`: 时间戳
- `x-xray-traceid`: 追踪ID

## 故障排除

### 如果认证失败
1. 检查文件格式是否正确
2. 确保Cookie没有过期
3. 重新获取最新的请求信息
4. 检查文件路径是否正确

### 如果仍然出现401错误
1. 重新登录小红书
2. 获取新的认证数据
3. 更新txt文件
4. 重新运行脚本

## 自动化流程

1. **获取认证数据** → 复制到txt文件
2. **运行测试** → `npm run test:real-auth`
3. **验证成功** → 运行发布脚本
4. **定期更新** → 当认证失效时重新获取

## 注意事项

1. **数据安全**: 认证数据包含敏感信息，请妥善保管
2. **定期更新**: Cookie会过期，需要定期更新
3. **格式保持**: 不要修改原始格式，直接复制粘贴
4. **备份数据**: 建议备份有效的认证数据

## 更新日志

- **v1.0**: 支持从txt文件读取认证数据
- **v1.1**: 自动解析Cookie和请求头
- **v1.2**: 添加数据验证功能
