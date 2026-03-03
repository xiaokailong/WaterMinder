import { useState, useCallback } from 'react'
import { View, Text, Input } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { getSettings, saveSettings, clearTodayRecords, clearAllData } from '../../utils/storage'
import './index.scss'

const GOAL_PRESETS = [1500, 1800, 2000, 2500, 3000]

export default function SettingsPage() {
  const [name,     setName]     = useState('')
  const [goal,     setGoal]     = useState(2000)
  const [saved,    setSaved]    = useState(false)
  const [goalInput, setGoalInput] = useState('2000')

  const loadSettings = useCallback(() => {
    const s = getSettings()
    setName(s.name || '')
    setGoal(s.dailyGoal)
    setGoalInput(String(s.dailyGoal))
  }, [])

  useDidShow(() => loadSettings())

  const handleSave = useCallback(() => {
    const parsedGoal = parseInt(goalInput, 10)
    if (!parsedGoal || parsedGoal < 300 || parsedGoal > 8000) {
      Taro.showToast({ title: '每日目标请设 300 - 8000 ml', icon: 'none' })
      return
    }
    saveSettings({ name: name.trim(), dailyGoal: parsedGoal })
    setGoal(parsedGoal)
    setSaved(true)
    Taro.showToast({ title: '设置已保存 ✓', icon: 'success', duration: 1500 })
    setTimeout(() => setSaved(false), 2000)
  }, [name, goalInput])

  const handleGoalPreset = useCallback((val) => {
    setGoal(val)
    setGoalInput(String(val))
  }, [])

  const handleClearToday = useCallback(() => {
    Taro.showModal({
      title: '清空今日记录',
      content: '确定要清空今天所有的喝水记录吗？此操作不可恢复。',
      confirmColor: '#e74c3c',
      success: ({ confirm }) => {
        if (confirm) {
          clearTodayRecords()
          Taro.showToast({ title: '今日记录已清空', icon: 'success' })
        }
      }
    })
  }, [])

  const handleClearAll = useCallback(() => {
    Taro.showModal({
      title: '清空所有数据',
      content: '确定要清空所有数据（包括历史记录和连续打卡）？此操作不可恢复。',
      confirmColor: '#e74c3c',
      success: ({ confirm }) => {
        if (confirm) {
          clearAllData()
          loadSettings()
          Taro.showToast({ title: '所有数据已清空', icon: 'success' })
        }
      }
    })
  }, [loadSettings])

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 6)  return '深夜好'
    if (h < 11) return '早上好'
    if (h < 13) return '中午好'
    if (h < 18) return '下午好'
    return '晚上好'
  })()

  return (
    <View className='page'>

      {/* ── 个人信息卡片 ── */}
      <View className='profile-card'>
        <View className='avatar'>
          <Text className='avatar-emoji'>💧</Text>
        </View>
        <Text className='greeting'>{greeting}，{name || '水友'}！</Text>
        <Text className='sub-greeting'>坚持喝水，健康每一天</Text>
      </View>

      {/* ── 昵称设置 ── */}
      <View className='section-card'>
        <Text className='section-header'>个人信息</Text>
        <View className='row'>
          <Text className='row-label'>我的昵称</Text>
          <Input
            className='row-input'
            value={name}
            placeholder='输入你的昵称'
            placeholderStyle='color:#90adbc'
            maxlength={12}
            onInput={e => setName(e.detail.value)}
          />
        </View>
      </View>

      {/* ── 每日目标 ── */}
      <View className='section-card'>
        <Text className='section-header'>每日目标</Text>

        {/* 目标预设 */}
        <View className='preset-row'>
          {GOAL_PRESETS.map(v => (
            <View
              key={v}
              className={`goal-chip ${goal === v ? 'goal-chip-active' : ''}`}
              onClick={() => handleGoalPreset(v)}
            >
              <Text className={`goal-chip-text ${goal === v ? 'goal-chip-text-active' : ''}`}>
                {v}ml
              </Text>
            </View>
          ))}
        </View>

        {/* 自定义目标输入 */}
        <View className='row' style={{ marginTop: '20px' }}>
          <Text className='row-label'>自定义 (ml)</Text>
          <Input
            className='row-input'
            type='number'
            value={goalInput}
            placeholder='300 - 8000'
            placeholderStyle='color:#90adbc'
            onInput={e => {
              setGoalInput(e.detail.value)
              const v = parseInt(e.detail.value, 10)
              if (v >= 300 && v <= 8000) setGoal(v)
            }}
          />
        </View>

        {/* 目标可视化进度条 */}
        <View className='goal-preview'>
          <View className='goal-preview-bar-track'>
            <View
              className='goal-preview-bar-fill'
              style={{ width: `${Math.min((goal / 4000) * 100, 100)}%` }}
            />
          </View>
          <Text className='goal-preview-text'>当前目标：{goal} ml / 天</Text>
        </View>
      </View>

      {/* ── 保存按钮 ── */}
      <View
        className={`save-btn ${saved ? 'save-btn-saved' : ''}`}
        onClick={handleSave}
      >
        <Text className='save-btn-text'>{saved ? '✓ 已保存' : '保存设置'}</Text>
      </View>

      {/* ── 数据管理 ── */}
      <View className='section-card danger-section'>
        <Text className='section-header'>数据管理</Text>
        <View className='danger-row' onClick={handleClearToday}>
          <Text className='danger-icon'>🗑</Text>
          <View className='danger-info'>
            <Text className='danger-title'>清空今日记录</Text>
            <Text className='danger-sub'>仅清除今天的喝水数据</Text>
          </View>
          <Text className='danger-arrow'>›</Text>
        </View>
        <View className='danger-row danger-row-last' onClick={handleClearAll}>
          <Text className='danger-icon'>⚠️</Text>
          <View className='danger-info'>
            <Text className='danger-title danger-title-red'>清空所有数据</Text>
            <Text className='danger-sub'>包括历史记录和连续打卡记录</Text>
          </View>
          <Text className='danger-arrow'>›</Text>
        </View>
      </View>

      {/* ── 关于 ── */}
      <View className='about-card'>
        <Text className='about-name'>💧 WaterMinder</Text>
        <Text className='about-version'>版本 1.0.0</Text>
        <Text className='about-desc'>
          专为年轻人设计的每日喝水打卡小程序{'\n'}
          保持水分，活力满满 ✨
        </Text>
      </View>

    </View>
  )
}
