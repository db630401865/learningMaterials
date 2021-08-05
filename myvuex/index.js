//此处导出的就是vuex基本结构
let _Vue = null
class Store {
  constructor (options) {
    const {
      state = {},
      getters = {},
      mutations = {},
      actions = {}
    } = options
    this.state = _Vue.observable(state)
    // 此处不直接 this.getters = getters，是因为下面的代码中要方法 getters 中的 key 
    // 如果这么写的话，会导致 this.getters 和 getters 指向同一个对象 
    // 当访问 getters 的 key 的时候，实际上就是访问 this.getters 的 key 会触发 key 属性 的 getter 
    // 会产生死递归
    this.getters = Object.create(null)
    Object.keys(getters).forEach(key => {
      Object.defineProperty(this.getters, key, {
        get: () => getters[key](state)
      })
    })
    // 设置私有属性只能自己内部使用
    this._mutations = mutations
    this._actions = actions
  }

  commit (type, payload) {
    this._mutations[type](this.state, payload)
  }

  dispatch (type, payload) {
    this._actions[type](this, payload)
  }
}
//所有的vue插件都应该有install方法
function install (Vue) {
  _Vue = Vue
  _Vue.mixin({
    //this就是Vue的实例
    beforeCreate () {
      if (this.$options.store) {
        _Vue.prototype.$store = this.$options.store
      }
    }
  })
}

export default {
  Store,
  install
}
