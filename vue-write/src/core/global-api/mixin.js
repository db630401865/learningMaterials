/* @flow */

import { mergeOptions } from '../util/index'

export function initMixin (Vue: GlobalAPI) {
  Vue.mixin = function (mixin: Object) {
    //mergeOptions就是将mixin的所有成员拷贝到this.options中。
    //此时this就是vue，然后就等于vue.options。里面的有拷贝的成员了。注册的全局的选项
    this.options = mergeOptions(this.options, mixin)
    return this
  }
}
