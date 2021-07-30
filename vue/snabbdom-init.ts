import { Module } from './modules/module'
import { vnode, VNode } from './vnode'
import * as is from './is'
import { htmlDomApi, DOMAPI } from './htmldomapi'

type NonUndefined<T> = T extends undefined ? never : T

function isUndef (s: any): boolean {
  return s === undefined
}
function isDef<A> (s: A): s is NonUndefined<A> {
  return s !== undefined
}

type VNodeQueue = VNode[]

const emptyNode = vnode('', {}, [], undefined, undefined)

function sameVnode (vnode1: VNode, vnode2: VNode): boolean {
  return vnode1.key === vnode2.key && vnode1.sel === vnode2.sel
}

function isVnode (vnode: any): vnode is VNode {
  return vnode.sel !== undefined
}

type KeyToIndexMap = {[key: string]: number}

type ArraysOf<T> = {
  [K in keyof T]: Array<T[K]>;
}

type ModuleHooks = ArraysOf<Required<Module>>

function createKeyToOldIdx (children: VNode[], beginIdx: number, endIdx: number): KeyToIndexMap {
  const map: KeyToIndexMap = {}
  for (let i = beginIdx; i <= endIdx; ++i) {
    const key = children[i]?.key
    if (key !== undefined) {
      map[key] = i
    }
  }
  return map
}

//存储钩子函数的名称。在init里面会被特定的时候执行
const hooks: Array<keyof Module> = ['create', 'update', 'remove', 'destroy', 'pre', 'post'] 

//domApi把dom元素转换成其他平台的元素。没有传递。默认是转换成浏览器下的dom元素。虚拟dom最大的好处就是可以跨平台。就是靠这里的domApi实现的 
export function init (modules: Array<Partial<Module>>, domApi?: DOMAPI) {
  let i: number
  let j: number
  //模块中的钩子函数。将来在合适的时机执行 
  const cbs: ModuleHooks = {
    create: [],
    update: [],
    remove: [],
    destroy: [],
    pre: [],
    post: []
  }
  //先初始化api。和cbs
  const api: DOMAPI = domApi !== undefined ? domApi : htmlDomApi

  for (i = 0; i < hooks.length; ++i) {
    cbs[hooks[i]] = []
    for (j = 0; j < modules.length; ++j) {
      const hook = modules[j][hooks[i]]
      if (hook !== undefined) {
        //数组里面存的就是钩子函数
        //cbs---> { create:[fn1,fn2],update:[fun1,fun2] }
        (cbs[hooks[i]] as any[]).push(hook)
      }
    }
  }

  function emptyNodeAt (elm: Element) {
    const id = elm.id ? '#' + elm.id : ''
    const c = elm.className ? '.' + elm.className.split(' ').join('.') : ''
    return vnode(api.tagName(elm).toLowerCase() + id + c, {}, [], undefined, elm)
  }

  function createRmCb (childElm: Node, listeners: number) {
    //使用返回函数的目的，就是为了吧childElm和listeners进行缓存，在需要的时候使用
    return function rmCb () {
      if (--listeners === 0) { //所有删除钩子函数执行完之后才会真正调用rm删除函数
        const parent = api.parentNode(childElm) as Node
        api.removeChild(parent, childElm)
      }
    }
  }

  function createElm (vnode: VNode, insertedVnodeQueue: VNodeQueue): Node {
    //执行用户设置的init钩子函数
    let i: any
    let data = vnode.data //vnode.data就是h函数的第二个参数。data可以传递真实dom的属性，以及vnode的钩子函数
    if (data !== undefined) {
      const init = data.hook?.init //init是用户传递的。 ?.init  就是判断是否有init，有的话直接返回，没有的话返回undefine
      if (isDef(init)) { //判断init是否有定义
        init(vnode)  //init钩子函数是在创建真实dom之前，让用户对vnode进行修改。例如更改样式等属性
        data = vnode.data //修改后的data，保存在data中
      }
    }
    const children = vnode.children   
    const sel = vnode.sel //sel是选择器
    //把vnode转换成真实的dom对象（没有渲染到页面）
    if (sel === '!') { 
      // 创建注释节点
      if (isUndef(vnode.text)) {
        vnode.text = ''
      }
      // 开始创建注释节点
      vnode.elm = api.createComment(vnode.text!)
    } else if (sel !== undefined) { //创建对应的dom元素
      //选择器不为空
      //解析选择器 
      // Parse selector 
      const hashIdx = sel.indexOf('#')
      const dotIdx = sel.indexOf('.', hashIdx) //id的位置
      const hash = hashIdx > 0 ? hashIdx : sel.length
      const dot = dotIdx > 0 ? dotIdx : sel.length
      const tag = hashIdx !== -1 || dotIdx !== -1 ? sel.slice(0, Math.min(hash, dot)) : sel //解析处标签名
      const elm = vnode.elm = isDef(data) && isDef(i = data.ns) //ns是命名空间的意思
        ? api.createElementNS(i, tag)  //创建dom元素一般是svg
        : api.createElement(tag) 
      if (hash < dot) elm.setAttribute('id', sel.slice(hash + 1, dot)) //判断dom中是否有id，如果有就设置
      if (dotIdx > 0) elm.setAttribute('class', sel.slice(dot + 1).replace(/\./g, ' ')) //判断dom中是否有class，如果有就设置
      for (i = 0; i < cbs.create.length; ++i) cbs.create[i](emptyNode, vnode) //遍历create的钩子函数，分别依次调用
      //如果vnode中有子节点，创建子vnode对应的dom元素并追加到dom 树上. children和text是互斥的
      if (is.array(children)) {
        //如果是children，说明有子节点，所有遍历
        for (i = 0; i < children.length; ++i) {
          const ch = children[i]
          if (ch != null) {
            api.appendChild(elm, createElm(ch as VNode, insertedVnodeQueue)) //将当前的子节点转换为真实的dom.并且追加到elm中。也就是vnode.elm
          }
        }
      } else if (is.primitive(vnode.text)) { //判断text是否是原始值
        api.appendChild(elm, api.createTextNode(vnode.text)) // 创建文本节点追加到elm中
      }
      const hook = vnode.data!.hook //继续获取用户传进来的钩子
      if (isDef(hook)) {
        hook.create?.(emptyNode, vnode)
        if (hook.insert) { 
          insertedVnodeQueue.push(vnode) //将具有insert的钩子函数的vnode。保存起来
        }
      }
    } else { //sel为空的时候，创建文本节点
      vnode.elm = api.createTextNode(vnode.text!)
    }
    //返回创建好的dom 
    return vnode.elm
  }

  function addVnodes (
    parentElm: Node,
    before: Node | null, //参考节点
    vnodes: VNode[], //添加的节点
    startIdx: number, //开始节点
    endIdx: number, //结束节点
    insertedVnodeQueue: VNodeQueue //存储插入的具有inserted的函数的节点
  ) {
    for (; startIdx <= endIdx; ++startIdx) {
      const ch = vnodes[startIdx]
      if (ch != null) {
        api.insertBefore(parentElm, createElm(ch, insertedVnodeQueue), before)
      }
    }
  }

  function  invokeDestroyHook (vnode: VNode) {
    const data = vnode.data
    if (data !== undefined) {
      data?.hook?.destroy?.(vnode)
      for (let i = 0; i < cbs.destroy.length; ++i) cbs.destroy[i](vnode)
      if (vnode.children !== undefined) {
        for (let j = 0; j < vnode.children.length; ++j) {
          const child = vnode.children[j]
          if (child != null && typeof child !== 'string') {
            invokeDestroyHook(child) //递归去触发调用destroy钩子函数，是在删除dom之前执行的
          }
        }
      }
    }
  }

  //parentElm要删除的元素所在的父元素
  //vnodes 这个数组，存储的就是要删除的元素对应的vnode
  //startIdx和endIdx：是要删除节点的开始和结束位置。如果是一个元素，开始和结束位置就是0
  function removeVnodes (parentElm: Node,
    vnodes: VNode[],
    startIdx: number,
    endIdx: number): void {
    for (; startIdx <= endIdx; ++startIdx) {
      let listeners: number
      let rm: () => void
      const ch = vnodes[startIdx]
      if (ch != null) {
        if (isDef(ch.sel)) { //如果有sel就是元素节点
          invokeDestroyHook(ch) //触发destroy的钩子函数
          listeners = cbs.remove.length + 1 //获取cbs内部remove钩子函数的个数+1，listeners作用就是防止重复删除dom元素
          rm = createRmCb(ch.elm!, listeners) //createRmCb 内部返回真正删除dom函数 。ch.elm!要删除的元素
          for (let i = 0; i < cbs.remove.length; ++i) cbs.remove[i](ch, rm) //触发钩子函数。删除dom元素
          const removeHook = ch?.data?.hook?.remove //获取用户传入的函数
          if (isDef(removeHook)) {
            removeHook(ch, rm) //如果用户传入remove函数，需要用户手动调用rm删除 函数，
          } else {
            rm() //如果没有传入，自动调用rm()删除函数。所有要判断当前删除钩子函数是否都执行完了。先判断钩子函数内容，最后在执行真正的rm()函数。否则会造成同一个元素会被多次删除的问题
          }
        } else { // Text node 文本节点
          api.removeChild(parentElm, ch.elm!) //删除vnode对应的节点
        }
      }
    }
  }

  function updateChildren (parentElm: Node,
    oldCh: VNode[],
    newCh: VNode[],
    insertedVnodeQueue: VNodeQueue) {
    let oldStartIdx = 0
    let newStartIdx = 0
    let oldEndIdx = oldCh.length - 1
    let oldStartVnode = oldCh[0]
    let oldEndVnode = oldCh[oldEndIdx]
    let newEndIdx = newCh.length - 1
    let newStartVnode = newCh[0]
    let newEndVnode = newCh[newEndIdx]
    let oldKeyToIdx: KeyToIndexMap | undefined
    let idxInOld: number
    let elmToMove: VNode
    let before: any

    while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
      if (oldStartVnode == null) {
        oldStartVnode = oldCh[++oldStartIdx] // Vnode might have been moved left
      } else if (oldEndVnode == null) {
        oldEndVnode = oldCh[--oldEndIdx]
      } else if (newStartVnode == null) {
        newStartVnode = newCh[++newStartIdx]
      } else if (newEndVnode == null) {
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newStartVnode)) {
        patchVnode(oldStartVnode, newStartVnode, insertedVnodeQueue)
        oldStartVnode = oldCh[++oldStartIdx]
        newStartVnode = newCh[++newStartIdx]
      } else if (sameVnode(oldEndVnode, newEndVnode)) {
        patchVnode(oldEndVnode, newEndVnode, insertedVnodeQueue)
        oldEndVnode = oldCh[--oldEndIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldStartVnode, newEndVnode)) { // Vnode moved right
        patchVnode(oldStartVnode, newEndVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldStartVnode.elm!, api.nextSibling(oldEndVnode.elm!))
        oldStartVnode = oldCh[++oldStartIdx]
        newEndVnode = newCh[--newEndIdx]
      } else if (sameVnode(oldEndVnode, newStartVnode)) { // Vnode moved left
        patchVnode(oldEndVnode, newStartVnode, insertedVnodeQueue)
        api.insertBefore(parentElm, oldEndVnode.elm!, oldStartVnode.elm!)
        oldEndVnode = oldCh[--oldEndIdx]
        newStartVnode = newCh[++newStartIdx]
      } else {
        if (oldKeyToIdx === undefined) {
          oldKeyToIdx = createKeyToOldIdx(oldCh, oldStartIdx, oldEndIdx)
        }
        idxInOld = oldKeyToIdx[newStartVnode.key as string]
        if (isUndef(idxInOld)) { // New element
          api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
        } else {
          elmToMove = oldCh[idxInOld]
          if (elmToMove.sel !== newStartVnode.sel) {
            api.insertBefore(parentElm, createElm(newStartVnode, insertedVnodeQueue), oldStartVnode.elm!)
          } else {
            patchVnode(elmToMove, newStartVnode, insertedVnodeQueue)
            oldCh[idxInOld] = undefined as any
            api.insertBefore(parentElm, elmToMove.elm!, oldStartVnode.elm!)
          }
        }
        newStartVnode = newCh[++newStartIdx]
      }
    }
    if (oldStartIdx <= oldEndIdx || newStartIdx <= newEndIdx) {
      if (oldStartIdx > oldEndIdx) {
        before = newCh[newEndIdx + 1] == null ? null : newCh[newEndIdx + 1].elm
        addVnodes(parentElm, before, newCh, newStartIdx, newEndIdx, insertedVnodeQueue)
      } else {
        removeVnodes(parentElm, oldCh, oldStartIdx, oldEndIdx)
      }
    }
  }

  function patchVnode (oldVnode: VNode, vnode: VNode, insertedVnodeQueue: VNodeQueue) {
    const hook = vnode.data?.hook
    hook?.prepatch?.(oldVnode, vnode)
    const elm = vnode.elm = oldVnode.elm!
    const oldCh = oldVnode.children as VNode[]
    const ch = vnode.children as VNode[]
    if (oldVnode === vnode) return
    if (vnode.data !== undefined) {
      for (let i = 0; i < cbs.update.length; ++i) cbs.update[i](oldVnode, vnode)
      vnode.data.hook?.update?.(oldVnode, vnode)
    }
    if (isUndef(vnode.text)) {
      if (isDef(oldCh) && isDef(ch)) {
        if (oldCh !== ch) updateChildren(elm, oldCh, ch, insertedVnodeQueue)
      } else if (isDef(ch)) {
        if (isDef(oldVnode.text)) api.setTextContent(elm, '')
        addVnodes(elm, null, ch, 0, ch.length - 1, insertedVnodeQueue)
      } else if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      } else if (isDef(oldVnode.text)) {
        api.setTextContent(elm, '')
      }
    } else if (oldVnode.text !== vnode.text) {
      if (isDef(oldCh)) {
        removeVnodes(elm, oldCh, 0, oldCh.length - 1)
      }
      api.setTextContent(elm, vnode.text!)
    }
    hook?.postpatch?.(oldVnode, vnode)
  }

  //返回一个函数。本来应该传递4个参数，因为调用了init传入了modules和domApi。所有现在只需要传递2个oldVnode和vnode就可以了
  return function patch (oldVnode: VNode | Element, vnode: VNode): VNode {
    let i: number, elm: Node, parent: Node
    const insertedVnodeQueue: VNodeQueue = [] //新插入节点的队列
    for (i = 0; i < cbs.pre.length; ++i) cbs.pre[i]() //触发钩子函数cbs里面的函数

    if (!isVnode(oldVnode)) { //判断是否是vnode对象  vnode.sel 判断是否有sel属性
      oldVnode = emptyNodeAt(oldVnode) //通过emptyNodeAt把dom对象转换为vnode对象 
    }

    if (sameVnode(oldVnode, vnode)) { //判断新旧vnode是否是相同节点 就是判断vnode的key,和sel是否相等
      patchVnode(oldVnode, vnode, insertedVnodeQueue) //如果节点相同，来对比内容是否相同
    } else { //创建新的对应的dom 元素，并将创建的dom对象插入到dom树上。将老节点移除
      elm = oldVnode.elm! //!是typescript,是标识一定有值的
      parent = api.parentNode(elm) as Node //获取elm的父元素。通过node.parentNode来获取

      createElm(vnode, insertedVnodeQueue) // 创建vnpode对应的dom元素，并且把新插入vnode的队列作为参数，传入到createElm。同时函数内部触发对应的钩子函数

      if (parent !== null) { 
        api.insertBefore(parent, vnode.elm!, api.nextSibling(elm)) //往父元素插入对应的元素  vnode.elm!新的vnode对应的dom元素 api.nextSibling(elm)获取老的vnode下一个兄弟节点  elm是老的对应的vnode节点
        // api.nextSibling(elm) 其实就是将新的节点插入到老的节点之后
        removeVnodes(parent, [oldVnode], 0, 0) //将老节点移除
      }
    }

    for (i = 0; i < insertedVnodeQueue.length; ++i) { //具有inserted钩子函数新的vonde节点，队列里面的函数是在createElm添加的
      insertedVnodeQueue[i].data!.hook!.insert!(insertedVnodeQueue[i]) //触发insert里面的钩子函数（用户传过来的） !是否有值，如果有执行后面，没有的话不执行
    }
    for (i = 0; i < cbs.post.length; ++i) cbs.post[i]() // 触发模块中的post钩子函数。返回一个老的节点
    return vnode
  }
}
 