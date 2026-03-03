import { useState, useCallback } from 'react'
import { View, Text, ScrollView } from '@tarojs/components'
import { useDidShow } from '@tarojs/taro'
import {
  getWeekData,
  getStreak,
  getSettings,
  getRecords
} from '../../utils/storage'
import './index.scss'

export default function HistoryPage() {
  const [weekData, setWeekData]     = useState([])
  const [streak,   setStreak]       = useState({ current: 0, longest: 0 })
  const [selected, setSelected]     = useState(null)   // 选中的日期 string
  const [dailyGoal, setDailyGoal]   = useState(2000)

  const loadData = useCallback(() => {
    const data     = getWeekData()
    const strk     = getStreak()
    const settings = getSettings()
    setWeekData(data)
    setStreak(strk)
    setDailyGoal(settings.dailyGoal)
    // 默认选中今日（最后一个）
    if (data.length > 0) {
      setSelected(data[data.length - 1].date)
    }
  }, [])

  useDidShow(() => loadData())

  // 本周最大值，用于归一化柱子高度
  const maxVal = Math.max(...weekData.map(d => d.total), dailyGoal)

  // 周均量
  const daysWithData  = weekData.filter(d => d.total > 0)
  const weekAvg       = daysWithData.length
    ? Math.round(daysWithData.reduce((s, d) => s + d.total, 0) / daysWithData.length)
    : 0
  const goalDays = weekData.filter(d => d.total >= dailyGoal).length

  // 选中日期的详细记录
  const selectedDayData = selected ? weekData.find(d => d.date === selected) : null
  const selectedRecords = selected ? getRecords(selected) : []

  return (
    <View className='page'>

      {/* ── 统计卡片行 ── */}
      <View className='stats-row'>
        <View className='stat-card stat-card-blue'>
          <Text className='stat-value'>{streak.current}</Text>
          <Text className='stat-label'>🔥 当前连续</Text>
        </View>
        <View className='stat-card stat-card-cyan'>
          <Text className='stat-value'>{streak.longest}</Text>
          <Text className='stat-label'>🏆 最长连续</Text>
        </View>
        <View className='stat-card stat-card-teal'>
          <Text className='stat-value'>{goalDays}/7</Text>
          <Text className='stat-label'>✅ 本周达标</Text>
        </View>
      </View>

      {/* ── 本周平均 ── */}
      <View className='avg-card'>
        <Text className='avg-label'>本周日均饮水</Text>
        <View className='avg-row'>
          <Text className='avg-value'>{weekAvg}</Text>
          <Text className='avg-unit'> ml</Text>
          <Text className={`avg-vs ${weekAvg >= dailyGoal ? 'avg-vs-good' : 'avg-vs-low'}`}>
            {weekAvg >= dailyGoal ? ' ≥ 目标 👍' : ` 差 ${dailyGoal - weekAvg} ml`}
          </Text>
        </View>
      </View>

      {/* ── 柱状图 ── */}
      <View className='chart-card'>
        <Text className='chart-title'>最近 7 天</Text>
        <View className='chart-area'>
          {weekData.map(day => {
            const barH   = maxVal ? Math.round((day.total / maxVal) * 120) : 0
            const goalH  = maxVal ? Math.round((dailyGoal / maxVal) * 120) : 60
            const isGoal = day.total >= dailyGoal
            const isSel  = day.date === selected
            return (
              <View
                key={day.date}
                className={`bar-col ${isSel ? 'bar-col-selected' : ''}`}
                onClick={() => setSelected(day.date)}
              >
                <Text className='bar-amount-label'>
                  {day.total > 0 ? day.total : ''}
                </Text>
                <View className='bar-track'>
                  {/* 目标线 */}
                  <View
                    className='goal-line'
                    style={{ bottom: `${goalH}px` }}
                  />
                  {/* 柱子 */}
                  <View
                    className={`bar-fill ${isGoal ? 'bar-fill-goal' : 'bar-fill-normal'}`}
                    style={{ height: `${barH}px` }}
                  />
                </View>
                <Text className={`bar-label ${day.isToday ? 'bar-label-today' : ''}`}>
                  {day.isToday ? '今' : day.label}
                </Text>
                <Text className='bar-date'>{day.display.slice(3)}</Text>
              </View>
            )
          })}
        </View>
        <Text className='chart-hint'>· 虚线为每日目标 · 点击查看详情</Text>
      </View>

      {/* ── 选中日期详情 ── */}
      {selectedDayData && (
        <View className='detail-card'>
          <View className='detail-header'>
            <Text className='detail-date'>
              {selectedDayData.display}{selectedDayData.isToday ? '（今天）' : ''}
            </Text>
            <Text className={`detail-total ${selectedDayData.total >= dailyGoal ? 'detail-total-good' : ''}`}>
              {selectedDayData.total} ml
            </Text>
          </View>

          {selectedRecords.length === 0 ? (
            <View className='detail-empty'>
              <Text className='detail-empty-text'>这天没有记录</Text>
            </View>
          ) : (
            <ScrollView scrollY className='detail-scroll'>
              {[...selectedRecords].reverse().map(rec => (
                <View key={rec.id} className='detail-item'>
                  <Text className='detail-time'>{rec.time}</Text>
                  <Text className='detail-amount'>{rec.amount} ml</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

    </View>
  )
}
