export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/history/index',
    'pages/settings/index'
  ],
  window: {
    navigationBarTitleText: '💧 WaterMinder',
    navigationBarBackgroundColor: '#0284C7',
    navigationBarTextStyle: 'white',
    backgroundTextStyle: 'light',
    backgroundColor: '#0EA5E9'
  },
  tabBar: {
    color: '#3D6B8C',
    selectedColor: '#0284C7',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '喝水',
        iconPath: 'assets/tabbar/drink.png',
        selectedIconPath: 'assets/tabbar/drink-active.png'
      },
      {
        pagePath: 'pages/history/index',
        text: '历史',
        iconPath: 'assets/tabbar/history.png',
        selectedIconPath: 'assets/tabbar/history-active.png'
      },
      {
        pagePath: 'pages/settings/index',
        text: '设置',
        iconPath: 'assets/tabbar/settings.png',
        selectedIconPath: 'assets/tabbar/settings-active.png'
      }
    ]
  },
  __usePrivacyCheck__: true
})
