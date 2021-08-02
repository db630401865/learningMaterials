/* @flow */

import Vue from 'core/index' //主要看这个入口文件
import config from 'core/config'
import { extend, noop } from 'shared/util'
import { mountComponent } from 'core/instance/lifecycle'
import { devtools, inBrowser } from 'core/util/index'

import {
  query,
  mustUseProp,
  isReservedTag,
  isReservedAttr,
  getTagNamespace,
  isUnknownElement
} from 'web/util/index'

import { patch } from './patch'
import platformDirectives from './directives/index'
import platformComponents from './components/index'

// install platform specific utils（这些方法都是和平台相关的通用的方法是vue内部来使用的）
// 判断是否是关键属性(表单元素的 input/checked/selected/muted)
//是否是html标签特有的标签和属性
// 如果是这些属性，设置el.props属性(属性不设置到标签上)
Vue.config.mustUseProp = mustUseProp
Vue.config.isReservedTag = isReservedTag
Vue.config.isReservedAttr = isReservedAttr
Vue.config.getTagNamespace = getTagNamespace
Vue.config.isUnknownElement = isUnknownElement

// install platform runtime directives & components
//通过extend注册了和全局相关的指令和组建
//是将第二个参数，以及所有成员拷贝到第一个参数里面（复制对象成员的功能）
//组册的指令和组件都是可以在全局访问到的
extend(Vue.options.directives, platformDirectives) //注册指令
extend(Vue.options.components, platformComponents) //注册组件.这个组件是web平台特有的。

// install platform patch function
// __patch__。就是将虚拟dom转换为真实dom
//判断是否是浏览器环境，如果是返回patch，如果不是的话，返回noop。空函数
// export const inBrowser = typeof window !== 'undefined' 其实就是判断是否可以拿到window
Vue.prototype.__patch__ = inBrowser ? patch : noop

// public mount method
// 此处给vue实例增加$mount方法
Vue.prototype.$mount = function (
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && inBrowser ? query(el) : undefined
  //mountComponent就是渲染dom
  return mountComponent(this, el, hydrating)
}

// devtools global hook
/* istanbul ignore next */
if (inBrowser) {
  setTimeout(() => {
    if (config.devtools) {
      if (devtools) {
        devtools.emit('init', Vue)
      } else if (
        process.env.NODE_ENV !== 'production' &&
        process.env.NODE_ENV !== 'test'
      ) {
        console[console.info ? 'info' : 'log'](
          'Download the Vue Devtools extension for a better development experience:\n' +
          'https://github.com/vuejs/vue-devtools'
        )
      }
    }
    if (process.env.NODE_ENV !== 'production' &&
      process.env.NODE_ENV !== 'test' &&
      config.productionTip !== false &&
      typeof console !== 'undefined'
    ) {
      console[console.info ? 'info' : 'log'](
        `You are running Vue in development mode.\n` +
        `Make sure to turn on production mode when deploying for production.\n` +
        `See more tips at https://vuejs.org/guide/deployment.html`
      )
    }
  }, 0)
}

export default Vue
