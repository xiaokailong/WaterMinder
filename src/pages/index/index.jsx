import { useState, useEffect, useCallback } from 'react'
import { View, Text, Input, ScrollView, Ad } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import {
  getTodayStr,
  getRecords,
  addRecord,
  deleteRecord,
  getSettings,
  checkAndUpdateStreak,
  getStreak,
  getMotivation,
  getLifetimeTotal
} from '../../utils/storage'
import './index.scss'

const WEEK_CN = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
const PRESETS  = [150, 200, 250, 300, 500]

// 流量主广告单元 ID（上线前替换为真实 ID）
const AD_UNIT_ID = 'adunit-xxxxxxxxxxxxxxxx'

// 排行榜模拟数据
const MOCK_TODAY   = [
  { name: '健身达人', avatar: '🏋️', value: 3200 },
  { name: '晨跑少女', avatar: '🏃', value: 2850 },
  { name: '办公室小王', avatar: '💼', value: 2400 },
  { name: '养生姐姐', avatar: '🌿', value: 2200 },
  { name: '快乐肥宅', avatar: '😄', value: 1500 },
]
const MOCK_TOTAL   = [
  { name: '健身达人', avatar: '🏋️', value: 312000 },
  { name: '养生姐姐', avatar: '🌿', value: 278500 },
  { name: '晨跑少女', avatar: '🏃', value: 245000 },
  { name: '办公室小王', avatar: '💼', value: 198000 },
  { name: '快乐肥宅', avatar: '😄', value: 120000 },
]
const MOCK_STREAK  = [
  { name: '养生姐姐', avatar: '🌿', value: 62 },
  { name: '健身达人', avatar: '🏋️', value: 48 },
  { name: '晨跑少女', avatar: '🏃', value: 35 },
  { name: '办公室小王', avatar: '💼', value: 21 },
  { name: '快乐肥宅', avatar: '😄', value: 7 },
]
const RANK_MEDALS = ['🥇', '🥈', '🥉']

function buildLeaderboard(mockList, myEntry) {
  const list = [...mockList, { ...myEntry, isMe: true }]
    .sort((a, b) => b.value - a.value)
  const myRank = list.findIndex(e => e.isMe) + 1
  return { list, myRank }
}

function formatValue(tab, v) {
  if (tab === 'today' || tab === 'total')
    return v >= 1000 ? `${(v / 1000).toFixed(1)}L` : `${v}ml`
  return `${v}天`
}

function getDateLabel() {
  const d = new Date()
  const m = d.getMonth() + 1
  const day = d.getDate()
  const w = WEEK_CN[d.getDay()]
  return `${m}月${day}日 ${w}`
}

export default function IndexPage() {
  const [records,      setRecords]      = useState([])
  const [dailyGoal,    setDailyGoal]    = useState(2000)
  const [streak,       setStreak]       = useState({ current: 0, longest: 0 })
  const [customAmount, setCustomAmount] = useState('')
  const [showSuccess,  setShowSuccess]  = useState(false)
  const [boardVisible, setBoardVisible] = useState(false)
  const [boardTab,     setBoardTab]     = useState('today')
  const [boardData,    setBoardData]    = useState({ list: [], myRank: 0 })
  const [userName,     setUserName]     = useState('')

  const total   = records.reduce((s, r) => s + r.amount, 0)
  const percent = Math.min(Math.round((total / dailyGoal) * 100), 100)

  const loadData = useCallback(() => {
    const settings = getSettings()
    const recs     = getRecords(getTodayStr())
    setDailyGoal(settings.dailyGoal)
    setRecords(recs)
    setStreak(getStreak())
    setUserName(settings.name || '我')
  }, [])

  useEffect(() => { loadData() }, [])
  useDidShow(() => { loadData() })

  // 添加饮水记录
  const handleAdd = useCallback((amount) => {
    if (!amount || amount <= 0) {
      Taro.showToast({ title: '请输入正确的毫升数', icon: 'none' })
      return
    }
    const updated = addRecord(amount)
    setRecords(updated)
    const newTotal = updated.reduce((s, r) => s + r.amount, 0)
    const newStreak = checkAndUpdateStreak(newTotal, dailyGoal)
    setStreak(newStreak)

    // 达成目标时给震动反馈
    if (newTotal >= dailyGoal && newTotal - amount < dailyGoal) {
      Taro.vibrateShort({})
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 2500)
    }
  }, [dailyGoal])

  // 排行榜相关
  const computeBoard = useCallback((tab, curTotal) => {
    const strk          = getStreak()
    const lifetimeTotal = getLifetimeTotal()
    const displayName   = userName || '我'
    const myToday  = { name: displayName, avatar: '💧', value: curTotal }
    const myTotal  = { name: displayName, avatar: '💧', value: lifetimeTotal }
    const myStreak = { name: displayName, avatar: '💧', value: strk.longest }
    const map = {
      today:  buildLeaderboard(MOCK_TODAY,  myToday),
      total:  buildLeaderboard(MOCK_TOTAL,  myTotal),
      streak: buildLeaderboard(MOCK_STREAK, myStreak),
    }
    return map[tab]
  }, [userName])

  const openLeaderboard = useCallback((tab) => {
    const curTotal = records.reduce((s, r) => s + r.amount, 0)
    setBoardData(computeBoard(tab, curTotal))
    setBoardTab(tab)
    setBoardVisible(true)
  }, [records, computeBoard])

  const switchBoardTab = useCallback((tab) => {
    const curTotal = records.reduce((s, r) => s + r.amount, 0)
    setBoardData(computeBoard(tab, curTotal))
    setBoardTab(tab)
  }, [records, computeBoard])

  const handleCustomAdd = useCallback(() => {
    const ml = parseInt(customAmount, 10)
    if (!ml || ml < 1 || ml > 5000) {
      Taro.showToast({ title: '请输入 1 - 5000 ml', icon: 'none' })
      return
    }
    handleAdd(ml)
    setCustomAmount('')
  }, [customAmount, handleAdd])

  const handleDelete = useCallback((id) => {
    Taro.showModal({
      title: '删除记录',
      content: '确定要删除这条喝水记录吗？',
      confirmColor: '#e74c3c',
      success: ({ confirm }) => {
        if (confirm) {
          const updated = deleteRecord(id)
          setRecords(updated)
          const newTotal = updated.reduce((s, r) => s + r.amount, 0)
          setStreak(checkAndUpdateStreak(newTotal, dailyGoal))
        }
      }
    })
  }, [dailyGoal])

  const ringColor = percent >= 100 ? '#38BDF8' : percent >= 50 ? '#0EA5E9' : '#7DD3FC'
  const ringBg    = `conic-gradient(${ringColor} ${percent}%, rgba(255,255,255,0.18) 0%)`

  return (
    <View className='page'>
      {/* 装饰气泡 */}
      <View className='blob blob-1' />
      <View className='blob blob-2' />
      <View className='blob blob-3' />

      {/* ── 头部：日期 + 连续天数 ── */}
      <View className='header'>
        <View className='header-left'>
          <Text className='header-date'>{getDateLabel()}</Text>
          <Text className='header-sub'>每日喝水打卡</Text>
        </View>
        {streak.current > 0 && (
          <View className='streak-badge'>
            <Text className='streak-fire'>🔥</Text>
            <Text className='streak-num'>{streak.current}</Text>
            <Text className='streak-label'>天连续</Text>
          </View>
        )}
      </View>

      {/* ── 圆环进度区（CSS conic-gradient，小程序 & H5 均兼容）── */}
      <View className='ring-section'>
        <View className='ring-donut' style={{ background: ringBg }}>
          <View className='ring-inner'>
            <Text className='ring-percent'>{percent}%</Text>
            <Text className='ring-amount'>{total}</Text>
            <Text className='ring-goal'>/ {dailyGoal} ml</Text>
          </View>
        </View>

        {/* 激励语 */}
        <Text className='motivation'>{getMotivation(percent)}</Text>

        {/* 达成动效提示 */}
        {showSuccess && (
          <View className='success-toast'>
            <Text className='success-text'>🎉 今日目标达成！太棒了！</Text>
          </View>
        )}

        {/* ── 排行榜入口按钮 ── */}
        <View className='board-entry-row'>
          <View className='board-btn' onClick={() => openLeaderboard('today')}>
            <Text className='board-btn-icon'>🏆</Text>
            <Text className='board-btn-text'>今日榜</Text>
          </View>
          <View className='board-btn' onClick={() => openLeaderboard('total')}>
            <Text className='board-btn-icon'>💧</Text>
            <Text className='board-btn-text'>总量榜</Text>
          </View>
          <View className='board-btn' onClick={() => openLeaderboard('streak')}>
            <Text className='board-btn-icon'>🔥</Text>
            <Text className='board-btn-text'>打卡榜</Text>
          </View>
        </View>
      </View>

      {/* ── 快捷添加按钮 ── */}
      <View className='quick-section'>
        <Text className='section-title'>快速添加</Text>
        <View className='preset-row'>
          {PRESETS.map(ml => (
            <View
              key={ml}
              className='preset-btn'
              onClick={() => handleAdd(ml)}
            >
              <Text className='preset-ml'>{ml}</Text>
              <Text className='preset-unit'>ml</Text>
            </View>
          ))}
        </View>

        {/* 自定义输入 */}
        <View className='custom-row'>
          <Input
            className='custom-input'
            type='number'
            placeholder='自定义 ml'
            placeholderStyle='color:#90adbc'
            value={customAmount}
            onInput={e => setCustomAmount(e.detail.value)}
            confirmType='done'
            onConfirm={handleCustomAdd}
          />
          <View className='custom-btn' onClick={handleCustomAdd}>
            <Text className='custom-btn-text'>+ 添加</Text>
          </View>
        </View>
      </View>

      {/* ── 今日记录 ── */}
      <View className='log-section'>
        <View className='log-header'>
          <Text className='section-title'>今日记录</Text>
          <Text className='log-count'>{records.length} 杯</Text>
        </View>

        {records.length === 0 ? (
          <View className='empty-log'>
            <Text className='empty-icon'>💧</Text>
            <Text className='empty-text'>还没有记录，快来喝一杯吧！</Text>
          </View>
        ) : (
          <ScrollView scrollY className='log-scroll'>
            {[...records].reverse().map((rec, idx) => (
              <View key={rec.id} className='log-item'>
                <View className='log-item-left'>
                  <View className={`log-dot ${idx === 0 ? 'log-dot-latest' : ''}`} />
                  <View>
                    <Text className='log-amount'>{rec.amount} ml</Text>
                    <Text className='log-time'>{rec.time}</Text>
                  </View>
                </View>
                <View
                  className='log-delete'
                  onClick={() => handleDelete(rec.id)}
                >
                  <Text className='log-delete-icon'>×</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* ── 流量主广告位（放在底部，不影响核心操作）── */}
      <View className='ad-slot'>
        {process.env.TARO_ENV === 'weapp'
          ? <Ad unitId={AD_UNIT_ID} adType='banner' />
          : (
            <View className='ad-placeholder'>
              <Text className='ad-placeholder-text'>广告位</Text>
            </View>
          )
        }
      </View>

      {/* ══ 排行榜弹窗 ══ */}
      {boardVisible && (
        <View className='board-mask' onClick={() => setBoardVisible(false)}>
          <View className='board-sheet' onClick={e => e.stopPropagation()}>

            {/* 标题行 */}
            <View className='board-sheet-header'>
              <Text className='board-sheet-title'>排行榜</Text>
              <View className='board-close' onClick={() => setBoardVisible(false)}>
                <Text className='board-close-icon'>×</Text>
              </View>
            </View>

            {/* Tab 切换 */}
            <View className='board-tabs'>
              {[
                { key: 'today',  label: '🏆 今日喝水' },
                { key: 'total',  label: '💧 总量榜'   },
                { key: 'streak', label: '🔥 累积打卡' },
              ].map(t => (
                <View
                  key={t.key}
                  className={`board-tab ${boardTab === t.key ? 'board-tab-active' : ''}`}
                  onClick={() => switchBoardTab(t.key)}
                >
                  <Text className={`board-tab-text ${boardTab === t.key ? 'board-tab-text-active' : ''}`}>
                    {t.label}
                  </Text>
                </View>
              ))}
            </View>

            {/* 排名列表 */}
            <ScrollView scrollY className='board-list'>
              {boardData.list.map((entry, idx) => (
                <View
                  key={`${entry.name}-${idx}`}
                  className={`board-item ${entry.isMe ? 'board-item-me' : ''}`}
                >
                  <Text className='board-rank'>
                    {idx < 3 ? RANK_MEDALS[idx] : String(idx + 1)}
                  </Text>
                  <Text className='board-avatar'>{entry.avatar}</Text>
                  <View className='board-name-wrap'>
                    <Text className='board-name'>{entry.name}</Text>
                    {entry.isMe && <Text className='board-me-tag'>我</Text>}
                  </View>
                  <Text className='board-value'>
                    {formatValue(boardTab, entry.value)}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* 我的排名汇总 */}
            <View className='board-my-rank'>
              <Text className='board-my-rank-text'>
                我的排名 #{boardData.myRank} · 继续加油！💪
              </Text>
            </View>

          </View>
        </View>
      )}

    </View>
  )
}
