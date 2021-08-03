/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

//获取arrayMethods特有的成员，获取新增的push等修补的方法的名字，返回的是数组
const arrayKeys = Object.getOwnPropertyNames(arrayMethods)

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer class that is attached to each observed
 * object. Once attached, the observer converts the target
 * object's property keys into getter/setters that
 * collect dependencies and dispatch updates.
 *附加到每个被观察对象的观察者类
 *对象。一旦附加，观察者就转换目标
 *对象的属性键进入getter/setter
 *收集依赖项并分派更新。
 */
//Observer这个类就是对数组或者对象做响应式处理
export class Observer {
  // 被观测的对象
  value: any;
  // 依赖对象
  dep: Dep;
  // 实例计数器
  vmCount: number; // number of vms that have this object as root $data

  constructor (value: any) {
    this.value = value
    this.dep = new Dep()
    // 初始化实例的 vmCount 为0
    this.vmCount = 0
    // 将实例挂载到观察对象的 __ob__ 属性
    def(value, '__ob__', this) // def就是对object.dfineporpty()做了封装
    // 数组的响应式处理
    if (Array.isArray(value)) {
      //hasProto判断当前浏览器是否支持原型这个属性（用于处理兼容问题）
      //protoAugment，protoAugment其实就是修补会改变数组的方法
      if (hasProto) {
        //value.__proto__ = arrayMethods 。arrayMethods就是数组里面的各种方法。因为修补了之后就变成响应式的方法了
        //当这些方法别调用的时候，会直接调用dep.notify().然后通知watcher。之后由watcher更新视图
        protoAugment(value, arrayMethods)
      } else {
        copyAugment(value, arrayMethods,  arrayKeys)
      }
      // 为数组中的每一个对象创建一个 observer 实例。如果是对象的话给他转换成响应式对象
      this.observeArray(value)
    } else {
      // 遍历对象中的每一个属性，转换成 setter/getter
      this.walk(value)
    }
  }

  /**
   * Walk through all properties and convert them into
   * getter/setters. This method should only be called when
   * value type is Object.
   */
  walk (obj: Object) {
    // 获取观察对象的每一个属性
    const keys = Object.keys(obj)
    // 遍历每一个属性，设置为响应式数据
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  /**
   * Observe a list of Array items.
   */
  //对数组做响应式处理
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * Augment a target Object or Array by intercepting
 * the prototype chain using __proto__
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * Augment a target Object or Array by defining
 * hidden properties.
 */
/* istanbul ignore next */
//将修补过后的方法，重新赋值到原型上去
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key])
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 *尝试为一个值创建一个观察者实例，
 *如果成功观察，返回新的观察者，
 *或现有的观察者(如果值已经有一个)。
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  // 判断 value 是否是对象或者判断是否是虚拟dom的实例
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  // 如果 value 有 __ob__(observer对象) 属性 结束。类似缓存，存在就返回
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve && 
    !isServerRendering() &&
    //isPlainObject是否吃纯粹的对象
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    //是否是vue的实例
    !value._isVue
  ) {
    // 创 建一个 Observer 对象
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}
// 为一个对象定义一个响应式的属性
/**
 * Define a reactive property on an Object.
 * 定义对象上的响应性属性。
 */
export function defineReactive (
  obj: Object, //目标对象
  key: string, //转换的属性
  val: any, //value
  customSetter?: ?Function, //用户自定义的set函数
  shallow?: boolean //监听是否深浅的数据，例如对象的下一层.监听多层或者单层
) {
  // 创建依赖对象实例
  const dep = new Dep()  //收集当前属性（key）的所有依赖
  // 获取 obj 的属性描述符对象
  const property = Object.getOwnPropertyDescriptor(obj, key)
  //property.configurable === false说明不能被删除，不能使用defineProperty方法。所以需要判断一下
  if (property && property.configurable === false) {
    return
  }
  // 提供预定义的存取器函数
  // cater for pre-defined getter/setters
  // 获取用户的get，set。之后重写。给get，set。增加依赖收集，以及派发更新的功能
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }
  // 判断是否递归观察子对象，并将子对象属性都转换成 getter/setter，返回子观察对象
  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      // 如果预定义的 getter 存在则 value 等于getter 调用的返回值
      // 否则直接赋予属性值
      // 判断是否有用户传入的getter，如果有直接调用获取到值
      const value = getter ? getter.call(obj) : val
      // 如果存在当前依赖目标，即 watcher 对象，则建立依赖
      if (Dep.target) {
        //depend()就是进行依赖收集，首先会讲dep对象添加到watcher对象的集合中，并且将watcher对象添加到subs数组中
        dep.depend()
        // 如果子观察目标存在，建立子对象的依赖关系
        if (childOb) {
          //为当前自对象收集依赖。给自己对象添加依赖，当自对象添加或者删除的操作时候我们就可以下方通知
          childOb.dep.depend()
          // 如果属性是数组，则特殊处理收集数组对象依赖
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      // 返回属性值
      return value
    },
    set: function reactiveSetter (newVal) {
      // 如果预定义的 getter 存在则 value 等于getter 调用的返回值
      // 否则直接赋予属性值
      // 判断是否有用户传入的getter，如果有直接调用获取到值
      const value = getter ? getter.call(obj) : val
      // 如果新值等于旧值或者新值旧值为NaN则不执行
      /* eslint-disable no-self-compare */
      //(newVal !== newVal && value !== value)是判断nan的情况
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // 如果没有 setter 直接返回
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      // 如果预定义setter存在则调用，否则直接更新新值
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      // 如果新值是对象，观察子对象并返回 子的 observer 对象
      childOb = !shallow && observe(newVal)
      // 派发更新(发布更改通知)
      dep.notify()
    }
  })
}

/**
 * Set a property on an object. Adds the new property and
 * triggers change notification if the property doesn't
 * already exist.
 */
export function  set (target: Array<any> | Object, key: any, val: any): any {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 判断 target 是否是对象，key 是否是合法的索引。处理数组
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    // 通过 splice 对key位置的元素进行替换
    // splice 在 array.js 进行了响应化的处理
    // splice中会调用ob.中的dep.notify方法，去更新视图
    target.splice(key, 1, val)
    return val
  }
  // 如果 key 在对象中已经存在直接赋值。处理对象
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  // 获取 target 中的 observer 对象
  // __ob__中存储的就是响应式对象
  const ob = (target: any).__ob__
  // 如果 target 是 vue 实例或者 $data 直接返回
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果 ob 不存在，target 不是响应式对象直接赋值
  if (!ob) {
    target[key] = val
    return val
  }
  // 把 key 设置为响应式属性
  defineReactive(ob.value, key, val)
  // 发送通知
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 判断是否是数组，以及 key 是否合法 。这是数组操作
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    // 如果是数组通过 splice 删除
    // splice 做过响应式处理
    // splice中会调用ob.中的dep.notify方法，去更新视图
    target.splice(key, 1)
    return
  }
  // 获取 target 的 ob 对象。这下面代码是对象操作
  const ob = (target: any).__ob__
  // target 如果是 Vue 实例或者 $data 对象，直接返回  
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 如果 target 对象没有 key 属性直接返回 
  // 判断key属性是否是直接属于target，而不继承来的。如果是继承来的直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除属性
  delete target[key]
  // 判断是否有ob对象，是否是响应式的，如果不是直接返回。
  if (!ob) {
    return
  }
  // 通过 ob 发送通知
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    //判断数组中是否有对象，如果有对象的话也需要收集依赖
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
