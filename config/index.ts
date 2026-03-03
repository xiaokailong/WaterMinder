import { defineConfig, type UserConfigExport } from '@tarojs/cli'

export default defineConfig<'webpack5'>(async (merge) => {
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'water-minder',
    date: '2026-03-03',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      '@tarojs/plugin-platform-weapp',
      '@tarojs/plugin-platform-h5',
      '@tarojs/plugin-framework-react'
    ],
    framework: 'react',
    compiler: {
      type: 'webpack5'
    },
    cache: {
      enable: true
    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {}
        },
        url: {
          enable: true,
          config: {
            limit: 1024
          }
        },
        cssModules: {
          enable: false,
          config: {
            namingPattern: 'module',
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      htmlPluginOption: {
        template: './src/index.html',
        filename: 'index.html'
      },
      router: {
        mode: 'hash',
        customRoutes: {
          '/pages/index/index': '/'
        }
      },
      devServer: {
        port: 3000,
        host: '127.0.0.1'
      }
    }
  }

  if (process.env.NODE_ENV === 'development') {
    return merge({}, baseConfig, await import('./dev'))
  }

  return merge({}, baseConfig, await import('./prod'))
})
