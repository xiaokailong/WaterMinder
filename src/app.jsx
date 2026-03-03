import { useState, useEffect, useCallback } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './app.scss'

// H5 环境重定向修复
if (process.env.TARO_ENV === 'h5' && typeof window !== 'undefined') {
  const currentHash = window.location.hash || ''
  if (currentHash.startsWith('#/~')) {
    window.location.replace(`${window.location.pathname}${window.location.search}#/`)
  }
}

function App({ children }) {
  const [privacyVisible, setPrivacyVisible] = useState(false)
  const [privacyResolve, setPrivacyResolve] = useState(null)

  useEffect(() => {
    if (process.env.TARO_ENV !== 'weapp') return
    Taro.onNeedPrivacyAuthorization((resolve) => {
      setPrivacyResolve(() => resolve)
      setPrivacyVisible(true)
    })
  }, [])

  const handleAgree = useCallback(() => {
    setPrivacyVisible(false)
    if (privacyResolve) {
      privacyResolve({ buttonId: 'privacy-agree-btn', event: 'agree' })
    }
  }, [privacyResolve])

  const handleDisagree = useCallback(() => {
    setPrivacyVisible(false)
    if (privacyResolve) {
      privacyResolve({ event: 'disagree' })
    }
  }, [privacyResolve])

  return (
    <>
      {children}

      {privacyVisible && (
        <View className='privacy-mask'>
          <View className='privacy-dialog'>
            <Text className='privacy-title'>隐私保护提示</Text>
            <Text className='privacy-body'>
              在使用前，请阅读并同意
              <Text
                className='privacy-link'
                onClick={() => Taro.openPrivacyContract({})}
              >《WaterMinder 隐私保护指引》</Text>
              。本应用不收集、上传或存储任何个人信息，所有数据均保存在您的设备本地。
            </Text>
            <View className='privacy-actions'>
              <Button
                className='privacy-btn privacy-btn-cancel'
                onClick={handleDisagree}
              >暂不使用</Button>
              <Button
                id='privacy-agree-btn'
                className='privacy-btn privacy-btn-agree'
                onClick={handleAgree}
              >同意并继续</Button>
            </View>
          </View>
        </View>
      )}
    </>
  )
}

export default App
