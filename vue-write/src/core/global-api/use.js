/* @flow */

import { toArray } from '../util/index'

export function initUse (Vue: GlobalAPI) {
  //this就是vue的构造函数
  //判断是否组册了传入的插件
  Vue.use = function (plugin: Function | Object) {
    const installedPlugins = (this._installedPlugins || (this._installedPlugins = []))
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    // 下面方法总的来说就是调用插件的 方法传递参数
    // 把数组中的第一个元素(plugin)去除
    // 将arguments转换为数组。并且去掉第一个参数。第一个参数不是数组。
    const args = toArray(arguments, 1)
    // 把this(Vue)插入第一个元素的位置
    // 插件都会有install这个方法。如果有就调用。args就是来处理多个参数的
    args.unshift(this) //将this插入到args的第一项
    if (typeof plugin.install === 'function') {
      plugin.install.apply(plugin, args)
    } else if (typeof plugin === 'function') {
      plugin.apply(null, args)
    }
    //保存已经安装的插件，到installedPlugins里面
    installedPlugins.push(plugin)
    return this
  }
}
