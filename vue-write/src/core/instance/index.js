//此文件做了2件事情。
//第一件：创建了vue的构造函数
//第二件：给vue的原型上混入一些成员和属性方法。给vue增加实例的成员，
//此处我们传入的构造函数，为什么不用类呢。
//是因为，如果我们使用了类来创建vue的构造函数的话，下面的函数就不方便去实现
//因为我们在下面的方法给vue的原型上挂载了很多的属性和成员。而如果用类的话，我们在用原型看起来就很不搭。所有我们使用的就是构造函数
import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
// 此处不用 class 的原因是因为方便后续给 Vue 实例混入实例成员
function Vue (options) {
  if (process.env.NODE_ENV !== 'production' &&
    //此处判断this是否式vue的实例。如果不是说明没有使用new 来调用这个构造函数。就会报警告
    !(this instanceof Vue)
  ) {
    //Vue是一个构造函数，应该用“new”关键字调用
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  // 调用 _init() 方法
  this._init(options)
}
// 注册 vm 的 _init() 方法，初始化 vm
initMixin(Vue)
// 注册 vm 的 $data/$props/$set/$delete/$watch
stateMixin(Vue)
// 初始化事件相关方法
// $on/$once/$off/$emit
eventsMixin(Vue)
// 初始化生命周期相关的混入方法
// _update/$forceUpdate/$destroy
lifecycleMixin(Vue)
// 混入 render
// $nextTick/_render
// 调用用户传入的render 
renderMixin(Vue)

export default Vue
