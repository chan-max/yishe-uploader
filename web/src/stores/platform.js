import { defineStore } from 'pinia'
import { ref } from 'vue'

export const usePlatformStore = defineStore('platform', () => {
  const platforms = ref([
    { id: 'douyin', name: '抖音', icon: '🎵', enabled: true, supportVideo: true, supportImage: true, maxImages: 35, features: ['定时发布', '商品链接', '话题标签', '地理位置'] },
    { id: 'kuaishou', name: '快手', icon: '⚡', enabled: true, supportVideo: true, supportImage: true, maxImages: 9, features: ['定时发布', '话题标签'] },
    { id: 'xiaohongshu', name: '小红书', icon: '📕', enabled: true, supportVideo: true, supportImage: true, maxImages: 18, features: ['定时发布', '话题标签', '地理位置'] },
    { id: 'weibo', name: '微博', icon: '🔥', enabled: true, supportVideo: true, supportImage: true, maxImages: 9, features: ['话题标签', '地理位置'] }
  ])
  const accounts = ref([])
  function getPlatform(platformId) {
    return platforms.value.find(p => p.id === platformId)
  }
  function getPlatformAccounts(platformId) {
    return accounts.value.filter(a => a.platformId === platformId)
  }
  function addAccount(account) {
    accounts.value.push({ id: Date.now(), ...account, createdAt: new Date() })
  }
  function updateAccount(accountId, data) {
    const account = accounts.value.find(a => a.id === accountId)
    if (account) Object.assign(account, data, { updatedAt: new Date() })
  }
  function deleteAccount(accountId) {
    const index = accounts.value.findIndex(a => a.id === accountId)
    if (index > -1) accounts.value.splice(index, 1)
  }
  return { platforms, accounts, getPlatform, getPlatformAccounts, addAccount, updateAccount, deleteAccount }
})
