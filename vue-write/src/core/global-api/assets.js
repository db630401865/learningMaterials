/* @flow */

import { ASSET_TYPES } from 'shared/constants'
import { isPlainObject, validateComponentName } from '../util/index'

export function initAssetRegisters (Vue: GlobalAPI) {
  /**
   * Create asset registration methods.
   */
  // 遍历 ASSET_TYPES 数组，为 Vue 定义相应方法
  // ASSET_TYPES 包括了directive、 component、filter
  ASSET_TYPES.forEach(type => {
    //Vue[type]就是directive、 component、filter这3个值。给每个值设置一个function
    Vue[type] = function (
      id: string,
      definition: Function | Object
    ): Function | Object | void {
      //判断定义是否传了第二个参数
      if (!definition) {
        //[id]就是directive、 component、filter的名字
        return this.options[type + 's'][id]
      } else {
        /* istanbul ignore if */
        //判断环境，验证名称是否合法
        if (process.env.NODE_ENV !== 'production' && type === 'component') {
          //不合法抱一个警告
          validateComponentName(id)
        }
        // Vue.component('comp', { template: '' })
        //判断类型是否是组件
        //isPlainObject是判断是否是原始的对象
        //isPlainObject（ Object.prototype.toString.call(obj) === '[object Object]'）
        if (type === 'component' && isPlainObject(definition)) {
          definition.name = definition.name || id
          // 把组件配置转换为组件的构造函数
          // this.options._base就是vue的构造函数
          // this.options._base.extend就是将普通的对象转换成构造函数
          // _base就是vue的构造函数，通过调用_base.extend方法将一个包含组件相关选项的对象，转换成创建组件的构造函数
          definition = this.options._base.extend(definition)
        }
        if (type === 'directive' && typeof definition === 'function') {
          definition = { bind: definition, update: definition }
        }
        // 全局注册，存储资源并赋值
        // this.options['components']['comp'] = definition
        // 通过他们我们注册的都是全局的指令组件以及过滤器
        // this是vue的构造函数
        // 如果是过滤器，直接将definition记录到vue的optins.filters.名称
        this.options[type + 's'][id] = definition
        return definition
      }
    }
  })
}
