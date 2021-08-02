/* @flow */
//此文件初始化vue的静态方法（成员）。给vue构造函数组册全局成员
import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'
import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  // config属性描述符
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 初始化 Vue.config 对象
  // 此处的 Vue.config是静态成员（属性）
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  // 这些工具方法不视作全局API的一部分，除非你已经意识到某些风险，否则不要去依赖他们
  // 此处是Vue.util里面的公用方法。避免调用他们（在vue内部使用）
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }
  // 静态方法 set/delete/nextTick
  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 让一个对象可响应。设置响应式的数据
  Vue.observable = <>(obj: T): T => {
    observe(obj)
    return obj
  }
  // 初始化 Vue.options 对象和属性，并给其扩展
  // components/directives/filters 这是遍历的结果（用于储存全局的组件，指令和过滤器的。存储到optins上）
  Vue.options = Object.create(null) //创建一个对象，并设置原型等于null
  //ASSET_TYPES就是定义的常量
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  //存储vue的构造函数
  Vue.options._base = Vue

  // 设置 keep-alive 组件，组册到全局
  // builtInComponents其实就是keep-alive 组件
  // extend其实就是浅拷贝，把builtInComponents拷贝到Vue.options.components上
  extend(Vue.options.components, builtInComponents)

  // 注册 Vue.use() 用来注册插件
  initUse(Vue)
  // 注册 Vue.mixin() 实现混入
  initMixin(Vue)
  // 注册 Vue.extend() 基于传入的options返回一个组件的构造函数
  initExtend(Vue)
  // 注册 Vue.directive()、 Vue.component()、Vue.filter()
  initAssetRegisters(Vue)
}
